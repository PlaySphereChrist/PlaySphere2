const { pool, query } = require('../../config/database');

class GroundsService {

  // ===========================================================================
  // HELPER
  // ===========================================================================

  _notFound(msg) {
    const err = new Error(msg);
    err.statusCode = 404;
    return err;
  }

  _forbidden(msg) {
    const err = new Error(msg);
    err.statusCode = 403;
    return err;
  }

  _conflict(msg) {
    const err = new Error(msg);
    err.statusCode = 409;
    return err;
  }

  _badRequest(msg) {
    const err = new Error(msg);
    err.statusCode = 400;
    return err;
  }

  // ===========================================================================
  // ADMIN — GROUNDS CRUD
  // ===========================================================================

  /**
   * List all grounds (admin sees all; public sees only active).
   */
  async listGrounds({ activeOnly = true, sport_id } = {}) {
    const params = [];
    const conditions = [];

    if (activeOnly) {
      conditions.push(`g.is_active = true`);
    }

    let sql = `
      SELECT g.id, g.name, g.description, g.address, g.city, g.state,
             g.latitude, g.longitude, g.contact_phone, g.contact_email,
             g.amenities, g.images, g.is_active, g.created_at,
             COALESCE(
               json_agg(DISTINCT jsonb_build_object(
                 'id', s.id, 'name', s.name, 'slug', s.slug,
                 'surface_type', gs.surface_type, 'capacity', gs.capacity
               )) FILTER (WHERE s.id IS NOT NULL),
               '[]'
             ) AS sports
      FROM grounds g
      LEFT JOIN ground_sports gs ON gs.ground_id = g.id
      LEFT JOIN sports s ON s.id = gs.sport_id
    `;

    if (sport_id) {
      // Filter to grounds that support the given sport
      conditions.push(`g.id IN (SELECT ground_id FROM ground_sports WHERE sport_id = $${params.length + 1})`);
      params.push(sport_id);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` GROUP BY g.id ORDER BY g.name ASC`;

    const { rows } = await query(sql, params);
    return rows;
  }

  async getGroundById(groundId) {
    const { rows } = await query(
      `SELECT g.id, g.name, g.description, g.address, g.city, g.state,
              g.latitude, g.longitude, g.contact_phone, g.contact_email,
              g.amenities, g.images, g.is_active, g.created_at,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object(
                  'id', s.id, 'name', s.name, 'slug', s.slug,
                  'surface_type', gs.surface_type, 'capacity', gs.capacity
                )) FILTER (WHERE s.id IS NOT NULL),
                '[]'
              ) AS sports
       FROM grounds g
       LEFT JOIN ground_sports gs ON gs.ground_id = g.id
       LEFT JOIN sports s ON s.id = gs.sport_id
       WHERE g.id = $1
       GROUP BY g.id`,
      [groundId]
    );
    return rows[0] || null;
  }

  async createGround(adminUserId, data) {
    const {
      name, description, address, city, state,
      latitude, longitude, contact_phone, contact_email,
      amenities, images
    } = data;

    if (!name || !address || !city) {
      throw this._badRequest('name, address, and city are required');
    }

    const { rows } = await query(
      `INSERT INTO grounds
         (name, description, address, city, state, latitude, longitude,
          contact_phone, contact_email, amenities, images, owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, name, description, address, city, state, latitude, longitude,
                 contact_phone, contact_email, amenities, images, is_active, created_at`,
      [
        name,
        description || null,
        address,
        city,
        state || null,
        latitude ?? null,
        longitude ?? null,
        contact_phone || null,
        contact_email || null,
        amenities ? JSON.stringify(amenities) : null,
        images ? JSON.stringify(images) : null,
        adminUserId
      ]
    );
    return rows[0];
  }

  async updateGround(groundId, data) {
    const ground = await this.getGroundById(groundId);
    if (!ground) throw this._notFound('Ground not found');

    const allowed = ['name', 'description', 'address', 'city', 'state',
                     'latitude', 'longitude', 'contact_phone', 'contact_email',
                     'amenities', 'images', 'is_active'];

    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        if (['amenities', 'images'].includes(key) && data[key] !== null) {
          values.push(JSON.stringify(data[key]));
        } else {
          values.push(data[key]);
        }
      }
    }

    if (updates.length === 0) return ground;

