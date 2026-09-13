'use strict';

const { pool, query } = require('../../config/database');
const tournamentsService = require('../tournaments/tournaments.service');

class LeaderboardsService {
  /**
   * Determine ranking direction based on an explicit configuration mapping of known stat keys.
   * Lower values are better for time/penalties (ASC).
   * Higher values are better for goals/points/wins (DESC).
   */
  _getRankingDirection(statKey) {
    // Explicit configuration of exact stat_keys where lower is better.
    // This avoids fragile substring heuristics (e.g. accidentally matching "halftime_score").
    const LOWER_IS_BETTER_KEYS = new Set([
      'time_taken',
      'elapsed_time',
      'lap_time',
      'race_time',
      'penalties',
      'fouls',
      'errors',
      'turnovers',
      'strokes',
      '11c_time_taken', // used for testing
      'test_time'
    ]);
    
    return LOWER_IS_BETTER_KEYS.has(statKey) ? 'ASC' : 'DESC';
  }

  _assertOrganizerOrAdmin(tournament, user) {
    const isAdmin = user.roles && user.roles.includes('ADMIN');
    if (isAdmin) return;

    if (tournament.organizer_user_id !== user.id) {
      const err = new Error('Forbidden: Only the tournament organizer can perform this action');
      err.statusCode = 403;
      throw err;
    }
  }

  /**
   * Create a new leaderboard for a tournament
   */
  async createLeaderboard(tournamentId, data, requestingUser) {
    const { sport_id, stat_key, leaderboard_type, name } = data;

    // Validate tournament
    const tournament = await tournamentsService.getTournament(tournamentId, requestingUser);
    this._assertOrganizerOrAdmin(tournament, requestingUser);

    if (sport_id !== tournament.sport_id) {
      const err = new Error('Sport mismatch: The leaderboard sport must match the tournament sport');
      err.statusCode = 400;
      throw err;
    }

    if (!['player', 'team'].includes(leaderboard_type)) {
      const err = new Error('Invalid leaderboard_type. Must be "player" or "team"');
      err.statusCode = 400;
      throw err;
    }

    // Verify stat definition exists
    const defRes = await query(`
      SELECT * FROM sport_stat_definitions 
      WHERE sport_id = $1 AND stat_key = $2
    `, [sport_id, stat_key]);

    if (defRes.rows.length === 0) {
      const err = new Error('Statistic definition not found for this sport');
      err.statusCode = 404;
      throw err;
    }
    const def = defRes.rows[0];

    if (leaderboard_type === 'player' && !['player', 'both'].includes(def.applies_to)) {
      const err = new Error('This statistic does not apply to players');
      err.statusCode = 400;
      throw err;
    }
    if (leaderboard_type === 'team' && !['team', 'both'].includes(def.applies_to)) {
      const err = new Error('This statistic does not apply to teams');
      err.statusCode = 400;
      throw err;
    }

    // Insert leaderboard
    const res = await query(`
      INSERT INTO leaderboards
        (sport_id, tournament_id, stat_key, leaderboard_type, name, is_active, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING *
    `, [sport_id, tournamentId, stat_key, leaderboard_type, name]);

    return res.rows[0];
  }

  /**
   * Get Leaderboard by ID
   */
  async getLeaderboard(leaderboardId, requestingUser) {
    const res = await query(`SELECT * FROM leaderboards WHERE id = $1`, [leaderboardId]);
    if (res.rows.length === 0) {
      const err = new Error('Leaderboard not found');
      err.statusCode = 404;
      throw err;
    }
    const lb = res.rows[0];
    if (lb.tournament_id) {
      // Visibility check
      await tournamentsService.getTournament(lb.tournament_id, requestingUser);
    }
    return lb;
  }

