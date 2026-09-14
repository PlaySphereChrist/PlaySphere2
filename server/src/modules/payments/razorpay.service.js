const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool, query } = require('../../config/database');
const env = require('../../config/env');

// ---------------------------------------------------------------------------
// Lazily initialise the Razorpay instance — only fails at call time when
// credentials are absent, not at module load time (so the server still boots
// in environments where Razorpay is not yet configured).
// ---------------------------------------------------------------------------
let _razorpay = null;

function getRazorpay() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    const err = new Error(
      'Razorpay credentials are not configured. ' +
      'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env'
    );
    err.statusCode = 503;
    throw err;
  }
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

class RazorpayPaymentService {

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  _notFound(msg) { const e = new Error(msg); e.statusCode = 404; return e; }
  _badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
  _conflict(msg) { const e = new Error(msg); e.statusCode = 409; return e; }
  _forbidden(msg) { const e = new Error(msg); e.statusCode = 403; return e; }

  /**
   * Load the payment record for an entity, enforcing ownership.
   */
  async _loadPayment(entityId, entityType, userId, isAdmin = false) {
    let queryStr = '';

    if (entityType === 'ground_booking') {
      queryStr = `
        SELECT p.id, p.amount, p.currency, p.status, p.payment_type,
               p.razorpay_order_id, p.razorpay_payment_id,
               gb.booked_by_user_id AS owner_user_id, gb.status AS entity_status
        FROM payments p
        JOIN ground_bookings gb ON gb.id = p.entity_id
        WHERE p.entity_id = $1
          AND p.entity_type = 'ground_booking'
          AND p.payment_type = 'advance'
        ORDER BY p.created_at DESC
        LIMIT 1
      `;
    } else if (entityType === 'tournament_registration') {
      queryStr = `
        SELECT p.id, p.amount, p.currency, p.status, p.payment_type,
               p.razorpay_order_id, p.razorpay_payment_id,
               tr.registered_by_user_id AS owner_user_id, tr.status AS entity_status
        FROM payments p
        JOIN tournament_registrations tr ON tr.id = p.entity_id
        WHERE p.entity_id = $1
          AND p.entity_type = 'tournament_registration'
          AND p.payment_type = 'full'
        ORDER BY p.created_at DESC
        LIMIT 1
      `;
    } else {
      throw this._badRequest('Invalid entity type');
    }

    const { rows } = await query(queryStr, [entityId]);

    if (rows.length === 0) throw this._notFound('Payment record not found for this entity');

    const payment = rows[0];

    if (!isAdmin && payment.owner_user_id !== userId) {
      throw this._notFound('Entity not found');
    }

    return payment;
  }

  // ===========================================================================
  // CREATE RAZORPAY ORDER
  // ===========================================================================

