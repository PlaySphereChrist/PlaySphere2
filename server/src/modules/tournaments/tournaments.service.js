const { query, pool } = require('../../config/database');

// ---------------------------------------------------------------------------
// Status transition map — Phase 9A controls only early lifecycle states.
// Later lifecycle states (registration_open, in_progress, etc.) are
// intentionally inaccessible until their corresponding phases are built.
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS = {
  draft:              ['registration_open', 'cancelled'],
  registration_open:  ['registration_closed', 'cancelled'],
  registration_closed: ['in_progress', 'cancelled'],
  in_progress:        ['completed', 'cancelled'],
  completed:          ['archived'],
  cancelled:          ['archived'],
  archived:           [],
};

// Human-readable phase-9A-appropriate transitions (earlier lifecycle).
// We keep the full map above but document Phase 9A's supported transitions:
// draft → registration_open (publishing workflow simplified for Phase 9A)
// Any attempt to jump to in_progress/completed/archived from draft is rejected.

class TournamentsService {
  _badRequest(msg) {
    const e = new Error(msg);
    e.statusCode = 400;
    return e;
  }

  _notFound(msg) {
    const e = new Error(msg);
    e.statusCode = 404;
    return e;
  }

  _forbidden(msg) {
    const e = new Error(msg);
    e.statusCode = 403;
    return e;
  }

  // -------------------------------------------------------------------------
  // LIST tournaments
  // Visibility:
  //   - ORGANIZER: sees their own tournaments at all statuses
  //   - ADMIN: sees all tournaments
  //   - Everyone else: sees only 'registration_open' tournaments
  // -------------------------------------------------------------------------
  async listTournaments(filters = {}, requestingUser = null) {
    const params = [];
    let whereConditions = ['1=1'];

    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    const isOrganizer = requestingUser?.roles?.includes('ORGANIZER');

    if (isAdmin) {
      // Admin sees everything
    } else if (isOrganizer) {
      // Organizer sees their own + registration_open
      params.push(requestingUser.id);
      whereConditions.push(
        `(t.organizer_user_id = $${params.length} OR t.status IN ('registration_open', 'registration_closed', 'in_progress', 'completed'))`
      );
    } else {
      // Regular users only see registration_open
      whereConditions.push(`t.status IN ('registration_open', 'registration_closed', 'in_progress', 'completed')`);
    }

    if (filters.sport_id) {
      params.push(filters.sport_id);
      whereConditions.push(`t.sport_id = $${params.length}`);
    }

    if (filters.status && (isAdmin || isOrganizer)) {
      // Allow admins/organizers to filter by status
      params.push(filters.status);
      whereConditions.push(`t.status = $${params.length}`);
    }

    if (filters.organizer_user_id && isAdmin) {
      params.push(filters.organizer_user_id);
      whereConditions.push(`t.organizer_user_id = $${params.length}`);
    }

    const sql = `
      SELECT
        t.*,
        s.name  AS sport_name,
        COALESCE(pp.display_name, split_part(u.email, '@', 1)) AS organizer_name
      FROM tournaments t
      JOIN sports  s ON t.sport_id          = s.id
      JOIN users   u ON t.organizer_user_id = u.id
      LEFT JOIN player_profiles pp ON u.id  = pp.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY t.created_at DESC
    `;

    const res = await query(sql, params);
    return res.rows;
  }

  // -------------------------------------------------------------------------
  // GET single tournament
  // -------------------------------------------------------------------------
  async getTournament(tournamentId, requestingUser = null) {
    const res = await query(
      `SELECT
         t.*,
         s.name  AS sport_name,
         COALESCE(pp.display_name, split_part(u.email, '@', 1)) AS organizer_name
       FROM tournaments t
       JOIN sports  s ON t.sport_id          = s.id
       JOIN users   u ON t.organizer_user_id = u.id
       LEFT JOIN player_profiles pp ON u.id  = pp.user_id
       WHERE t.id = $1`,
      [tournamentId]
    );

    if (!res.rows.length) throw this._notFound('Tournament not found');
    const tournament = res.rows[0];

    // Visibility: non-admin, non-owning-organizer can only see registration_open
    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser?.id === tournament.organizer_user_id;

    if (!isAdmin && !isOwnOrganizer && tournament.status !== 'registration_open' && tournament.status !== 'registration_closed' && tournament.status !== 'in_progress' && tournament.status !== 'completed') {
      throw this._notFound('Tournament not found');
    }

    // Attach status history
    const historyRes = await query(
      `SELECT
         h.id,
         h.from_status,
         h.to_status,
         h.reason,
         h.changed_at,
         COALESCE(pp.display_name, split_part(u.email, '@', 1)) AS changed_by_name
       FROM tournament_status_history h
       LEFT JOIN users u ON h.changed_by_user_id = u.id
       LEFT JOIN player_profiles pp ON u.id = pp.user_id
       WHERE h.tournament_id = $1
       ORDER BY h.changed_at ASC`,
      [tournamentId]
    );
    tournament.status_history = historyRes.rows;

    return tournament;
  }

