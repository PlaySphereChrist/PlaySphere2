'use strict';

const { pool, query } = require('../../config/database');
const tournamentsService = require('../tournaments/tournaments.service');

class PerformanceService {

  _notFound(msg)   { const e = new Error(msg); e.statusCode = 404; return e; }
  _badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
  _forbidden(msg)  { const e = new Error(msg); e.statusCode = 403; return e; }
  _conflict(msg)   { const e = new Error(msg); e.statusCode = 409; return e; }

  // ---------------------------------------------------------------------------
  // INTERNAL: fetch and verify a match is accessible to requestingUser,
  // returning the full match row. Delegates tournament visibility to
  // tournamentsService.getTournament (which enforces RBAC + visibility).
  // ---------------------------------------------------------------------------
  async _fetchMatch(matchId, requestingUser) {
    const res = await query(
      `SELECT m.*, f.round_number, f.round_name, f.match_number
       FROM matches m
       LEFT JOIN fixtures f ON m.fixture_id = f.id
       WHERE m.id = $1`,
      [matchId]
    );
    if (!res.rows.length) throw this._notFound('Match not found');
    const match = res.rows[0];
    if (!match.tournament_id) {
      throw this._badRequest('Performance events are only supported for official tournament matches');
    }
    // Re-use tournament visibility (throws 404 if hidden from user)
    const tournament = await tournamentsService.getTournament(match.tournament_id, requestingUser);
    return { match, tournament };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL: verify the caller is the tournament's organizer or an ADMIN
  // ---------------------------------------------------------------------------
  _assertOrganizerOrAdmin(tournament, requestingUser) {
    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser?.id === tournament.organizer_user_id;
    if (!isAdmin && !isOwnOrganizer) {
      throw this._forbidden('Only the tournament organizer or an admin can record performance events');
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/matches/:matchId/performance-events
  // All authenticated users with tournament visibility may read
  // ---------------------------------------------------------------------------
  async getMatchPerformanceEvents(matchId, requestingUser) {
    await this._fetchMatch(matchId, requestingUser);

    const res = await query(`
      SELECT
        pe.id,
        pe.match_id,
        pe.sport_stat_definition_id,
        pe.event_time_seconds,
        pe.event_metadata,
        pe.recorded_by_user_id,
        pe.recorded_at,
        pe.created_at,
        ssd.stat_key,
        ssd.stat_name,
        ssd.data_type,
        ssd.applies_to
      FROM performance_events pe
      JOIN sport_stat_definitions ssd ON pe.sport_stat_definition_id = ssd.id
      WHERE pe.match_id = $1
      ORDER BY pe.event_time_seconds ASC NULLS LAST, pe.recorded_at ASC
    `, [matchId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET /api/performance-events/:eventId
  // ---------------------------------------------------------------------------
  async getPerformanceEvent(eventId, requestingUser) {
    const res = await query(`
      SELECT
        pe.id,
        pe.match_id,
        pe.sport_stat_definition_id,
        pe.event_time_seconds,
        pe.event_metadata,
        pe.recorded_by_user_id,
        pe.recorded_at,
        pe.created_at,
        ssd.stat_key,
        ssd.stat_name,
        ssd.data_type,
        ssd.applies_to
      FROM performance_events pe
      JOIN sport_stat_definitions ssd ON pe.sport_stat_definition_id = ssd.id
      WHERE pe.id = $1
    `, [eventId]);

    if (!res.rows.length) throw this._notFound('Performance event not found');
    const event = res.rows[0];

    // Enforce tournament visibility via match
    await this._fetchMatch(event.match_id, requestingUser);
    return event;
  }

  // ---------------------------------------------------------------------------
  // GET /api/performance-events/:eventId/players
  // ---------------------------------------------------------------------------
  async getPerformanceEventPlayers(eventId, requestingUser) {
    await this.getPerformanceEvent(eventId, requestingUser);

    const res = await query(`
      SELECT
        pep.id,
        pep.performance_event_id,
        pep.player_profile_id,
        pep.team_id,
        pep.value,
        pep.created_at,
        pp.display_name,
        t.name AS team_name
      FROM performance_event_players pep
      LEFT JOIN player_profiles pp ON pep.player_profile_id = pp.id
      LEFT JOIN teams t ON pep.team_id = t.id
      WHERE pep.performance_event_id = $1
    `, [eventId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/performance-events
  // Organizer/Admin only.
  // Match must be in_progress (live) to record events.
  //
  // Request body:
  // {
  //   sport_stat_definition_id: UUID,
  //   event_time_seconds: integer (optional),
  //   event_metadata: object (optional),
  //   players: [
  //     { player_profile_id: UUID, value: number (optional) }
  //   ]
  // }
  // ---------------------------------------------------------------------------
  async createPerformanceEvent(matchId, data, requestingUser) {
    // 1. Validate payload structure before touching DB
    if (!data.sport_stat_definition_id) {
      throw this._badRequest('sport_stat_definition_id is required');
    }
    if (data.event_time_seconds !== undefined && data.event_time_seconds !== null) {
      if (!Number.isInteger(data.event_time_seconds) || data.event_time_seconds < 0) {
        throw this._badRequest('event_time_seconds must be a non-negative integer');
      }
    }
    if (!Array.isArray(data.players)) {
      throw this._badRequest('players must be an array');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Lock the match row to prevent concurrent state changes during event recording
      const matchRes = await client.query(
        'SELECT * FROM matches WHERE id = $1 FOR UPDATE',
        [matchId]
      );
      if (!matchRes.rows.length) throw this._notFound('Match not found');
      const match = matchRes.rows[0];

      if (!match.tournament_id) {
        throw this._badRequest('Performance events are only supported for official tournament matches');
      }

      // 3. Check tournament visibility + authorization
      const tournament = await tournamentsService.getTournament(match.tournament_id, requestingUser);
      this._assertOrganizerOrAdmin(tournament, requestingUser);

      // 4. Match must be in_progress (live) to record events
      if (match.status !== 'in_progress') {
        throw this._badRequest(`Cannot record performance events for a match with status "${match.status}". Match must be in_progress.`);
      }

      // 5. Validate the sport_stat_definition belongs to the match's sport
      const defRes = await client.query(
        `SELECT id, sport_id, stat_key, stat_name, data_type, applies_to
         FROM sport_stat_definitions
         WHERE id = $1 FOR SHARE`,
        [data.sport_stat_definition_id]
      );
      if (!defRes.rows.length) {
        throw this._notFound('sport_stat_definition not found');
      }
      const statDef = defRes.rows[0];
      if (statDef.sport_id !== match.sport_id) {
        throw this._badRequest(
          `Stat definition "${statDef.stat_key}" does not belong to the sport of this match`
        );
      }

      // 6. Validate players — each must be traceable to a match_participant → tournament_registration → registration_players
      //    Build a set of valid player_profile_ids for this match.
      const validPlayersRes = await client.query(`
        SELECT DISTINCT trp.player_profile_id
        FROM match_participants mp
        JOIN tournament_registrations tr ON mp.registration_id = tr.id
        JOIN tournament_registration_players trp ON trp.registration_id = tr.id
        WHERE mp.match_id = $1 AND tr.tournament_id = $2
      `, [matchId, match.tournament_id]);

      const validPlayerIds = new Set(validPlayersRes.rows.map(r => r.player_profile_id));

      // Also include individual registration players (for individual-participation-type tournaments)
      const indivRes = await client.query(`
        SELECT DISTINCT tr.individual_player_profile_id AS player_profile_id
        FROM match_participants mp
        JOIN tournament_registrations tr ON mp.registration_id = tr.id
        WHERE mp.match_id = $1 AND tr.tournament_id = $2
          AND tr.individual_player_profile_id IS NOT NULL
      `, [matchId, match.tournament_id]);
      indivRes.rows.forEach(r => validPlayerIds.add(r.player_profile_id));

      // Check for duplicate player_profile_ids in the request
      const requestedPlayerIds = data.players.map(p => p.player_profile_id);
      if (new Set(requestedPlayerIds).size !== requestedPlayerIds.length) {
        throw this._badRequest('Duplicate player_profile_id entries in players array');
      }

      // Validate each player
      for (const p of data.players) {
        if (!p.player_profile_id) {
          throw this._badRequest('Each player entry must include player_profile_id');
        }
        if (!validPlayerIds.has(p.player_profile_id)) {
          throw this._badRequest(
            `Player ${p.player_profile_id} is not a registered participant in this match`
          );
        }
        // Validate value type if defined
        if (p.value !== undefined && p.value !== null) {
          if (typeof p.value !== 'number' || isNaN(p.value)) {
            throw this._badRequest(`Invalid numeric value for player ${p.player_profile_id}`);
          }
          if (statDef.data_type === 'integer' && !Number.isInteger(p.value)) {
            throw this._badRequest(`Stat "${statDef.stat_key}" requires an integer value`);
          }
          if (statDef.data_type === 'boolean' && p.value !== 0 && p.value !== 1) {
            throw this._badRequest(`Stat "${statDef.stat_key}" requires a boolean value (0 or 1)`);
          }
        }
      }

      // 7. Insert performance_event
      const eventRes = await client.query(`
        INSERT INTO performance_events (
          match_id,
          sport_stat_definition_id,
          event_time_seconds,
          event_metadata,
          recorded_by_user_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        matchId,
        data.sport_stat_definition_id,
        data.event_time_seconds !== undefined ? data.event_time_seconds : null,
        data.event_metadata ? JSON.stringify(data.event_metadata) : null,
        requestingUser.id
      ]);

      const event = eventRes.rows[0];

      // 8. Insert performance_event_players
      const insertedPlayers = [];
      for (const p of data.players) {
        // Look up the team_id from the match participant for this player
        const teamRes = await client.query(`
          SELECT mp.team_id
          FROM match_participants mp
          JOIN tournament_registrations tr ON mp.registration_id = tr.id
          LEFT JOIN tournament_registration_players trp ON trp.registration_id = tr.id
            AND trp.player_profile_id = $1
          WHERE mp.match_id = $2
            AND (trp.player_profile_id = $1 OR tr.individual_player_profile_id = $1)
          LIMIT 1
        `, [p.player_profile_id, matchId]);

        const teamId = teamRes.rows.length ? teamRes.rows[0].team_id : null;

        const pepRes = await client.query(`
          INSERT INTO performance_event_players (
            performance_event_id,
            player_profile_id,
            team_id,
            value
          ) VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [
          event.id,
          p.player_profile_id,
          teamId || null,
          p.value !== undefined ? p.value : null
        ]);
        insertedPlayers.push(pepRes.rows[0]);
      }

      await client.query('COMMIT');

      return {
        event: {
          ...event,
          stat_key: statDef.stat_key,
          stat_name: statDef.stat_name
        },
        players: insertedPlayers
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new PerformanceService();
