const razorpayService = require('./razorpay.service');

class RazorpayController {

  async createOrder(req, res) {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles && req.user.roles.includes('ADMIN');

    const result = await razorpayService.createOrder(bookingId, userId, isAdmin);
    res.json({
      success: true,
      data: result,
    });
  }

  async verifyPayment(req, res) {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const result = await razorpayService.verifyPayment(
      bookingId,
      userId,
      { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    );
    res.json({
      success: true,
      message: result.already_processed
        ? 'Payment was already verified.'
        : 'Payment verified successfully.',
      data: result,
    });
  }

  async processRefund(req, res) {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.roles && req.user.roles.includes('ADMIN');

    const result = await razorpayService.processRefund(bookingId, userId, isAdmin);
    res.json({
      success: true,
      message: result.already_processed
        ? 'Refund was already processed.'
        : 'Refund processed successfully.',
      data: result,
    });
  }

  /**
   * Webhook handler.
   * Must NOT use JWT authentication — Razorpay calls this server-to-server.
   * Signature verification is done against the raw request body.
   * The raw body is attached to req as req.rawBody by the webhook middleware.
   */
  async handleWebhook(req, res) {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature header' });
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      return res.status(400).json({ success: false, message: 'Missing raw body' });
    }

    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }

    const event = payload.event;

    try {
      await razorpayService.processWebhookEvent(event, payload);
    } catch (err) {
      // Log the error but still return 200 to Razorpay to prevent retries
      // for non-retriable application-level errors
      console.error('Webhook processing error:', err.message);
    }

    // Always return 2xx to acknowledge receipt
    res.json({ success: true, received: true });
  }
}

module.exports = new RazorpayController();