  // -------------------------------------------------------------------------
  // CREATE tournament — ORGANIZER only
  // organizer_user_id always taken from req.user.id
  // -------------------------------------------------------------------------
  async createTournament(organizerUserId, data) {
    const {
      name, sport_id, format, participation_type,
      description, rules, city, venue_details,
      max_teams, min_teams, registration_fee,
      prize_pool, prize_description,
      registration_opens_at, registration_closes_at,
      starts_at, ends_at
    } = data;

    // Required field validation
    if (!name || !name.trim()) throw this._badRequest('Tournament name is required');
    if (!sport_id)             throw this._badRequest('Sport is required');
    if (!format)               throw this._badRequest('Tournament format is required');

    const validFormats = ['league', 'knockout', 'round_robin', 'group_stage_knockout', 'double_elimination'];
    if (!validFormats.includes(format)) {
      throw this._badRequest(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    const validParticipationTypes = ['team', 'individual'];
    const partType = participation_type || 'team';
    if (!validParticipationTypes.includes(partType)) {
      throw this._badRequest('Invalid participation_type. Must be "team" or "individual"');
    }

    // Sport must exist
    const sportRes = await query('SELECT id FROM sports WHERE id = $1', [sport_id]);
    if (!sportRes.rows.length) throw this._badRequest('Sport not found');

    // Numeric validations
    if (max_teams !== undefined && max_teams !== null && max_teams <= 0) {
      throw this._badRequest('max_teams must be greater than 0');
    }
    if (min_teams !== undefined && min_teams !== null && min_teams <= 1) {
      throw this._badRequest('min_teams must be greater than 1');
    }
    if (min_teams && max_teams && min_teams > max_teams) {
      throw this._badRequest('min_teams cannot exceed max_teams');
    }
    if (registration_fee !== undefined && registration_fee !== null && registration_fee < 0) {
      throw this._badRequest('registration_fee cannot be negative');
    }
    if (prize_pool !== undefined && prize_pool !== null && prize_pool < 0) {
      throw this._badRequest('prize_pool cannot be negative');
    }

    // Date validations
    if (registration_opens_at && registration_closes_at) {
      if (new Date(registration_opens_at) >= new Date(registration_closes_at)) {
        throw this._badRequest('registration_opens_at must be before registration_closes_at');
      }
    }
    if (starts_at && ends_at) {
      if (new Date(starts_at) > new Date(ends_at)) {
        throw this._badRequest('starts_at must be on or before ends_at');
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO tournaments (
           name, sport_id, organizer_user_id, format, participation_type,
           description, rules, city, venue_details,
           max_teams, min_teams, registration_fee, prize_pool, prize_description,
           registration_opens_at, registration_closes_at, starts_at, ends_at,
           status
         ) VALUES (
           $1,  $2,  $3,  $4,  $5,
           $6,  $7,  $8,  $9,
           $10, $11, $12, $13, $14,
           $15, $16, $17, $18,
           'draft'
         ) RETURNING id`,
        [
          name.trim(), sport_id, organizerUserId, format, partType,
          description || null, rules || null, city || null, venue_details || null,
          max_teams || null, min_teams || null,
          registration_fee !== undefined ? registration_fee : 0,
          prize_pool || null, prize_description || null,
          registration_opens_at || null, registration_closes_at || null,
          starts_at || null, ends_at || null
        ]
      );

      const tournamentId = insertRes.rows[0].id;

      // Record creation in status history (null from_status — initial creation)
      await client.query(
        `INSERT INTO tournament_status_history
           (tournament_id, from_status, to_status, changed_by_user_id, reason)
         VALUES ($1, NULL, 'draft', $2, 'Tournament created')`,
        [tournamentId, organizerUserId]
      );

      await client.query('COMMIT');
      return await this.getTournament(tournamentId, { id: organizerUserId, roles: ['ORGANIZER'] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE tournament — only the owning organizer or ADMIN
  // -------------------------------------------------------------------------
  async updateTournament(tournamentId, requestingUser, data) {
    const tournament = await this.getTournament(tournamentId, requestingUser);

    const isAdmin = requestingUser.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser.id === tournament.organizer_user_id;

    if (!isAdmin && !isOwnOrganizer) {
      throw this._forbidden('Only the organizer or an admin can modify this tournament');
    }

    // Guard: certain statuses are locked for data edits
    const lockedStatuses = ['in_progress', 'completed', 'cancelled', 'archived'];
    if (lockedStatuses.includes(tournament.status)) {
      throw this._badRequest(`Cannot modify a tournament with status "${tournament.status}"`);
    }

    // Handle status transition separately
    if (data.status !== undefined) {
      return await this.transitionStatus(tournamentId, requestingUser, data.status, data.reason);
    }

    // Build SET clause from whitelisted fields
    const fields = [];
    const values = [];
    let idx = 1;

    const set = (col, val) => {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (data.name !== undefined) {
      if (!data.name.trim()) throw this._badRequest('name cannot be empty');
      set('name', data.name.trim());
    }
    if (data.description !== undefined) set('description', data.description || null);
    if (data.rules       !== undefined) set('rules',       data.rules       || null);
    if (data.city        !== undefined) set('city',        data.city        || null);
    if (data.venue_details !== undefined) set('venue_details', data.venue_details || null);
    if (data.banner_url  !== undefined) set('banner_url',  data.banner_url  || null);
    if (data.prize_description !== undefined) set('prize_description', data.prize_description || null);

    if (data.format !== undefined) {
      const validFormats = ['league', 'knockout', 'round_robin', 'group_stage_knockout', 'double_elimination'];
      if (!validFormats.includes(data.format)) throw this._badRequest('Invalid format');
      set('format', data.format);
    }

    if (data.participation_type !== undefined) {
      if (!['team', 'individual'].includes(data.participation_type)) {
        throw this._badRequest('Invalid participation_type');
      }
      set('participation_type', data.participation_type);
    }

    if (data.max_teams !== undefined) {
      if (data.max_teams !== null && data.max_teams <= 0) throw this._badRequest('max_teams must be > 0');
      set('max_teams', data.max_teams || null);
    }
    if (data.min_teams !== undefined) {
      if (data.min_teams !== null && data.min_teams <= 1) throw this._badRequest('min_teams must be > 1');
      set('min_teams', data.min_teams || null);
    }
    if (data.registration_fee !== undefined) {
      if (data.registration_fee < 0) throw this._badRequest('registration_fee cannot be negative');
      set('registration_fee', data.registration_fee);
    }
    if (data.prize_pool !== undefined) {
      if (data.prize_pool !== null && data.prize_pool < 0) throw this._badRequest('prize_pool cannot be negative');
      set('prize_pool', data.prize_pool || null);
    }

    if (data.registration_opens_at !== undefined) set('registration_opens_at', data.registration_opens_at || null);
    if (data.registration_closes_at !== undefined) set('registration_closes_at', data.registration_closes_at || null);
    if (data.starts_at !== undefined) set('starts_at', data.starts_at || null);
    if (data.ends_at   !== undefined) set('ends_at',   data.ends_at   || null);

    // Cross-field date validations after collecting new values
    const newRegOpen   = data.registration_opens_at  ?? tournament.registration_opens_at;
    const newRegClose  = data.registration_closes_at ?? tournament.registration_closes_at;
    const newStartsAt  = data.starts_at  ?? tournament.starts_at;
    const newEndsAt    = data.ends_at    ?? tournament.ends_at;

    if (newRegOpen && newRegClose && new Date(newRegOpen) >= new Date(newRegClose)) {
      throw this._badRequest('registration_opens_at must be before registration_closes_at');
    }
    if (newStartsAt && newEndsAt && new Date(newStartsAt) > new Date(newEndsAt)) {
      throw this._badRequest('starts_at must be on or before ends_at');
    }

    if (fields.length === 0) return tournament;

    values.push(tournamentId);
    await query(
      `UPDATE tournaments SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return await this.getTournament(tournamentId, requestingUser);
  }

  // -------------------------------------------------------------------------
  // CONFIGURATION VALIDATION
  // -------------------------------------------------------------------------
  async validateConfiguration(tournamentId, requestingUser) {
    const tournament = await this.getTournament(tournamentId, requestingUser);
    return this._checkConfigurationCompleteness(tournament);
  }

  _checkConfigurationCompleteness(tournament) {
    const missing = [];
    const errors = [];

    if (!tournament.registration_opens_at) missing.push('registration_opens_at');
    if (!tournament.registration_closes_at) missing.push('registration_closes_at');
    if (!tournament.starts_at) missing.push('starts_at');
    if (!tournament.ends_at) missing.push('ends_at');
    
    if (!tournament.city && !tournament.venue_details) {
      missing.push('venue_details');
    }
    
    if (tournament.participation_type === 'team') {
      if (!tournament.min_teams) missing.push('min_teams');
      if (!tournament.max_teams) missing.push('max_teams');
      if (tournament.min_teams && tournament.max_teams && tournament.min_teams > tournament.max_teams) {
        errors.push('min_teams cannot exceed max_teams');
      }
    }

    if (tournament.registration_opens_at && tournament.registration_closes_at) {
      if (new Date(tournament.registration_opens_at) >= new Date(tournament.registration_closes_at)) {
        errors.push('registration_opens_at must be before registration_closes_at');
      }
    }

    if (tournament.starts_at && tournament.ends_at) {
      if (new Date(tournament.starts_at) > new Date(tournament.ends_at)) {
        errors.push('starts_at must be on or before ends_at');
      }
    }

    if (tournament.registration_closes_at && tournament.starts_at) {
      if (new Date(tournament.registration_closes_at) > new Date(tournament.starts_at)) {
        errors.push('registration_closes_at must be on or before starts_at');
      }
    }

    const valid = missing.length === 0 && errors.length === 0;

    return {
      valid,
      missing,
      errors
    };
  }

  // -------------------------------------------------------------------------
  // STATUS TRANSITION — validated, transactional, with history
  // -------------------------------------------------------------------------
  async transitionStatus(tournamentId, requestingUser, newStatus, reason = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the row and get all fields for validation
      const lockRes = await client.query(
        `SELECT * FROM tournaments WHERE id = $1 FOR UPDATE`,
        [tournamentId]
      );
      if (!lockRes.rows.length) throw this._notFound('Tournament not found');

      const tournament = lockRes.rows[0];
      const isAdmin = requestingUser.roles?.includes('ADMIN');
      const isOwnOrganizer = requestingUser.id === tournament.organizer_user_id;

      if (!isAdmin && !isOwnOrganizer) {
        throw this._forbidden('Only the organizer or an admin can change tournament status');
      }

      const currentStatus = tournament.status;
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(newStatus)) {
        throw this._badRequest(
          `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
          `Allowed transitions: ${allowed.length ? allowed.join(', ') : 'none'}`
        );
      }

      // Enforce configuration completeness for transitioning out of draft
      if (currentStatus === 'draft' && newStatus === 'registration_open') {
        const configCheck = this._checkConfigurationCompleteness(tournament);
        if (!configCheck.valid) {
          throw this._badRequest('Tournament configuration is incomplete or invalid. Missing: ' + 
                                 configCheck.missing.join(', ') + '. Errors: ' + configCheck.errors.join(', '));
        }
      }

      // Update tournament status
      await client.query(
        `UPDATE tournaments SET status = $1 WHERE id = $2`,
        [newStatus, tournamentId]
      );

      // Insert history record
      await client.query(
        `INSERT INTO tournament_status_history
           (tournament_id, from_status, to_status, changed_by_user_id, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [tournamentId, currentStatus, newStatus, requestingUser.id, reason || null]
      );

      await client.query('COMMIT');
      return await this.getTournament(tournamentId, requestingUser);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new TournamentsService();