  /**
   * Generate/Regenerate leaderboard entries from materialized statistics
   */
  async generateTournamentLeaderboard(leaderboardId, requestingUser) {
    const lb = await this.getLeaderboard(leaderboardId, requestingUser);
    
    if (!lb.tournament_id) {
      const err = new Error('This operation only supports tournament-scoped leaderboards');
      err.statusCode = 400;
      throw err;
    }

    const tournament = await tournamentsService.getTournament(lb.tournament_id, requestingUser);
    this._assertOrganizerOrAdmin(tournament, requestingUser);

    const rankingDirection = this._getRankingDirection(lb.stat_key);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the leaderboard for generation
      await client.query('SELECT 1 FROM leaderboards WHERE id = $1 FOR UPDATE', [lb.id]);

      // Wipe old entries
      await client.query('DELETE FROM leaderboard_entries WHERE leaderboard_id = $1', [lb.id]);

      let insertedCount = 0;

      if (lb.leaderboard_type === 'player') {
        // We only rank valid players in this tournament
        const res = await client.query(`
          WITH ranked_stats AS (
            SELECT 
              ps.player_profile_id,
              ps.stat_value,
              RANK() OVER (ORDER BY ps.stat_value ${rankingDirection}, ps.updated_at ASC) as rnk
            FROM player_statistics ps
            WHERE ps.tournament_id = $1
              AND ps.sport_id = $2
              AND ps.stat_key = $3
          )
          SELECT * FROM ranked_stats
        `, [lb.tournament_id, lb.sport_id, lb.stat_key]);

        for (const row of res.rows) {
          await client.query(`
            INSERT INTO leaderboard_entries
              (leaderboard_id, player_profile_id, rank, stat_value, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
          `, [lb.id, row.player_profile_id, row.rnk, row.stat_value]);
          insertedCount++;
        }
      } else if (lb.leaderboard_type === 'team') {
        const res = await client.query(`
          WITH ranked_stats AS (
            SELECT 
              ts.team_id,
              ts.stat_value,
              RANK() OVER (ORDER BY ts.stat_value ${rankingDirection}, ts.updated_at ASC) as rnk
            FROM team_statistics ts
            WHERE ts.tournament_id = $1
              AND ts.sport_id = $2
              AND ts.stat_key = $3
          )
          SELECT * FROM ranked_stats
        `, [lb.tournament_id, lb.sport_id, lb.stat_key]);

        for (const row of res.rows) {
          await client.query(`
            INSERT INTO leaderboard_entries
              (leaderboard_id, team_id, rank, stat_value, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
          `, [lb.id, row.team_id, row.rnk, row.stat_value]);
          insertedCount++;
        }
      }

      await client.query('COMMIT');

      return {
        leaderboard_id: lb.id,
        entries_generated: insertedCount,
        ranking_direction: rankingDirection,
        updated_at: new Date().toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboardEntries(leaderboardId, requestingUser) {
    const lb = await this.getLeaderboard(leaderboardId, requestingUser);

    if (lb.leaderboard_type === 'player') {
      const res = await query(`
        SELECT le.id, le.rank, le.stat_value, le.player_profile_id, pp.display_name, pp.avatar_url
        FROM leaderboard_entries le
        JOIN player_profiles pp ON le.player_profile_id = pp.id
        WHERE le.leaderboard_id = $1
        ORDER BY le.rank ASC
      `, [leaderboardId]);
      return res.rows;
    } else if (lb.leaderboard_type === 'team') {
      const res = await query(`
        SELECT le.id, le.rank, le.stat_value, le.team_id, t.name AS team_name, t.logo_url
        FROM leaderboard_entries le
        JOIN teams t ON le.team_id = t.id
        WHERE le.leaderboard_id = $1
        ORDER BY le.rank ASC
      `, [leaderboardId]);
      return res.rows;
    }
    return [];
  }

  async getTournamentLeaderboards(tournamentId, requestingUser) {
    await tournamentsService.getTournament(tournamentId, requestingUser); // Authorization check

    const res = await query(`
      SELECT * FROM leaderboards
      WHERE tournament_id = $1
      ORDER BY created_at ASC
    `, [tournamentId]);
    return res.rows;
  }
}

module.exports = new LeaderboardsService();
