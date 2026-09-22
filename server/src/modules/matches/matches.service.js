'use strict';

const { pool, query } = require('../../config/database');
const tournamentsService = require('../tournaments/tournaments.service');

class MatchesService {

  _notFound(msg)   { const e = new Error(msg); e.statusCode = 404; return e; }
  _badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
  _forbidden(msg)  { const e = new Error(msg); e.statusCode = 403; return e; }
  _conflict(msg)   { const e = new Error(msg); e.statusCode = 409; return e; }

  // ---------------------------------------------------------------------------
  // HELPER: Post a community event_announcement about a match lifecycle event
  // Fire-and-forget — a failure here must not block the match operation.
  // ---------------------------------------------------------------------------
  async _postMatchAnnouncement(match, eventType, requestingUserId, extra = {}) {
    try {
      const commRes = await query(
        `SELECT id FROM communities WHERE tournament_id = $1 AND is_active = TRUE LIMIT 1`,
        [match.tournament_id]
      );
      if (!commRes.rows[0]) return; // No community — skip silently

      const communityId = commRes.rows[0].id;

      // Check if requester is a community member, auto-join organizer if needed
      const memberCheck = await query(
        'SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2',
        [communityId, requestingUserId]
      );
      if (!memberCheck.rows[0]) {
        await query(
          `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
          [communityId, requestingUserId]
        );
      }

      // Build announcement body
      let title, body;
      if (eventType === 'scheduled') {
        const roundInfo = extra.round_name ? `${extra.round_name} ` : '';
        const when = match.scheduled_at ? ` on ${new Date(match.scheduled_at).toLocaleString()}` : '';
        title = `Match Scheduled — ${roundInfo}#${extra.match_number || ''}`;
        body = `A match has been scheduled${when}.${extra.notes ? `\n\nNotes: ${extra.notes}` : ''}`;
      } else if (eventType === 'started') {
        title = `Match Started! 🏆`;
        body = `The match has kicked off!${extra.round_name ? ` (${extra.round_name})` : ''}`;
      } else if (eventType === 'completed') {
        title = `Match Result — ${extra.round_name || 'Result Posted'}`;
        const summary = extra.result_summary ? JSON.stringify(extra.result_summary) : 'See match details for the full result.';
        body = `The match has concluded.\n\nResult: ${summary}`;
      } else if (eventType === 'cancelled') {
        title = `Match Cancelled`;
        body = `A match has been cancelled.${extra.notes ? `\n\nReason: ${extra.notes}` : ''}`;
      } else {
        return;
      }

      await query(
        `INSERT INTO posts (community_id, author_user_id, title, body, category)
         VALUES ($1, $2, $3, $4, 'event_announcement'::post_category_type)`,
        [communityId, requestingUserId, title, body]
      );
    } catch (err) {
      // Non-fatal: log but don't bubble up
      console.error('[MatchesService] Community announcement failed:', err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/tournaments/:tournamentId/matches
  // Requires visibility access (delegates to tournamentsService.getTournament)
  // ---------------------------------------------------------------------------
  async getTournamentMatches(tournamentId, requestingUser) {
    await tournamentsService.getTournament(tournamentId, requestingUser);

    const res = await query(`
      SELECT
        m.id,
        m.fixture_id,
        m.tournament_id,
        m.sport_id,
        m.ground_id,
        m.scheduled_at,
        m.started_at,
        m.ended_at,
        m.status,
        m.result_summary,
        m.winner_registration_id,
        m.notes,
        m.created_at,
        m.updated_at,
        f.round_number,
        f.round_name,
        f.match_number
      FROM matches m
      LEFT JOIN fixtures f ON m.fixture_id = f.id
      WHERE m.tournament_id = $1
      ORDER BY f.round_number ASC NULLS LAST, f.match_number ASC NULLS LAST, m.scheduled_at ASC NULLS LAST
    `, [tournamentId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET /api/matches/:matchId
  // Delegates visibility to tournamentsService for tournament matches
  // ---------------------------------------------------------------------------
  async getMatch(matchId, requestingUser) {
    const res = await query(`
      SELECT
        m.*,
        f.round_number,
        f.round_name,
        f.match_number
      FROM matches m
      LEFT JOIN fixtures f ON m.fixture_id = f.id
      WHERE m.id = $1
    `, [matchId]);

    if (!res.rows.length) {
      throw this._notFound('Match not found');
    }

    const match = res.rows[0];

    // Enforce tournament visibility rules for tournament matches
    if (match.tournament_id) {
      await tournamentsService.getTournament(match.tournament_id, requestingUser);
    }

    return match;
  }

  // ---------------------------------------------------------------------------
  // GET /api/matches/:matchId/participants
  // ---------------------------------------------------------------------------
  async getMatchParticipants(matchId, requestingUser) {
    await this.getMatch(matchId, requestingUser);

    const res = await query(`
      SELECT
        mp.id,
        mp.match_id,
        mp.registration_id,
        mp.team_id,
        mp.player_profile_id,
        mp.side,
        mp.score,
        mp.result,
        mp.created_at,
        t.name   AS team_name,
        pp.display_name,
        tr.registration_name
      FROM match_participants mp
      LEFT JOIN teams t                    ON mp.team_id          = t.id
      LEFT JOIN player_profiles pp         ON mp.player_profile_id = pp.id
      LEFT JOIN tournament_registrations tr ON mp.registration_id  = tr.id
      WHERE mp.match_id = $1
      ORDER BY mp.side ASC
    `, [matchId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // POST /api/tournaments/:tournamentId/matches/from-fixture/:fixtureId
  // Organizer (own tournament) or Admin only.
  // Validates: tournament owned, fixture belongs to tournament, no duplicate
  // match, participants are approved registrations from the same tournament.
  // Uses a single DB transaction.
  // ---------------------------------------------------------------------------
  async createMatchFromFixture(tournamentId, fixtureId, data, requestingUser) {
    // 1. Tournament visibility + ownership check
    const tournament = await tournamentsService.getTournament(tournamentId, requestingUser);

    const isAdmin       = requestingUser?.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser?.id === tournament.organizer_user_id;

    if (!isAdmin && !isOwnOrganizer) {
      throw this._forbidden('Only the organizer or an admin can create official matches');
    }

    // 2. Basic payload validation before touching the DB
    if (!data.participants || !Array.isArray(data.participants) || data.participants.length === 0) {
      throw this._badRequest('At least one participant is required');
    }

    const regIds = data.participants.map(p => p.registration_id).filter(Boolean);
    if (regIds.length !== data.participants.length) {
      throw this._badRequest('Every participant must include a registration_id');
    }

    if (new Set(regIds).size !== regIds.length) {
      throw this._badRequest('Duplicate registrations provided for participants');
    }

    for (const p of data.participants) {
      if (!['home', 'away'].includes(p.side)) {
        throw this._badRequest('Participant side must be "home" or "away"');
      }
    }

    // 3. Transactional write
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 3a. Verify fixture exists, belongs to this tournament, acquire row lock
      const fixRes = await client.query(
        'SELECT * FROM fixtures WHERE id = $1 FOR UPDATE',
        [fixtureId]
      );
      if (!fixRes.rows.length) {
        throw this._notFound('Fixture not found');
      }
      const fixture = fixRes.rows[0];
      if (fixture.tournament_id !== tournamentId) {
        throw this._badRequest('Fixture does not belong to the specified tournament');
      }

      // 3b. Prevent duplicate match for the same fixture
      const dupCheck = await client.query(
        'SELECT id FROM matches WHERE fixture_id = $1',
        [fixtureId]
      );
      if (dupCheck.rows.length > 0) {
        throw this._conflict('A match already exists for this fixture');
      }

      // 3c. Validate registrations — must all belong to this tournament, be approved
      const regRes = await client.query(`
        SELECT id, tournament_id, status, team_id, individual_player_profile_id
        FROM tournament_registrations
        WHERE id = ANY($1)
        FOR SHARE
      `, [regIds]);

      if (regRes.rows.length !== regIds.length) {
        throw this._badRequest('One or more registration_ids are invalid');
      }

      const registrationsMap = {};
      for (const reg of regRes.rows) {
        if (reg.tournament_id !== tournamentId) {
          throw this._badRequest(
            'Participant registration does not belong to this tournament'
          );
        }
        if (reg.status !== 'approved') {
          throw this._badRequest(
            `Registration ${reg.id} has status "${reg.status}"; only approved registrations may participate`
          );
        }
        registrationsMap[reg.id] = reg;
      }

      // 3d. Insert match record
      const matchRes = await client.query(`
        INSERT INTO matches (
          fixture_id,
          tournament_id,
          sport_id,
          ground_id,
          scheduled_at,
          status,
          recorded_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)
        RETURNING *
      `, [
        fixtureId,
        tournamentId,
        tournament.sport_id,
        fixture.ground_id   || null,
        fixture.scheduled_at || null,
        requestingUser.id
      ]);

      const match = matchRes.rows[0];

      // 3e. Insert match_participants
      for (const p of data.participants) {
        const reg = registrationsMap[p.registration_id];
        await client.query(`
          INSERT INTO match_participants (
            match_id,
            registration_id,
            team_id,
            player_profile_id,
            side
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          match.id,
          reg.id,
          reg.team_id                      || null,
          reg.individual_player_profile_id || null,
          p.side
        ]);
      }

      await client.query('COMMIT');
      // Fire-and-forget community announcement
      const fixtureInfo = fixRes.rows[0];
      this._postMatchAnnouncement(match, 'scheduled', requestingUser.id, {
        round_name: fixtureInfo.round_name,
        match_number: fixtureInfo.match_number,
        notes: match.notes
      });
      return match;

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // HELPER: Verify match authorization
  // ---------------------------------------------------------------------------
  async _verifyMatchAuthorization(match, requestingUser) {
    if (!match.tournament_id) {
      // For now, only tournament matches are supported. Casual games would be checked here.
      throw this._badRequest('Only tournament matches are currently supported for lifecycle events');
    }

    const tournament = await tournamentsService.getTournament(match.tournament_id, requestingUser);

    const isAdmin = requestingUser?.roles?.includes('ADMIN');
    const isOwnOrganizer = requestingUser?.id === tournament.organizer_user_id;

    if (!isAdmin && !isOwnOrganizer) {
      throw this._forbidden('Only the organizer or an admin can modify this match');
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/start
  // SCHEDULED -> in_progress
  // ---------------------------------------------------------------------------
  async startMatch(matchId, requestingUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const matchRes = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
      if (!matchRes.rows.length) {
        throw this._notFound('Match not found');
      }
      const match = matchRes.rows[0];

      await this._verifyMatchAuthorization(match, requestingUser);

      if (match.status !== 'scheduled') {
        throw this._badRequest(`Cannot start match from status "${match.status}"`);
      }

      const updateRes = await client.query(`
        UPDATE matches
        SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [matchId]);

      await client.query('COMMIT');
      const startedMatch = updateRes.rows[0];
      this._postMatchAnnouncement(startedMatch, 'started', requestingUser.id, {});
      return startedMatch;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/complete
  // in_progress -> completed
  // ---------------------------------------------------------------------------
  async completeMatch(matchId, data, requestingUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const matchRes = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
      if (!matchRes.rows.length) {
        throw this._notFound('Match not found');
      }
      const match = matchRes.rows[0];

      await this._verifyMatchAuthorization(match, requestingUser);

      if (match.status !== 'in_progress') {
        throw this._badRequest(`Cannot complete match from status "${match.status}"`);
      }

      // Validate winner if provided
      if (data.winner_registration_id) {
        const participantCheck = await client.query(
          'SELECT id FROM match_participants WHERE match_id = $1 AND registration_id = $2 FOR SHARE',
          [matchId, data.winner_registration_id]
        );
        if (!participantCheck.rows.length) {
          throw this._badRequest('Winner registration_id must be a participant in this match');
        }
      }

      // Update the match itself
      const updateMatchRes = await client.query(`
        UPDATE matches
        SET
          status = 'completed',
          ended_at = NOW(),
          result_summary = COALESCE($2, result_summary),
          winner_registration_id = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [
        matchId,
        data.result_summary ? JSON.stringify(data.result_summary) : null,
        data.winner_registration_id || null
      ]);

      // Update participants if data is provided
      if (data.participants && Array.isArray(data.participants)) {
        for (const p of data.participants) {
          if (!p.registration_id) continue;

          if (p.result && !['win', 'loss', 'draw', 'walkover', 'abandoned'].includes(p.result)) {
             throw this._badRequest(`Invalid participant result: ${p.result}`);
          }

          await client.query(`
            UPDATE match_participants
            SET
              score = COALESCE($1, score),
              result = COALESCE($2, result),
              updated_at = NOW()
            WHERE match_id = $3 AND registration_id = $4
          `, [
            p.score ? JSON.stringify(p.score) : null,
            p.result || null,
            matchId,
            p.registration_id
          ]);
        }
      }

      await client.query('COMMIT');
      const completedMatch = updateMatchRes.rows[0];
      this._postMatchAnnouncement(completedMatch, 'completed', requestingUser.id, {
        result_summary: data.result_summary
      });
      return completedMatch;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/matches/:matchId/cancel
  // scheduled -> cancelled
  // ---------------------------------------------------------------------------
  async cancelMatch(matchId, data, requestingUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const matchRes = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
      if (!matchRes.rows.length) {
        throw this._notFound('Match not found');
      }
      const match = matchRes.rows[0];

      await this._verifyMatchAuthorization(match, requestingUser);

      if (match.status !== 'scheduled') {
        throw this._badRequest(`Cannot cancel match from status "${match.status}"`);
      }

      // Append cancellation reason to notes or just replace if null
      let newNotes = match.notes;
      if (data.reason) {
        newNotes = newNotes ? `${newNotes}\nCancellation reason: ${data.reason}` : `Cancellation reason: ${data.reason}`;
      }

      const updateRes = await client.query(`
        UPDATE matches
        SET status = 'cancelled', notes = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [matchId, newNotes || null]);

      await client.query('COMMIT');
      const cancelledMatch = updateRes.rows[0];
      this._postMatchAnnouncement(cancelledMatch, 'cancelled', requestingUser.id, {
        notes: data.reason
      });
      return cancelledMatch;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new MatchesService();