  /**
   * POST /api/ground-bookings/:bookingId/payment/order
   * POST /api/tournaments/:tournamentId/registrations/:registrationId/payment/order
   *
   * Creates a Razorpay Order for the payment.
   * Amount comes exclusively from the server-side payment record.
   * Client cannot supply or override the amount.
   */
  async createOrder(entityId, entityType, userId, isAdmin = false) {
    const rzp = getRazorpay();

    const payment = await this._loadPayment(entityId, entityType, userId, isAdmin);

    // Only allow creating a new order for non-terminal payment statuses
    const terminalStatuses = ['captured', 'refunded', 'partially_refunded'];
    if (terminalStatuses.includes(payment.status)) {
      throw this._conflict('This entity has already been paid');
    }
    if (payment.entity_status === 'cancelled' || payment.entity_status === 'withdrawn' || payment.entity_status === 'rejected') {
      throw this._badRequest('Cannot initiate payment for a cancelled or rejected entity');
    }

    // If an order already exists and payment is still pending/created,
    // reuse the existing order (idempotent) rather than creating a duplicate
    if (payment.razorpay_order_id && ['created', 'pending', 'authorized'].includes(payment.status)) {
      return {
        key_id: env.RAZORPAY_KEY_ID,
        order_id: payment.razorpay_order_id,
        // Razorpay amounts are in paise (smallest unit); amount in DB is in INR
        amount: Math.round(parseFloat(payment.amount) * 100),
        currency: payment.currency,
        payment_id: payment.id,
      };
    }

    // Amount must be an integer in paise
    const amountPaise = Math.round(parseFloat(payment.amount) * 100);
    if (amountPaise <= 0) throw this._badRequest('Invalid payment amount');

    // Create the order on Razorpay
    let order;
    try {
      order = await rzp.orders.create({
        amount: amountPaise,
        currency: payment.currency || 'INR',
        receipt: `receipt_${entityId.slice(0, 16)}`,
        notes: {
          entity_id: entityId,
          entity_type: entityType,
          payment_id: payment.id,
        },
      });
    } catch (rzpErr) {
      // Normalize Razorpay SDK error (which is a plain object) into a standard Error
      const msg = rzpErr.error?.description || rzpErr.message || 'Razorpay order creation failed';
      const err = new Error(msg);
      // Map Razorpay's 401 auth failure to a 502/503 for the client, so we don't confuse our user auth
      err.statusCode = rzpErr.statusCode === 401 ? 502 : (rzpErr.statusCode || 500);
      throw err;
    }

    // Persist the Razorpay order ID to the payment record
    await query(
      `UPDATE payments SET razorpay_order_id = $1, status = 'pending'
       WHERE id = $2`,
      [order.id, payment.id]
    );

    return {
      key_id: env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: amountPaise,
      currency: order.currency,
      payment_id: payment.id,
    };
  }

  // ===========================================================================
  // VERIFY PAYMENT
  // ===========================================================================

