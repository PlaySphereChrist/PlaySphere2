const { query, pool } = require('../../config/database');
const eligibilityService = require('./eligibility.service');

class RegistrationService {
  _badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
  _forbidden(msg) { const e = new Error(msg); e.statusCode = 403; return e; }
  _notFound(msg) { const e = new Error(msg); e.statusCode = 404; return e; }
  _conflict(msg) { const e = new Error(msg); e.statusCode = 409; return e; }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  async _fetchTournament(tournamentId) {
    const res = await query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
    if (!res.rows.length) throw this._notFound('Tournament not found');
    return res.rows[0];
  }

  _assertRegistrationOpen(tournament) {
    if (tournament.status !== 'registration_open') {
      throw this._badRequest(
        `Registration is not open. Tournament status is "${tournament.status}"`
      );
    }
    const now = new Date();
    if (tournament.registration_opens_at && now < new Date(tournament.registration_opens_at)) {
      throw this._badRequest('Registration window has not yet opened');
    }
    if (tournament.registration_closes_at && now > new Date(tournament.registration_closes_at)) {
      throw this._badRequest('Registration window has closed');
    }
  }

  async _countActiveRegistrations(client, tournamentId) {
    const res = await client.query(
      `SELECT COUNT(*) AS cnt FROM tournament_registrations
       WHERE tournament_id = $1 AND status IN ('pending', 'approved')`,
      [tournamentId]
    );
    return parseInt(res.rows[0].cnt, 10);
  }

  async _nextWaitlistPosition(client, tournamentId) {
    const res = await client.query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
       FROM tournament_waitlist WHERE tournament_id = $1`,
      [tournamentId]
    );
    return res.rows[0].next_pos;
  }

  // ---------------------------------------------------------------------------
  // REGISTER — individual or team
  // ---------------------------------------------------------------------------
  async register(tournamentId, user, body) {
    const tournament = await this._fetchTournament(tournamentId);
    this._assertRegistrationOpen(tournament);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock tournament row to prevent concurrent over-registration
      const lockRes = await client.query(
        'SELECT * FROM tournaments WHERE id = $1 FOR UPDATE',
        [tournamentId]
      );
      const lockedTournament = lockRes.rows[0];

      let result;
      if (lockedTournament.participation_type === 'individual') {
        result = await this._registerIndividual(client, lockedTournament, user, body);
      } else {
        result = await this._registerTeam(client, lockedTournament, user, body);
      }

      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async _registerIndividual(client, tournament, user, body) {
    // Resolve individual_player_profile_id from the requesting user's own profile
    const profileRes = await client.query(
      'SELECT id, user_id FROM player_profiles WHERE user_id = $1',
      [user.id]
    );
    if (!profileRes.rows.length) {
      throw this._badRequest('You must create a Player Profile before registering for a tournament');
    }

    const profileId = profileRes.rows[0].id;

    // Check for existing active registration
    const dupRes = await client.query(
      `SELECT id FROM tournament_registrations
       WHERE tournament_id = $1 AND individual_player_profile_id = $2
         AND status IN ('pending', 'approved')`,
      [tournament.id, profileId]
    );
    if (dupRes.rows.length) {
      throw this._conflict('You already have an active registration for this tournament');
    }

    // Check eligibility (evaluate using Phase 9C internally)
    const eligResult = await this._evaluateInTransaction(client, tournament.id, { player_profile_id: profileId }, user);
    if (!eligResult.effective_eligible) {
      throw this._forbidden('Registration denied: candidate does not satisfy all mandatory eligibility rules');
    }

    // Check capacity and route to registration or waitlist
    const activeCount = await this._countActiveRegistrations(client, tournament.id);
    const capacity = tournament.max_teams; // max_teams field is used for both types

    if (capacity && activeCount >= capacity) {
      // Full — go to waitlist
      return await this._addToWaitlist(client, tournament.id, user.id, null, profileId, eligResult);
    }

    // Create registration
    const regRes = await client.query(
      `INSERT INTO tournament_registrations
         (tournament_id, individual_player_profile_id, registered_by_user_id,
          status, eligibility_status, registration_name, registered_at)
       VALUES ($1, $2, $3, 'approved', $4, $5, NOW())
       RETURNING *`,
      [
        tournament.id,
        profileId,
        user.id,
        eligResult.override ? 'overridden' : 'approved',
        user.username || null
      ]
    );

    return { type: 'registered', registration: regRes.rows[0] };
  }

  async _registerTeam(client, tournament, user, body) {
    const { team_id } = body;
    if (!team_id) throw this._badRequest('team_id is required for team tournaments');

    // Validate team exists and user is manager
    const teamRes = await client.query(
      'SELECT id, sport_id, manager_user_id, name FROM teams WHERE id = $1 AND is_active = true',
      [team_id]
    );
    if (!teamRes.rows.length) throw this._notFound('Team not found');
    const team = teamRes.rows[0];

    if (team.manager_user_id !== user.id) {
      throw this._forbidden('Only the Team Manager can register a team');
    }

    // Validate sport matches
    if (team.sport_id !== tournament.sport_id) {
      throw this._badRequest('Team sport does not match tournament sport');
    }

    // Check for existing active registration
    const dupRes = await client.query(
      `SELECT id FROM tournament_registrations
       WHERE tournament_id = $1 AND team_id = $2 AND status IN ('pending', 'approved')`,
      [tournament.id, team_id]
    );
    if (dupRes.rows.length) {
      throw this._conflict('This team already has an active registration for this tournament');
    }

    // Check eligibility via Phase 9C
    const eligResult = await this._evaluateInTransaction(client, tournament.id, { team_id }, user);
    if (!eligResult.effective_eligible) {
      throw this._forbidden('Registration denied: team does not satisfy all mandatory eligibility rules');
    }

    // Check capacity
    const activeCount = await this._countActiveRegistrations(client, tournament.id);
    const capacity = tournament.max_teams;

    if (capacity && activeCount >= capacity) {
      return await this._addToWaitlist(client, tournament.id, user.id, team_id, null, eligResult);
    }

    // Create registration
    const regRes = await client.query(
      `INSERT INTO tournament_registrations
         (tournament_id, team_id, registered_by_user_id,
          status, eligibility_status, registration_name, registered_at)
       VALUES ($1, $2, $3, 'approved', $4, $5, NOW())
       RETURNING *`,
      [
        tournament.id,
        team_id,
        user.id,
        eligResult.override ? 'overridden' : 'approved',
        team.name
      ]
    );

    // Snapshot team roster into tournament_registration_players
    const rosterRes = await client.query(
      `SELECT tm.player_profile_id
       FROM team_members tm
       WHERE tm.team_id = $1 AND tm.is_active = true`,
      [team_id]
    );
    for (const member of rosterRes.rows) {
      await client.query(
        `INSERT INTO tournament_registration_players (registration_id, player_profile_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [regRes.rows[0].id, member.player_profile_id]
      );
    }

