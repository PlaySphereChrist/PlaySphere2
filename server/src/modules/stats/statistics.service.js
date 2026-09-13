'use strict';

const { pool, query } = require('../../config/database');
const tournamentsService = require('../tournaments/tournaments.service');

class StatisticsService {

  // ---------------------------------------------------------------------------
  // Error helpers (matching project conventions)
  // ---------------------------------------------------------------------------
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

  _badRequest(msg) {
    const e = new Error(msg);
    e.statusCode = 400;
    return e;
  }

  // ---------------------------------------------------------------------------
  // Authorization helpers
  // ---------------------------------------------------------------------------
  _isAdmin(user) {
    return user?.roles?.includes('ADMIN');
  }

  _isOwnOrganizer(tournament, user) {
    return user?.id === tournament.organizer_user_id;
  }

  _assertOrganizerOrAdmin(tournament, user) {
    if (!this._isAdmin(user) && !this._isOwnOrganizer(tournament, user)) {
      throw this._forbidden('Only the tournament organizer or an admin can perform this action');
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/statistics/tournaments/:tournamentId/players
  //
  // Returns all player statistics derived from performance events
  // for all official matches in the specified tournament.
  //
  // Reads from the materialized player_statistics table.
  // Scoped to the given tournament. No casual-game data included.
  // ---------------------------------------------------------------------------
  async getTournamentPlayerStatistics(tournamentId, requestingUser) {
    // Verify tournament exists and is accessible (uses existing tournament visibility rules)
    await tournamentsService.getTournament(tournamentId, requestingUser);

    const res = await query(`
      SELECT
        ps.id,
        ps.player_profile_id,
        ps.sport_id,
        ps.tournament_id,
        ps.stat_key,
        ps.stat_value,
        ps.computed_at,
        pp.display_name,
        pp.avatar_url,
        s.name AS sport_name,
        ssd.stat_name,
        ssd.description AS stat_description,
        ssd.data_type,
        ssd.is_cumulative,
        ssd.applies_to
      FROM player_statistics ps
      JOIN player_profiles pp ON ps.player_profile_id = pp.id
      JOIN sports s ON ps.sport_id = s.id
      LEFT JOIN sport_stat_definitions ssd
        ON ssd.sport_id = ps.sport_id AND ssd.stat_key = ps.stat_key
      WHERE ps.tournament_id = $1
      ORDER BY pp.display_name, ps.stat_key
    `, [tournamentId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET /api/statistics/tournaments/:tournamentId/players/:playerProfileId
  //
  // Returns statistics for a specific player within a specific tournament.
  // ---------------------------------------------------------------------------
  async getTournamentPlayerStatisticsById(tournamentId, playerProfileId, requestingUser) {
    await tournamentsService.getTournament(tournamentId, requestingUser);

    // Verify the player exists
    const playerCheck = await query(
      'SELECT id, display_name FROM player_profiles WHERE id = $1',
      [playerProfileId]
    );
    if (!playerCheck.rows.length) {
      throw this._notFound('Player profile not found');
    }

    const res = await query(`
      SELECT
        ps.id,
        ps.player_profile_id,
        ps.sport_id,
        ps.tournament_id,
        ps.stat_key,
        ps.stat_value,
        ps.computed_at,
        pp.display_name,
        pp.avatar_url,
        s.name AS sport_name,
        ssd.stat_name,
        ssd.description AS stat_description,
        ssd.data_type,
        ssd.is_cumulative,
        ssd.applies_to
      FROM player_statistics ps
      JOIN player_profiles pp ON ps.player_profile_id = pp.id
      JOIN sports s ON ps.sport_id = s.id
      LEFT JOIN sport_stat_definitions ssd
        ON ssd.sport_id = ps.sport_id AND ssd.stat_key = ps.stat_key
      WHERE ps.tournament_id = $1
        AND ps.player_profile_id = $2
      ORDER BY ps.stat_key
    `, [tournamentId, playerProfileId]);

    return {
      player: playerCheck.rows[0],
      statistics: res.rows
    };
  }

  // ---------------------------------------------------------------------------
  // GET /api/statistics/tournaments/:tournamentId/teams
  //
  // Returns team statistics for the given tournament.
  // ---------------------------------------------------------------------------
  async getTournamentTeamStatistics(tournamentId, requestingUser) {
    await tournamentsService.getTournament(tournamentId, requestingUser);

    const res = await query(`
      SELECT
        ts.id,
        ts.team_id,
        ts.sport_id,
        ts.tournament_id,
        ts.stat_key,
        ts.stat_value,
        ts.computed_at,
        t.name AS team_name,
        t.logo_url,
        s.name AS sport_name,
        ssd.stat_name,
        ssd.description AS stat_description,
        ssd.data_type,
        ssd.is_cumulative,
        ssd.applies_to
      FROM team_statistics ts
      JOIN teams t ON ts.team_id = t.id
      JOIN sports s ON ts.sport_id = s.id
      LEFT JOIN sport_stat_definitions ssd
        ON ssd.sport_id = ts.sport_id AND ssd.stat_key = ts.stat_key
      WHERE ts.tournament_id = $1
      ORDER BY t.name, ts.stat_key
    `, [tournamentId]);

    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // GET /api/statistics/players/:playerProfileId
  //
  // Returns all tournament statistics for a single player profile,
  // across all tournaments visible to the requesting user.
  // ---------------------------------------------------------------------------
  async getPlayerStatistics(playerProfileId, requestingUser) {
    // Verify the player profile exists
    const playerCheck = await query(
      'SELECT id, display_name, avatar_url FROM player_profiles WHERE id = $1',
      [playerProfileId]
    );
    if (!playerCheck.rows.length) {
      throw this._notFound('Player profile not found');
    }

    // Build the visibility filter for tournaments inline
    const isAdmin = this._isAdmin(requestingUser);
    const isOrganizer = requestingUser?.roles?.includes('ORGANIZER');

    let tournamentFilter = `t.status IN ('registration_open','registration_closed','in_progress','completed')`;
    const params = [playerProfileId];
    if (isAdmin) {
      // Admins see all
      tournamentFilter = '1=1';
    } else if (isOrganizer) {
      params.push(requestingUser.id);
      tournamentFilter = `(t.organizer_user_id = $${params.length} OR t.status IN ('registration_open','registration_closed','in_progress','completed'))`;
    }

    const res = await query(`
      SELECT
        ps.id,
        ps.player_profile_id,
        ps.sport_id,
        ps.tournament_id,
        ps.stat_key,
        ps.stat_value,
        ps.computed_at,
        s.name AS sport_name,
        t.name AS tournament_name,
        t.status AS tournament_status,
        ssd.stat_name,
        ssd.description AS stat_description,
        ssd.data_type,
        ssd.is_cumulative,
        ssd.applies_to
      FROM player_statistics ps
      JOIN sports s ON ps.sport_id = s.id
      LEFT JOIN tournaments t ON ps.tournament_id = t.id
      LEFT JOIN sport_stat_definitions ssd
        ON ssd.sport_id = ps.sport_id AND ssd.stat_key = ps.stat_key
      WHERE ps.player_profile_id = $1
        AND (ps.tournament_id IS NULL OR (${tournamentFilter}))
      ORDER BY ps.tournament_id, ps.stat_key
    `, params);

    return {
      player: playerCheck.rows[0],
      statistics: res.rows
    };
  }

  // ---------------------------------------------------------------------------
  // GET /api/statistics/matches/:matchId
  //
  // Returns performance events and derived stats for a single match.
  // This does NOT read from the materialized tables — it reads live from
  // performance_events + performance_event_players, so it always reflects
  // the current authoritative source of truth.
  // ---------------------------------------------------------------------------
  async getMatchStatistics(matchId, requestingUser) {
    // Verify the match exists and is accessible
    const matchRes = await query(
      `SELECT m.*, t.organizer_user_id, t.status AS tournament_status
       FROM matches m
       LEFT JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.id = $1`,
      [matchId]
    );
    if (!matchRes.rows.length) throw this._notFound('Match not found');
    const match = matchRes.rows[0];

    // Only official tournament matches have statistics
    if (!match.tournament_id) {
      throw this._badRequest('Statistics are only available for official tournament matches');
    }

    // Verify tournament is visible to the requesting user
    await tournamentsService.getTournament(match.tournament_id, requestingUser);

    // Aggregate performance events for this match
    const res = await query(`
      SELECT
        pe.id AS event_id,
        pe.sport_stat_definition_id,
        pe.event_time_seconds,
        pe.recorded_at,
        ssd.stat_key,
        ssd.stat_name,
        ssd.data_type,
        ssd.is_cumulative,
        ssd.applies_to,
        pep.player_profile_id,
        pep.team_id,
        pep.value,
        pp.display_name AS player_name,
        t.name AS team_name
      FROM performance_events pe
      JOIN sport_stat_definitions ssd ON pe.sport_stat_definition_id = ssd.id
      JOIN performance_event_players pep ON pep.performance_event_id = pe.id
      LEFT JOIN player_profiles pp ON pep.player_profile_id = pp.id
      LEFT JOIN teams t ON pep.team_id = t.id
      WHERE pe.match_id = $1
      ORDER BY pe.recorded_at, ssd.stat_key
    `, [matchId]);

    // Produce a summary grouped by player + stat
    const summaryMap = {};
    for (const row of res.rows) {
      const key = `${row.player_profile_id}:${row.stat_key}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          player_profile_id: row.player_profile_id,
          player_name: row.player_name,
          team_id: row.team_id,
          team_name: row.team_name,
          stat_key: row.stat_key,
          stat_name: row.stat_name,
          data_type: row.data_type,
          is_cumulative: row.is_cumulative,
          applies_to: row.applies_to,
          total: 0,
          event_count: 0
        };
      }
      const entry = summaryMap[key];
      entry.event_count++;
      if (row.is_cumulative) {
        entry.total += Number(row.value || 0);
      } else {
        // For non-cumulative: use the latest value
        entry.total = Number(row.value || 0);
      }
    }

    return {
      match_id: matchId,
      events: res.rows,
      summary: Object.values(summaryMap)
    };
  }

  // ---------------------------------------------------------------------------
  // POST /api/statistics/tournaments/:tournamentId/recalculate
  //
  // Organizer (own tournament) or Admin only.
  //
  // Recalculates and materializes player_statistics and team_statistics
  // for a given tournament from authoritative performance events.
  //
  // Algorithm:
  //   1. Validate tournament.
  //   2. Find all OFFICIAL tournament matches (WHERE matches.tournament_id = $1
  //      AND matches.casual_game_id IS NULL).
  //   3. Read performance_events + performance_event_players for those matches.
  //   4. Join to sport_stat_definitions to get aggregation semantics.
  //   5. For is_cumulative=true: SUM all values per player+stat+tournament.
  //      For is_cumulative=false: use the value from the most recent event.
  //   6. UPSERT into player_statistics using the existing unique index.
  //   7. For team-level stats (applies_to='team'), UPSERT into team_statistics
  //      using the team_id stored in performance_event_players.
  //   8. All within a single serializable transaction — idempotent.
  //
  // Performance events are NEVER deleted.
  // Matches, registrations, and player records are NEVER modified.
  // ---------------------------------------------------------------------------
  async recalculateTournamentStatistics(tournamentId, requestingUser) {
    // 1. Validate tournament existence + authorization
    const tournament = await tournamentsService.getTournament(tournamentId, requestingUser);
    this._assertOrganizerOrAdmin(tournament, requestingUser);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Fetch the sport_id for the tournament (needed for player_statistics.sport_id)
      const sportId = tournament.sport_id;

      // 3. Aggregate player-level stats from performance events
      //    Only official tournament matches (tournament_id = $1, casual_game_id IS NULL)
      //    For is_cumulative=true: SUM values.
      //    For is_cumulative=false: take value from the event with the latest recorded_at.
      const playerAggRes = await client.query(`
        WITH ordered_events AS (
          SELECT
            pep.player_profile_id,
            ssd.stat_key,
            ssd.stat_name,
            ssd.is_cumulative,
            ssd.applies_to,
            pep.value,
            pe.recorded_at,
            ROW_NUMBER() OVER (
              PARTITION BY pep.player_profile_id, ssd.stat_key
              ORDER BY pe.recorded_at DESC
            ) AS rn
          FROM performance_events pe
          JOIN sport_stat_definitions ssd ON pe.sport_stat_definition_id = ssd.id
          JOIN performance_event_players pep ON pep.performance_event_id = pe.id
          JOIN matches m ON pe.match_id = m.id
          WHERE m.tournament_id = $1
            AND m.casual_game_id IS NULL
            AND ssd.applies_to IN ('player', 'both')
        )
        SELECT
          player_profile_id,
          stat_key,
          is_cumulative,
          CASE
            WHEN is_cumulative THEN SUM(COALESCE(value, 0))
            ELSE MAX(value) FILTER (WHERE rn = 1)
          END AS aggregated_value,
          NOW() AS computed_at
        FROM ordered_events
        GROUP BY player_profile_id, stat_key, is_cumulative
      `, [tournamentId]);

      // 4. Upsert player statistics
      let playerUpsertCount = 0;
      for (const row of playerAggRes.rows) {
        await client.query(`
          INSERT INTO player_statistics
            (player_profile_id, sport_id, tournament_id, stat_key, stat_value, computed_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (player_profile_id, sport_id, stat_key, COALESCE((tournament_id)::text, 'NULL'::text), COALESCE((season_year)::text, 'NULL'::text))
          DO UPDATE SET
            stat_value  = EXCLUDED.stat_value,
            computed_at = EXCLUDED.computed_at,
            updated_at  = NOW()
        `, [
          row.player_profile_id,
          sportId,
          tournamentId,
          row.stat_key,
          row.aggregated_value !== null ? row.aggregated_value : 0,
          row.computed_at
        ]);
        playerUpsertCount++;
      }

      // 5. Aggregate team-level stats from performance_event_players.team_id
      //    Only for applies_to IN ('team','both') stat definitions
      const teamAggRes = await client.query(`
        WITH ordered_team_events AS (
          SELECT
            pep.team_id,
            ssd.stat_key,
            ssd.is_cumulative,
            ssd.applies_to,
            pep.value,
            pe.recorded_at,
            ROW_NUMBER() OVER (
              PARTITION BY pep.team_id, ssd.stat_key
              ORDER BY pe.recorded_at DESC
            ) AS rn
          FROM performance_events pe
          JOIN sport_stat_definitions ssd ON pe.sport_stat_definition_id = ssd.id
          JOIN performance_event_players pep ON pep.performance_event_id = pe.id
          JOIN matches m ON pe.match_id = m.id
          WHERE m.tournament_id = $1
            AND m.casual_game_id IS NULL
            AND pep.team_id IS NOT NULL
            AND ssd.applies_to IN ('team', 'both')
        )
        SELECT
          team_id,
          stat_key,
          is_cumulative,
          CASE
            WHEN is_cumulative THEN SUM(COALESCE(value, 0))
            ELSE MAX(value) FILTER (WHERE rn = 1)
          END AS aggregated_value,
          NOW() AS computed_at
        FROM ordered_team_events
        GROUP BY team_id, stat_key, is_cumulative
      `, [tournamentId]);

      let teamUpsertCount = 0;
      for (const row of teamAggRes.rows) {
        await client.query(`
          INSERT INTO team_statistics
            (team_id, sport_id, tournament_id, stat_key, stat_value, computed_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (team_id, sport_id, stat_key, COALESCE((tournament_id)::text, 'NULL'::text), COALESCE((season_year)::text, 'NULL'::text))
          DO UPDATE SET
            stat_value  = EXCLUDED.stat_value,
            computed_at = EXCLUDED.computed_at,
            updated_at  = NOW()
        `, [
          row.team_id,
          sportId,
          tournamentId,
          row.stat_key,
          row.aggregated_value !== null ? row.aggregated_value : 0,
          row.computed_at
        ]);
        teamUpsertCount++;
      }

      await client.query('COMMIT');

      return {
        tournament_id: tournamentId,
        player_statistics_upserted: playerUpsertCount,
        team_statistics_upserted: teamUpsertCount,
        computed_at: new Date().toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new StatisticsService();
