const { query, pool } = require('../../config/database');

class CasualGamesService {
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

  _conflict(msg) {
    const e = new Error(msg);
    e.statusCode = 409;
    return e;
  }

  _forbidden(msg) {
    const e = new Error(msg);
    e.statusCode = 403;
    return e;
  }

  /**
   * List casual games with optional filters
   */
  async listGames(filters = {}) {
    let sql = `
      SELECT cg.*, 
             s.name as sport_name,
             u.id as creator_id,
             COALESCE(pp.display_name, split_part(u.email, '@', 1)) as creator_name,
             (SELECT COUNT(*) FROM casual_game_participants WHERE casual_game_id = cg.id AND status = 'joined')::int as current_participants
      FROM casual_games cg
      JOIN sports s ON cg.sport_id = s.id
      JOIN users u ON cg.organized_by_user_id = u.id
      LEFT JOIN player_profiles pp ON u.id = pp.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.sport_id) {
      params.push(filters.sport_id);
      sql += ` AND cg.sport_id = $${params.length}`;
    }

    if (filters.status) {
      params.push(filters.status);
      sql += ` AND cg.status = $${params.length}`;
    } else {
      sql += ` AND cg.status = 'open'`; // Default
    }

    if (filters.skill_level) {
      params.push(filters.skill_level);
      sql += ` AND cg.skill_level = $${params.length}`;
    }

    if (filters.date) {
      params.push(filters.date);
      sql += ` AND DATE(cg.scheduled_at AT TIME ZONE 'UTC') = $${params.length}`;
    }

    sql += ` ORDER BY cg.scheduled_at ASC`;

    const res = await query(sql, params);
    return res.rows;
  }

  /**
   * Get a specific casual game with participant list
   */
  async getGame(gameId) {
    const res = await query(`
      SELECT cg.*, 
             s.name as sport_name,
             u.id as creator_id,
             COALESCE(pp.display_name, split_part(u.email, '@', 1)) as creator_name,
             (SELECT COUNT(*) FROM casual_game_participants WHERE casual_game_id = cg.id AND status = 'joined')::int as current_participants
      FROM casual_games cg
      JOIN sports s ON cg.sport_id = s.id
      JOIN users u ON cg.organized_by_user_id = u.id
      LEFT JOIN player_profiles pp ON u.id = pp.user_id
      WHERE cg.id = $1
    `, [gameId]);

    if (!res.rows.length) throw this._notFound('Casual game not found');
    const game = res.rows[0];

    const participantsRes = await query(`
      SELECT p.id as participant_id,
             p.user_id,
             p.joined_at,
             p.status,
             COALESCE(pp.display_name, split_part(u.email, '@', 1)) as user_name,
             pp.avatar_url,
             psp.skill_level as player_skill_level
      FROM casual_game_participants p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN player_profiles pp ON u.id = pp.user_id
      LEFT JOIN player_sport_profiles psp ON pp.id = psp.player_profile_id AND psp.sport_id = $2
      WHERE p.casual_game_id = $1 AND p.status = 'joined'
      ORDER BY p.joined_at ASC
    `, [gameId, game.sport_id]);

    game.participants = participantsRes.rows;
    return game;
  }

  /**
   * Create a casual game
   */
  async createGame(userId, data) {
    const {
      sport_id, title, description, game_date, start_time,
      location_name, latitude, longitude, max_players, skill_level
    } = data;

    if (!sport_id || !title || !game_date || !start_time || !location_name || !max_players || !skill_level) {
      throw this._badRequest('Missing required fields');
    }
    
    if (max_players <= 0) {
      throw this._badRequest('Max players must be greater than 0');
    }

    const validSkills = ['Beginner', 'Intermediate', 'Expert', 'Professional'];
    if (!validSkills.includes(skill_level)) {
      throw this._badRequest('Invalid skill level');
    }

    // Validate sport exists
    const sportRes = await query('SELECT id FROM sports WHERE id = $1', [sport_id]);
    if (!sportRes.rows.length) throw this._badRequest('Sport not found');

    const scheduledAt = new Date(`${game_date}T${start_time}:00Z`);
    if (isNaN(scheduledAt.getTime())) {
      throw this._badRequest('Invalid date/time');
    }
    
    if (scheduledAt < new Date()) {
      throw this._badRequest('Cannot schedule a game in the past');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertGameSQL = `
        INSERT INTO casual_games (
          sport_id, organized_by_user_id, title, description,
          scheduled_at, max_participants, is_private, status,
          location_name, latitude, longitude, skill_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;
      const gameRes = await client.query(insertGameSQL, [
        sport_id, userId, title, description,
        scheduledAt, max_players, false, 'open',
        location_name, latitude || null, longitude || null, skill_level
      ]);
      const gameId = gameRes.rows[0].id;

      // Creator automatically joins
      const profileRes = await client.query('SELECT id FROM player_profiles WHERE user_id = $1', [userId]);
      const profileId = profileRes.rows.length ? profileRes.rows[0].id : null;

      await client.query(`
        INSERT INTO casual_game_participants (casual_game_id, user_id, player_profile_id, status)
        VALUES ($1, $2, $3, 'joined')
      `, [gameId, userId, profileId]);

      await client.query('COMMIT');
      return await this.getGame(gameId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update casual game
   */
  async updateGame(gameId, userId, data) {
    const game = await this.getGame(gameId);
    if (game.organized_by_user_id !== userId) {
      throw this._forbidden('Only the creator can edit this game');
    }

    if (game.status !== 'open' && game.status !== 'full') {
      throw this._badRequest('Cannot edit a game that is cancelled or completed');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (data.title) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.location_name) {
      fields.push(`location_name = $${idx++}`);
      values.push(data.location_name);
    }
    if (data.latitude !== undefined) {
      fields.push(`latitude = $${idx++}`);
      values.push(data.latitude || null);
    }
    if (data.longitude !== undefined) {
      fields.push(`longitude = $${idx++}`);
      values.push(data.longitude || null);
    }
    if (data.skill_level) {
      const validSkills = ['Beginner', 'Intermediate', 'Expert', 'Professional'];
      if (!validSkills.includes(data.skill_level)) throw this._badRequest('Invalid skill level');
      fields.push(`skill_level = $${idx++}`);
      values.push(data.skill_level);
    }
    
    if (data.game_date && data.start_time) {
      const scheduledAt = new Date(`${data.game_date}T${data.start_time}:00Z`);
      if (isNaN(scheduledAt.getTime())) throw this._badRequest('Invalid date/time');
      fields.push(`scheduled_at = $${idx++}`);
      values.push(scheduledAt);
    }

    if (data.max_players !== undefined) {
      if (data.max_players <= 0) {
        throw this._badRequest('Max players must be greater than 0');
      }
      if (data.max_players < game.current_participants) {
        throw this._badRequest(`Cannot reduce max players below current participants (${game.current_participants})`);
      }
      fields.push(`max_participants = $${idx++}`);
      values.push(data.max_players);
      
      if (data.max_players > game.current_participants && game.status === 'full') {
        fields.push(`status = $${idx++}`);
        values.push('open');
      } else if (data.max_players === game.current_participants) {
        fields.push(`status = $${idx++}`);
        values.push('full');
      }
    }

    if (fields.length === 0) return game;

    values.push(gameId);
    await query(`UPDATE casual_games SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    return await this.getGame(gameId);
  }

  /**
   * Cancel casual game
   */
  async cancelGame(gameId, userId) {
    const game = await this.getGame(gameId);
    if (game.organized_by_user_id !== userId) {
      throw this._forbidden('Only the creator can cancel this game');
    }
    if (game.status === 'cancelled' || game.status === 'completed') {
      throw this._badRequest('Game is already cancelled or completed');
    }

    await query(`UPDATE casual_games SET status = 'cancelled' WHERE id = $1`, [gameId]);
    return { success: true, message: 'Game cancelled successfully' };
  }

  /**
   * Join a casual game
   */
  async joinGame(gameId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock row to prevent race conditions on max_participants check
      const gameRes = await client.query(`SELECT status, max_participants FROM casual_games WHERE id = $1 FOR UPDATE`, [gameId]);
      if (!gameRes.rows.length) throw this._notFound('Game not found');
      
      const game = gameRes.rows[0];
      if (game.status !== 'open') {
        throw this._conflict(`Cannot join game. Status is ${game.status}`);
      }

      // Check if already joined
      const joinedRes = await client.query(`SELECT status FROM casual_game_participants WHERE casual_game_id = $1 AND user_id = $2`, [gameId, userId]);
      if (joinedRes.rows.length && joinedRes.rows[0].status === 'joined') {
        throw this._conflict('Already joined this game');
      }

      const countRes = await client.query(`SELECT COUNT(*) FROM casual_game_participants WHERE casual_game_id = $1 AND status = 'joined'`, [gameId]);
      const currentParticipants = parseInt(countRes.rows[0].count, 10);

      if (currentParticipants >= game.max_participants) {
        // Auto mark as full
        await client.query(`UPDATE casual_games SET status = 'full' WHERE id = $1`, [gameId]);
        throw this._conflict('Game is full');
      }

      const profileRes = await client.query('SELECT id FROM player_profiles WHERE user_id = $1', [userId]);
      const profileId = profileRes.rows.length ? profileRes.rows[0].id : null;

      if (joinedRes.rows.length) {
        await client.query(`UPDATE casual_game_participants SET status = 'joined', player_profile_id = $3 WHERE casual_game_id = $1 AND user_id = $2`, [gameId, userId, profileId]);
      } else {
        await client.query(`INSERT INTO casual_game_participants (casual_game_id, user_id, player_profile_id, status) VALUES ($1, $2, $3, 'joined')`, [gameId, userId, profileId]);
      }

      // Check if now full
      if (currentParticipants + 1 >= game.max_participants) {
        await client.query(`UPDATE casual_games SET status = 'full' WHERE id = $1`, [gameId]);
      }

      await client.query('COMMIT');
      return { success: true, message: 'Successfully joined game' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Leave a casual game
   */
  async leaveGame(gameId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const gameRes = await client.query(`SELECT organized_by_user_id, status FROM casual_games WHERE id = $1 FOR UPDATE`, [gameId]);
      if (!gameRes.rows.length) throw this._notFound('Game not found');
      
      const game = gameRes.rows[0];
      if (game.status === 'completed' || game.status === 'cancelled') {
        throw this._badRequest('Cannot leave a completed or cancelled game');
      }

      if (game.organized_by_user_id === userId) {
        throw this._badRequest('Creator cannot leave the game. You must cancel the game instead.');
      }

      const joinedRes = await client.query(`SELECT status FROM casual_game_participants WHERE casual_game_id = $1 AND user_id = $2`, [gameId, userId]);
      if (!joinedRes.rows.length || joinedRes.rows[0].status !== 'joined') {
        throw this._badRequest('You are not currently in this game');
      }

      // Mark as cancelled for this participant
      await client.query(`UPDATE casual_game_participants SET status = 'cancelled' WHERE casual_game_id = $1 AND user_id = $2`, [gameId, userId]);
      
      if (game.status === 'full') {
        await client.query(`UPDATE casual_games SET status = 'open' WHERE id = $1`, [gameId]);
      }

      await client.query('COMMIT');
      return { success: true, message: 'Successfully left the game' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new CasualGamesService();