    return { type: 'registered', registration: regRes.rows[0] };
  }

  // Run Phase 9C evaluation query using the internal eligibility engine
  async _evaluateInTransaction(client, tournamentId, candidateData, user) {
    return await eligibilityService.evaluateCandidateInternal(client, tournamentId, candidateData);
  }

  async _addToWaitlist(client, tournamentId, userId, teamId, profileId, eligResult) {
    // Prevent duplicate active waitlist entry
    const params = [tournamentId];
    let dupClause = '';
    if (teamId) {
      params.push(teamId);
      dupClause = `AND team_id = $2`;
    } else {
      params.push(profileId);
      dupClause = `AND individual_player_profile_id = $2`;
    }

    const dupWait = await client.query(
      `SELECT id FROM tournament_waitlist
       WHERE tournament_id = $1 ${dupClause} AND status = 'waiting'`,
      params
    );
    if (dupWait.rows.length) {
      throw this._conflict('Already on the waitlist for this tournament');
    }

    const position = await this._nextWaitlistPosition(client, tournamentId);
    const waitRes = await client.query(
      `INSERT INTO tournament_waitlist
         (tournament_id, team_id, individual_player_profile_id, registered_by_user_id, position, status)
       VALUES ($1, $2, $3, $4, $5, 'waiting')
       RETURNING *`,
      [tournamentId, teamId || null, profileId || null, userId, position]
    );

    return { type: 'waitlisted', waitlist_entry: waitRes.rows[0] };
  }

  // ---------------------------------------------------------------------------
  // LIST REGISTRATIONS — Organizer/Admin only
  // ---------------------------------------------------------------------------
  async listRegistrations(tournamentId, user) {
    await this._fetchTournament(tournamentId); // existence check
    await this._assertOrganizerOrAdmin(tournamentId, user);

    const res = await query(
      `SELECT r.*,
              t.name AS team_name,
              pp.display_name AS individual_display_name,
              u.email AS registered_by_email
       FROM tournament_registrations r
       LEFT JOIN teams t ON t.id = r.team_id
       LEFT JOIN player_profiles pp ON pp.id = r.individual_player_profile_id
       JOIN users u ON u.id = r.registered_by_user_id
       WHERE r.tournament_id = $1
       ORDER BY r.registered_at ASC`,
      [tournamentId]
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET MY REGISTRATION
  // ---------------------------------------------------------------------------
  async getMyRegistration(tournamentId, user) {
    await this._fetchTournament(tournamentId);

    // For individual: match via profile
    const profileRes = await query(
      'SELECT id FROM player_profiles WHERE user_id = $1',
      [user.id]
    );
    const profileId = profileRes.rows[0]?.id;

    // For team: match via managed teams
    const teamRes = await query(
      'SELECT id FROM teams WHERE manager_user_id = $1 AND is_active = true',
      [user.id]
    );
    const teamIds = teamRes.rows.map(r => r.id);

    const conditions = [];
    const params = [tournamentId];
    if (profileId) {
      params.push(profileId);
      conditions.push(`individual_player_profile_id = $${params.length}`);
    }
    if (teamIds.length) {
      params.push(teamIds);
      conditions.push(`team_id = ANY($${params.length})`);
    }

    if (!conditions.length) return null;

    const res = await query(
      `SELECT r.*, t.name AS team_name, pp.display_name AS individual_display_name
       FROM tournament_registrations r
       LEFT JOIN teams t ON t.id = r.team_id
       LEFT JOIN player_profiles pp ON pp.id = r.individual_player_profile_id
       WHERE r.tournament_id = $1 AND (${conditions.join(' OR ')})
       ORDER BY r.registered_at DESC LIMIT 1`,
      params
    );
    return res.rows[0] || null;
  }

  // ---------------------------------------------------------------------------
  // CANCEL REGISTRATION
  // ---------------------------------------------------------------------------
  async cancelRegistration(tournamentId, registrationId, user) {
    const tournament = await this._fetchTournament(tournamentId);

    const regRes = await query(
      'SELECT * FROM tournament_registrations WHERE id = $1 AND tournament_id = $2',
      [registrationId, tournamentId]
    );
    if (!regRes.rows.length) throw this._notFound('Registration not found');
    const reg = regRes.rows[0];

    if (!['pending', 'approved'].includes(reg.status)) {
      throw this._badRequest(`Cannot cancel a registration with status "${reg.status}"`);
    }

    // Authorization: registered_by_user_id, organizer, or admin
    const isAdmin = user.roles?.includes('ADMIN');
    const tournamentRow = await query(
      'SELECT organizer_user_id FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    const isOrganizer = user.id === tournamentRow.rows[0]?.organizer_user_id;
    const isOwner = user.id === reg.registered_by_user_id;

    if (!isAdmin && !isOrganizer && !isOwner) {
      throw this._forbidden('You are not authorized to cancel this registration');
    }

    // Block cancellation if tournament is in_progress or later (except for admin)
    if (!isAdmin && ['in_progress', 'completed', 'archived'].includes(tournament.status)) {
      throw this._badRequest('Cannot cancel a registration while the tournament is in progress or completed');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Mark as withdrawn
      await client.query(
        `UPDATE tournament_registrations SET status = 'withdrawn', updated_at = NOW() WHERE id = $1`,
        [registrationId]
      );

      // Attempt to promote waitlist if capacity now available
      if (['pending', 'approved'].includes(reg.status)) {
        await this._promoteWaitlist(client, tournament);
      }

      await client.query('COMMIT');
      return { cancelled: true, registration_id: registrationId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Promote earliest waiting candidate after a slot opens
  async _promoteWaitlist(client, tournament) {
    const capacity = tournament.max_teams;
    if (!capacity) return; // No capacity limit means no waitlist promotion needed

    const countRes = await client.query(
      `SELECT COUNT(*) AS cnt FROM tournament_registrations
       WHERE tournament_id = $1 AND status IN ('pending', 'approved')`,
      [tournament.id]
    );
    const activeCount = parseInt(countRes.rows[0].cnt, 10);
    if (activeCount >= capacity) return; // Still full

    // Find earliest waiting entry
    const waitRes = await client.query(
      `SELECT * FROM tournament_waitlist
       WHERE tournament_id = $1 AND status = 'waiting'
       ORDER BY position ASC LIMIT 1`,
      [tournament.id]
    );
    if (!waitRes.rows.length) return; // Nothing to promote

    const entry = waitRes.rows[0];

    const candidateData = entry.team_id
      ? { team_id: entry.team_id }
      : { player_profile_id: entry.individual_player_profile_id };

    let eligResult;
    try {
      // Re-evaluate using internal engine (uses same client, no auth checks)
      await client.query('SAVEPOINT promote_check');
      eligResult = await eligibilityService.evaluateCandidateInternal(client, tournament.id, candidateData);
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT promote_check');
      return; // If eligibility check fails, skip promotion
    }

    if (!eligResult.effective_eligible) {
      // Mark this entry as still waiting but skip it — it's ineligible
      // Move to next: just skip, don't promote
      return;
    }

    // Promote: update waitlist entry and create registration
    await client.query(
      `UPDATE tournament_waitlist SET status = 'promoted', updated_at = NOW() WHERE id = $1`,
      [entry.id]
    );

    await client.query(
      `INSERT INTO tournament_registrations
         (tournament_id, team_id, individual_player_profile_id, registered_by_user_id,
          status, eligibility_status, registration_name, registered_at)
       VALUES ($1, $2, $3, $4, 'approved', $5, $6, NOW())`,
      [
        tournament.id,
        entry.team_id || null,
        entry.individual_player_profile_id || null,
        entry.registered_by_user_id,
        eligResult.override ? 'overridden' : 'approved',
        null
      ]
    );
  }

  // ---------------------------------------------------------------------------
  // LIST WAITLIST — Organizer/Admin only
  // ---------------------------------------------------------------------------
  async listWaitlist(tournamentId, user) {
    await this._fetchTournament(tournamentId);
    await this._assertOrganizerOrAdmin(tournamentId, user);

    const res = await query(
      `SELECT w.*,
              t.name AS team_name,
              pp.display_name AS individual_display_name,
              u.email AS registered_by_email
       FROM tournament_waitlist w
       LEFT JOIN teams t ON t.id = w.team_id
       LEFT JOIN player_profiles pp ON pp.id = w.individual_player_profile_id
       JOIN users u ON u.id = w.registered_by_user_id
       WHERE w.tournament_id = $1
       ORDER BY w.position ASC`,
      [tournamentId]
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET MY WAITLIST POSITION
  // ---------------------------------------------------------------------------
  async getMyWaitlistEntry(tournamentId, user) {
    await this._fetchTournament(tournamentId);

    const profileRes = await query('SELECT id FROM player_profiles WHERE user_id = $1', [user.id]);
    const profileId = profileRes.rows[0]?.id;

    const teamRes = await query('SELECT id FROM teams WHERE manager_user_id = $1 AND is_active = true', [user.id]);
    const teamIds = teamRes.rows.map(r => r.id);

    const conditions = [];
    const params = [tournamentId];
    if (profileId) {
      params.push(profileId);
      conditions.push(`individual_player_profile_id = $${params.length}`);
    }
    if (teamIds.length) {
      params.push(teamIds);
      conditions.push(`team_id = ANY($${params.length})`);
    }

    if (!conditions.length) return null;

    const res = await query(
      `SELECT * FROM tournament_waitlist
       WHERE tournament_id = $1 AND (${conditions.join(' OR ')}) AND status = 'waiting'
       ORDER BY position ASC LIMIT 1`,
      params
    );
    return res.rows[0] || null;
  }

  // ---------------------------------------------------------------------------
  // Helper: assert organizer or admin for a tournament
  // ---------------------------------------------------------------------------
  async _assertOrganizerOrAdmin(tournamentId, user) {
    if (user.roles?.includes('ADMIN')) return;
    const res = await query('SELECT organizer_user_id FROM tournaments WHERE id = $1', [tournamentId]);
    if (!res.rows.length) throw this._notFound('Tournament not found');
    if (res.rows[0].organizer_user_id !== user.id) {
      throw this._forbidden('Only the organizer or an admin can view registrations');
    }
  }
}

module.exports = new RegistrationService();