  /**
   * POST /api/ground-bookings/:bookingId/payment/verify
   * POST /api/tournaments/:tournamentId/registrations/:registrationId/payment/verify
   *
   * Verifies a Razorpay Checkout response. All values must come from the
   * Checkout handler; any mismatch or invalid signature rejects the request.
   */
  async verifyPayment(entityId, entityType, userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw this._badRequest('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
    }

    const payment = await this._loadPayment(entityId, entityType, userId);

    if (!env.RAZORPAY_KEY_SECRET) {
      const err = new Error('Razorpay secret not configured');
      err.statusCode = 503;
      throw err;
    }

    // Idempotency: if already captured with this payment ID, return success
    if (payment.status === 'captured' && payment.razorpay_payment_id === razorpay_payment_id) {
      return { verified: true, already_processed: true };
    }

    if (['captured', 'refunded', 'partially_refunded'].includes(payment.status)) {
      throw this._conflict('This payment has already been processed');
    }

    if (payment.entity_status === 'cancelled' || payment.entity_status === 'withdrawn') {
      throw this._badRequest('Cannot verify payment for a cancelled entity');
    }

    // Ensure the submitted order ID matches what we stored server-side
    if (!payment.razorpay_order_id) {
      throw this._badRequest('No Razorpay order exists for this entity. Create an order first.');
    }
    if (payment.razorpay_order_id !== razorpay_order_id) {
      const err = new Error('Order ID mismatch — payment verification rejected');
      err.statusCode = 400;
      throw err;
    }

    // HMAC-SHA256 signature verification (Razorpay specification)
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(razorpay_signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    let signaturesMatch = false;
    if (sigBuffer.length === expectedBuffer.length) {
      signaturesMatch = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    }

    if (!signaturesMatch) {
      // Mark payment as failed on invalid signature
      await query(
        `UPDATE payments SET status = 'failed' WHERE id = $1`,
        [payment.id]
      );
      const err = new Error('Payment signature verification failed');
      err.statusCode = 400;
      throw err;
    }

    // Signature is valid — update payment and booking inside a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update payment record
      await client.query(
        `UPDATE payments
         SET status = 'captured',
             razorpay_payment_id = $1,
             razorpay_signature = $2,
             paid_at = NOW()
         WHERE id = $3`,
        [razorpay_payment_id, razorpay_signature, payment.id]
      );

      // Update appropriate entity
      if (entityType === 'ground_booking') {
        await client.query(
          `UPDATE ground_bookings
           SET status = 'confirmed', advance_paid_at = NOW()
           WHERE id = $1 AND status IN ('pending', 'confirmed')`,
          [entityId]
        );
      } else if (entityType === 'tournament_registration') {
        await client.query(
          `UPDATE tournament_registrations
           SET status = 'approved'
           WHERE id = $1 AND status = 'pending'`,
          [entityId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { verified: true, already_processed: false };
  }

  // ===========================================================================
  // PROCESS REFUND
  // ===========================================================================

  /**
   * POST /api/ground-bookings/:bookingId/payment/refund
   *
   * Processes a Razorpay refund for an eligible cancellation.
   * Only runs when:
   *  - booking is cancelled
   *  - payment is captured
   *  - a pending refund record already exists (created by cancelBooking)
   *  - refund has not already been processed
   */
  async processRefund(bookingId, userId, isAdmin = false) {
    const rzp = getRazorpay();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Load and lock the payment
      const paymentRes = await client.query(
        `SELECT p.id, p.amount, p.razorpay_payment_id, p.status as payment_status,
                gb.booked_by_user_id, gb.status as booking_status
         FROM payments p
         JOIN ground_bookings gb ON gb.id = p.entity_id
         WHERE p.entity_id = $1
           AND p.entity_type = 'ground_booking'
           AND p.payment_type = 'advance'
         ORDER BY p.created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [bookingId]
      );

      if (paymentRes.rows.length === 0) {
        throw this._notFound('Payment record not found');
      }

      const payment = paymentRes.rows[0];

      if (!isAdmin && payment.booked_by_user_id !== userId) {
        throw this._notFound('Booking not found');
      }

      if (payment.booking_status !== 'cancelled') {
        throw this._badRequest('Refund is only available for cancelled bookings');
      }

      if (payment.payment_status !== 'captured') {
        throw this._badRequest('Cannot refund a payment that was never captured');
      }

      if (!payment.razorpay_payment_id) {
        throw this._badRequest('No Razorpay payment ID on record — cannot process refund');
      }

      // Load and lock the pending refund record
      const refundRes = await client.query(
        `SELECT id, amount, status, razorpay_refund_id
         FROM refunds
         WHERE payment_id = $1
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [payment.id]
      );

      if (refundRes.rows.length === 0) {
        throw this._notFound('No refund record found. Booking may not qualify for refund.');
      }

      const refundRecord = refundRes.rows[0];

      // Idempotency: already processed
      if (refundRecord.status === 'processed') {
        await client.query('ROLLBACK');
        return { refunded: true, already_processed: true, razorpay_refund_id: refundRecord.razorpay_refund_id };
      }

      if (refundRecord.status === 'failed') {
        throw this._badRequest('The refund for this booking previously failed. Contact support.');
      }

      // Refund amount from the DB record — never from client
      const refundAmountPaise = Math.round(parseFloat(refundRecord.amount) * 100);

      // Call Razorpay refund API (server-side only)
      let rzpRefund;
      try {
        rzpRefund = await rzp.payments.refund(payment.razorpay_payment_id, {
          amount: refundAmountPaise,
          notes: {
            booking_id: bookingId,
            refund_record_id: refundRecord.id,
          },
        });
      } catch (rzpErr) {
        // Razorpay API failure — mark refund as failed, do not falsely succeed
        await client.query(
          `UPDATE refunds SET status = 'failed' WHERE id = $1`,
          [refundRecord.id]
        );
        await client.query('COMMIT');
        const err = new Error(`Razorpay refund failed: ${rzpErr.error?.description || rzpErr.message}`);
        err.statusCode = 502;
        throw err;
      }

      // Update refund record with Razorpay reference
      await client.query(
        `UPDATE refunds
         SET status = 'processed',
             razorpay_refund_id = $1,
             processed_at = NOW()
         WHERE id = $2`,
        [rzpRefund.id, refundRecord.id]
      );

      // Update payment status to refunded
      await client.query(
        `UPDATE payments SET status = 'refunded' WHERE id = $1`,
        [payment.id]
      );

      await client.query('COMMIT');

      return {
        refunded: true,
        already_processed: false,
        razorpay_refund_id: rzpRefund.id,
        amount: refundRecord.amount,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ===========================================================================
  // WEBHOOK PROCESSING
  // ===========================================================================

  /**
   * Verifies webhook signature using raw body (as Razorpay requires).
   * Must be called before body is parsed.
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      // Webhook secret not configured — skip webhook verification
      return false;
    }

    const expectedSig = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    try {
      const sigBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSig, 'hex');
      if (sigBuffer.length !== expectedBuffer.length) return false;
      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Process an incoming webhook event idempotently.
   * Supported events: payment.captured, payment.authorized, payment.failed, order.paid
   */
  async processWebhookEvent(event, payload) {
    const eventName = event;

    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const dataPayload = payload?.payload || {};
      const paymentEntity = dataPayload?.payment?.entity || dataPayload?.order?.entity;
      if (!paymentEntity) return;

      const rzpPaymentId = paymentEntity.id;
      const rzpOrderId = paymentEntity.order_id;
      if (!rzpOrderId) return;

      // Find our payment record by razorpay_order_id
      const { rows } = await query(
        `SELECT id, entity_id, entity_type, status FROM payments WHERE razorpay_order_id = $1`,
        [rzpOrderId]
      );

      if (rows.length === 0) return; // Not our order — ignore safely

      const payment = rows[0];

      // Idempotent: already captured
      if (payment.status === 'captured') return;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE payments
           SET status = 'captured',
               razorpay_payment_id = COALESCE(razorpay_payment_id, $1),
               paid_at = COALESCE(paid_at, NOW())
           WHERE id = $2 AND status NOT IN ('captured', 'refunded', 'partially_refunded')`,
          [rzpPaymentId, payment.id]
        );

        if (payment.entity_type === 'ground_booking') {
          // Confirm the booking
          await client.query(
            `UPDATE ground_bookings
             SET status = 'confirmed',
                 advance_paid_at = COALESCE(advance_paid_at, NOW())
             WHERE id = $1 AND status IN ('pending')`,
            [payment.entity_id]
          );
        } else if (payment.entity_type === 'tournament_registration') {
          await client.query(
            `UPDATE tournament_registrations
             SET status = 'approved'
             WHERE id = $1 AND status = 'pending'`,
            [payment.entity_id]
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

    } else if (eventName === 'payment.failed') {
      const dataPayload = payload?.payload || {};
      const paymentEntity = dataPayload?.payment?.entity;
      if (!paymentEntity?.order_id) return;

      const { rows } = await query(
        `SELECT id, status FROM payments WHERE razorpay_order_id = $1`,
        [paymentEntity.order_id]
      );
      if (rows.length === 0) return;

      const payment = rows[0];
      // Only mark failed if not already in a terminal success state
      if (['captured', 'refunded', 'partially_refunded'].includes(payment.status)) return;

      await query(
        `UPDATE payments SET status = 'failed' WHERE id = $1`,
        [payment.id]
      );

    } else if (eventName === 'payment.authorized') {
      const paymentEntity = payload?.payment?.entity;
      if (!paymentEntity?.order_id) return;

      const { rows } = await query(
        `SELECT id, status FROM payments WHERE razorpay_order_id = $1`,
        [paymentEntity.order_id]
      );
      if (rows.length === 0) return;
      const payment = rows[0];

      if (['captured', 'refunded', 'partially_refunded'].includes(payment.status)) return;

      await query(
        `UPDATE payments
         SET status = 'authorized',
             razorpay_payment_id = COALESCE(razorpay_payment_id, $1)
         WHERE id = $2 AND status NOT IN ('captured', 'refunded', 'partially_refunded')`,
        [paymentEntity.id, payment.id]
      );
    }
    // All other events are silently acknowledged (200 returned to Razorpay)
  }
}

module.exports = new RazorpayPaymentService();