    values.push(groundId);
    const { rows } = await query(
      `UPDATE grounds SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, description, address, city, state, latitude, longitude,
                 contact_phone, contact_email, amenities, images, is_active, updated_at`,
      values
    );
    return rows[0];
  }

  // ===========================================================================
  // ADMIN — GROUND SPORTS
  // ===========================================================================

  async addGroundSport(groundId, sportId, surface_type, capacity) {
    const ground = await this.getGroundById(groundId);
    if (!ground) throw this._notFound('Ground not found');

    const sportCheck = await query('SELECT id FROM sports WHERE id = $1 AND is_active = true', [sportId]);
    if (sportCheck.rows.length === 0) throw this._notFound('Sport not found or inactive');

    try {
      const { rows } = await query(
        `INSERT INTO ground_sports (ground_id, sport_id, surface_type, capacity)
         VALUES ($1, $2, $3, $4)
         RETURNING id, ground_id, sport_id, surface_type, capacity, created_at`,
        [groundId, sportId, surface_type || null, capacity || null]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') throw this._conflict('This sport is already associated with the ground');
      throw err;
    }
  }

  async removeGroundSport(groundId, sportId) {
    const { rowCount } = await query(
      `DELETE FROM ground_sports WHERE ground_id = $1 AND sport_id = $2`,
      [groundId, sportId]
    );
    if (rowCount === 0) throw this._notFound('Ground-sport association not found');
  }

  // ===========================================================================
  // ADMIN — AVAILABILITY
  // ===========================================================================

  async listAvailability(groundId) {
    const { rows } = await query(
      `SELECT ga.id, ga.ground_id, ga.sport_id, s.name as sport_name,
              ga.day_of_week, ga.start_time, ga.end_time,
              ga.slot_duration_minutes, ga.price_per_slot, ga.is_active, ga.created_at
       FROM ground_availability ga
       LEFT JOIN sports s ON ga.sport_id = s.id
       WHERE ga.ground_id = $1
       ORDER BY ga.day_of_week, ga.start_time`,
      [groundId]
    );
    return rows;
  }

  async createAvailability(groundId, data) {
    const { sport_id, day_of_week, start_time, end_time, slot_duration_minutes, price_per_slot } = data;

    if (day_of_week === undefined || start_time === undefined ||
        end_time === undefined || price_per_slot === undefined) {
      throw this._badRequest('day_of_week, start_time, end_time, and price_per_slot are required');
    }

    const ground = await this.getGroundById(groundId);
    if (!ground) throw this._notFound('Ground not found');

    const { rows } = await query(
      `INSERT INTO ground_availability
         (ground_id, sport_id, day_of_week, start_time, end_time, slot_duration_minutes, price_per_slot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, ground_id, sport_id, day_of_week, start_time, end_time,
                 slot_duration_minutes, price_per_slot, is_active, created_at`,
      [groundId, sport_id || null, day_of_week, start_time, end_time,
       slot_duration_minutes || 60, price_per_slot]
    );
    return rows[0];
  }

  async updateAvailability(availId, data) {
    const allowed = ['day_of_week', 'start_time', 'end_time', 'slot_duration_minutes',
                     'price_per_slot', 'is_active', 'sport_id'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (updates.length === 0) {
      const { rows } = await query('SELECT * FROM ground_availability WHERE id = $1', [availId]);
      return rows[0] || null;
    }

    values.push(availId);
    const { rows } = await query(
      `UPDATE ground_availability SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, ground_id, sport_id, day_of_week, start_time, end_time,
                 slot_duration_minutes, price_per_slot, is_active, updated_at`,
      values
    );
    if (rows.length === 0) throw this._notFound('Availability record not found');
    return rows[0];
  }

  async deleteAvailability(availId) {
    const { rowCount } = await query(
      'DELETE FROM ground_availability WHERE id = $1',
      [availId]
    );
    if (rowCount === 0) throw this._notFound('Availability record not found');
  }

  // ===========================================================================
  // ADMIN — BOOKING SLOTS
  // ===========================================================================

  async listSlots(groundId, { date, sport_id, available_only = false } = {}) {
    const params = [groundId];
    const conditions = ['gbs.ground_id = $1'];
    let idx = 2;

    if (date) {
      conditions.push(`gbs.slot_date = $${idx++}`);
      params.push(date);
    }
    if (sport_id) {
      conditions.push(`gbs.sport_id = $${idx++}`);
      params.push(sport_id);
    }
    if (available_only) {
      conditions.push(`gbs.is_available = true`);
    }

    const { rows } = await query(
      `SELECT gbs.id, gbs.ground_id, gbs.sport_id, s.name as sport_name,
              gbs.slot_date, gbs.start_time, gbs.end_time, gbs.price, gbs.is_available, gbs.created_at
       FROM ground_booking_slots gbs
       LEFT JOIN sports s ON gbs.sport_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY gbs.slot_date, gbs.start_time`,
      params
    );
    return rows;
  }

  async createSlot(groundId, data) {
    const { sport_id, slot_date, start_time, end_time, price } = data;

    if (!slot_date || !start_time || !end_time || price === undefined) {
      throw this._badRequest('slot_date, start_time, end_time, and price are required');
    }

    const ground = await this.getGroundById(groundId);
    if (!ground) throw this._notFound('Ground not found');

    try {
      const { rows } = await query(
        `INSERT INTO ground_booking_slots (ground_id, sport_id, slot_date, start_time, end_time, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, ground_id, sport_id, slot_date, start_time, end_time, price, is_available, created_at`,
        [groundId, sport_id || null, slot_date, start_time, end_time, price]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') throw this._conflict('A slot already exists for this ground/date/time range');
      throw err;
    }
  }

  async updateSlot(slotId, data) {
    const allowed = ['slot_date', 'start_time', 'end_time', 'price', 'is_available', 'sport_id'];
    const updates = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (updates.length === 0) {
      const { rows } = await query('SELECT * FROM ground_booking_slots WHERE id = $1', [slotId]);
      return rows[0] || null;
    }

    values.push(slotId);
    const { rows } = await query(
      `UPDATE ground_booking_slots SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, ground_id, sport_id, slot_date, start_time, end_time, price, is_available`,
      values
    );
    if (rows.length === 0) throw this._notFound('Booking slot not found');
    return rows[0];
  }

  async deleteSlot(slotId) {
    // Only allow deletion if slot is not already booked
    const bookingCheck = await query(
      `SELECT id FROM ground_bookings WHERE slot_id = $1 AND status NOT IN ('cancelled')`,
      [slotId]
    );
    if (bookingCheck.rows.length > 0) {
      throw this._conflict('Cannot delete a slot that has active bookings');
    }

    const { rowCount } = await query('DELETE FROM ground_booking_slots WHERE id = $1', [slotId]);
    if (rowCount === 0) throw this._notFound('Booking slot not found');
  }

  // ===========================================================================
  // USER — BOOKING
  // ===========================================================================

  async createBooking(userId, groundId, data) {
    const { slot_id, team_id, notes } = data;

    if (!slot_id) throw this._badRequest('slot_id is required');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock the slot row to prevent race conditions
      const slotRes = await client.query(
        `SELECT gbs.id, gbs.ground_id, gbs.slot_date, gbs.start_time, gbs.end_time,
                gbs.price, gbs.is_available, g.is_active as ground_active
         FROM ground_booking_slots gbs
         JOIN grounds g ON g.id = gbs.ground_id
         WHERE gbs.id = $1 AND gbs.ground_id = $2
         FOR UPDATE`,
        [slot_id, groundId]
      );

      if (slotRes.rows.length === 0) {
        throw this._notFound('Booking slot not found for this ground');
      }

      const slot = slotRes.rows[0];

      if (!slot.ground_active) {
        throw this._badRequest('This ground is not active');
      }
      if (!slot.is_available) {
        throw this._conflict('This slot is already booked or unavailable');
      }

      // 2. Server-side pricing — client cannot override
      const totalPrice = parseFloat(slot.price);
      // Advance = 50% of total (round to 2 decimals)
      const advanceAmount = Math.round(totalPrice * 0.5 * 100) / 100;
      const remainingAmount = Math.round((totalPrice - advanceAmount) * 100) / 100;

      // 3. Create the booking record
      const bookingRes = await client.query(
        `INSERT INTO ground_bookings
           (ground_id, slot_id, booked_by_user_id, team_id, status,
            total_price, advance_amount, remaining_amount, notes)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
         RETURNING id, ground_id, slot_id, booked_by_user_id, team_id, status,
                   total_price, advance_amount, remaining_amount, notes, created_at`,
        [groundId, slot_id, userId, team_id || null, totalPrice, advanceAmount, remainingAmount, notes || null]
      );

      // 4. Create a pending payment record for the advance
      await client.query(
        `INSERT INTO payments
           (user_id, entity_type, entity_id, amount, currency, status, payment_type, description)
         VALUES ($1, 'ground_booking', $2, $3, 'INR', 'created', 'advance', $4)`,
        [
          userId,
          bookingRes.rows[0].id,
          advanceAmount,
          `Advance payment for ground booking on ${slot.slot_date}`
        ]
      );

      // 5. Mark slot unavailable
      await client.query(
        `UPDATE ground_booking_slots SET is_available = false WHERE id = $1`,
        [slot_id]
      );

      await client.query('COMMIT');
      return bookingRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getMyBookings(userId) {
    const { rows } = await query(
      `SELECT gb.id, gb.status, gb.total_price, gb.advance_amount, gb.remaining_amount,
              gb.advance_paid_at, gb.remaining_paid_at, gb.notes, gb.cancelled_at,
              gb.cancellation_reason, gb.created_at,
              g.id as ground_id, g.name as ground_name, g.address as ground_address,
              g.city as ground_city,
              gbs.slot_date, gbs.start_time, gbs.end_time,
              s.name as sport_name,
              p.id as payment_id, p.status as payment_status, p.payment_type
       FROM ground_bookings gb
       JOIN grounds g ON g.id = gb.ground_id
       JOIN ground_booking_slots gbs ON gbs.id = gb.slot_id
       LEFT JOIN sports s ON s.id = gbs.sport_id
       LEFT JOIN payments p ON p.entity_id = gb.id AND p.entity_type = 'ground_booking'
       WHERE gb.booked_by_user_id = $1
       ORDER BY gbs.slot_date DESC, gbs.start_time DESC`,
      [userId]
    );
    return rows;
  }

  async getBookingById(bookingId, userId, isAdmin = false) {
    const { rows } = await query(
      `SELECT gb.id, gb.ground_id, gb.slot_id, gb.booked_by_user_id, gb.team_id,
              gb.status, gb.total_price, gb.advance_amount, gb.remaining_amount,
              gb.advance_paid_at, gb.remaining_paid_at, gb.notes,
              gb.cancelled_at, gb.cancellation_reason, gb.created_at,
              g.name as ground_name, g.address as ground_address, g.city as ground_city,
              gbs.slot_date, gbs.start_time, gbs.end_time,
              s.name as sport_name,
              p.id as payment_id, p.status as payment_status,
              p.payment_type, p.razorpay_order_id
       FROM ground_bookings gb
       JOIN grounds g ON g.id = gb.ground_id
       JOIN ground_booking_slots gbs ON gbs.id = gb.slot_id
       LEFT JOIN sports s ON s.id = gbs.sport_id
       LEFT JOIN payments p ON p.entity_id = gb.id AND p.entity_type = 'ground_booking'
       WHERE gb.id = $1`,
      [bookingId]
    );

    if (rows.length === 0) throw this._notFound('Booking not found');

    const booking = rows[0];

    // Non-admin users can only view their own bookings
    if (!isAdmin && booking.booked_by_user_id !== userId) {
      throw this._notFound('Booking not found');
    }

    return booking;
  }

  async cancelBooking(bookingId, userId, reason, isAdmin = false) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the booking
      const bookingRes = await client.query(
        `SELECT gb.id, gb.booked_by_user_id, gb.status, gb.advance_amount,
                gb.total_price, gb.slot_id,
                gbs.slot_date, gbs.start_time
         FROM ground_bookings gb
         JOIN ground_booking_slots gbs ON gbs.id = gb.slot_id
         WHERE gb.id = $1
         FOR UPDATE`,
        [bookingId]
      );

      if (bookingRes.rows.length === 0) {
        throw this._notFound('Booking not found');
      }

      const booking = bookingRes.rows[0];

      // Ownership check
      if (!isAdmin && booking.booked_by_user_id !== userId) {
        throw this._notFound('Booking not found');
      }

      // Must be cancellable
      if (!['pending', 'confirmed'].includes(booking.status)) {
        throw this._badRequest(`Booking cannot be cancelled (current status: ${booking.status})`);
      }

      // Apply 2-hour rule
      let slotDateStr = booking.slot_date;
      if (booking.slot_date instanceof Date) {
        slotDateStr = booking.slot_date.toISOString().split('T')[0];
      }
      const bookingStart = new Date(`${slotDateStr}T${booking.start_time}`);
      const now = new Date();
      const diffMs = bookingStart - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      const advanceRefundable = diffHours > 2;

      // Update booking status
      await client.query(
        `UPDATE ground_bookings
         SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1
         WHERE id = $2`,
        [reason || null, bookingId]
      );

      // Mark slot available again
      await client.query(
        `UPDATE ground_booking_slots SET is_available = true WHERE id = $1`,
        [booking.slot_id]
      );

      // Create refund record if advance is refundable
      if (advanceRefundable) {
        // Find the advance payment record
        const paymentRes = await client.query(
          `SELECT id FROM payments
           WHERE entity_id = $1 AND entity_type = 'ground_booking'
             AND payment_type = 'advance'
           ORDER BY created_at DESC LIMIT 1`,
          [bookingId]
        );

        if (paymentRes.rows.length > 0) {
          await client.query(
            `INSERT INTO refunds (payment_id, amount, reason, status, initiated_by_user_id)
             VALUES ($1, $2, $3, 'pending', $4)`,
            [
              paymentRes.rows[0].id,
              booking.advance_amount,
              `Booking cancelled more than 2 hours before start. Full advance refund eligible.`,
              userId
            ]
          );
        }
      }

      await client.query('COMMIT');

      return {
        booking_id: bookingId,
        cancelled: true,
        advance_refundable: advanceRefundable,
        advance_amount: booking.advance_amount,
        message: advanceRefundable
          ? 'Booking cancelled. Advance payment is eligible for refund.'
          : 'Booking cancelled within 2 hours of start. Advance payment will be retained.'
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new GroundsService();
