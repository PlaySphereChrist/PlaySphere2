const db = require('../../config/database');


class SportsService {
  /**
   * Get all active sports from the catalog.
   */
  async getActiveSports() {
    const { rows } = await db.query(
      `SELECT id, name, slug, description, min_players_per_team, max_players_per_team
       FROM sports
       WHERE is_active = true
       ORDER BY name ASC`
    );
    return rows;
  }

  /**
   * Internal helper to find a user's player profile ID safely.
   */
  async _getPlayerProfileId(userId) {
    const { rows } = await db.query(
      `SELECT id FROM player_profiles WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      const err = new Error('Player Profile not found. You must create a Player Profile first.');
      err.statusCode = 404;
      throw err;
    }
    return rows[0].id;
  }

  /**
   * Get all sport profiles for the authenticated user.
   */
  async getMySportProfiles(userId) {
    const playerProfileId = await this._getPlayerProfileId(userId);

    const { rows } = await db.query(
      `SELECT 
         psp.id, 
         psp.sport_id, 
         s.name as sport_name,
         s.slug as sport_slug,
         psp.position, 
         psp.skill_level, 
         psp.years_of_experience, 
         psp.is_primary,
         psp.created_at,
         psp.updated_at
       FROM player_sport_profiles psp
       JOIN sports s ON psp.sport_id = s.id
       WHERE psp.player_profile_id = $1
       ORDER BY psp.is_primary DESC, s.name ASC`,
      [playerProfileId]
    );

    return rows;
  }

  /**
   * Add a new sport profile for the authenticated user.
   */
  async addSportProfile(userId, sportData) {
    const playerProfileId = await this._getPlayerProfileId(userId);
    const { sport_id, position, skill_level, years_of_experience, is_primary } = sportData;

    // Check if the sport exists and is active
    const sportCheck = await db.query(`SELECT id FROM sports WHERE id = $1 AND is_active = true`, [sport_id]);
    if (sportCheck.rows.length === 0) {
      const err = new Error('Sport not found or inactive');
      err.statusCode = 404;
      throw err;
    }

    // Check for duplicates
    const duplicateCheck = await db.query(
      `SELECT id FROM player_sport_profiles WHERE player_profile_id = $1 AND sport_id = $2`,
      [playerProfileId, sport_id]
    );
    if (duplicateCheck.rows.length > 0) {
      const err = new Error('You already have a profile for this sport');
      err.statusCode = 409;
      throw err;
    }

    const { rows } = await db.query(
      `INSERT INTO player_sport_profiles 
        (player_profile_id, sport_id, position, skill_level, years_of_experience, is_primary)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, FALSE))
       RETURNING id, sport_id, position, skill_level, years_of_experience, is_primary, created_at, updated_at`,
      [playerProfileId, sport_id, position, skill_level, years_of_experience, is_primary]
    );

    return rows[0];
  }

  /**
   * Update an existing sport profile for the authenticated user.
   */
  async updateSportProfile(userId, sportProfileId, updateData) {
    const playerProfileId = await this._getPlayerProfileId(userId);

    // Verify ownership
    const checkOwnership = await db.query(
      `SELECT id FROM player_sport_profiles WHERE id = $1 AND player_profile_id = $2`,
      [sportProfileId, playerProfileId]
    );
    if (checkOwnership.rows.length === 0) {
      const err = new Error('Sport profile not found or does not belong to you');
      err.statusCode = 404;
      throw err;
    }

    const { position, skill_level, years_of_experience, is_primary } = updateData;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      values.push(position);
    }
    if (skill_level !== undefined) {
      updates.push(`skill_level = $${paramIndex++}`);
      values.push(skill_level);
    }
    if (years_of_experience !== undefined) {
      updates.push(`years_of_experience = $${paramIndex++}`);
      values.push(years_of_experience);
    }
    if (is_primary !== undefined) {
      updates.push(`is_primary = $${paramIndex++}`);
      values.push(is_primary);
    }

    if (updates.length === 0) {
      const { rows } = await db.query(
        `SELECT id, sport_id, position, skill_level, years_of_experience, is_primary, created_at, updated_at
         FROM player_sport_profiles WHERE id = $1`,
        [sportProfileId]
      );
      return rows[0];
    }

    values.push(sportProfileId);
    values.push(playerProfileId);

    const { rows } = await db.query(
      `UPDATE player_sport_profiles
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND player_profile_id = $${paramIndex + 1}
       RETURNING id, sport_id, position, skill_level, years_of_experience, is_primary, created_at, updated_at`,
      values
    );

    return rows[0];
  }

  /**
   * Delete an existing sport profile for the authenticated user.
   */
  async deleteSportProfile(userId, sportProfileId) {
    const playerProfileId = await this._getPlayerProfileId(userId);

    const { rowCount } = await db.query(
      `DELETE FROM player_sport_profiles 
       WHERE id = $1 AND player_profile_id = $2`,
      [sportProfileId, playerProfileId]
    );

    if (rowCount === 0) {
      const err = new Error('Sport profile not found or does not belong to you');
      err.statusCode = 404;
      throw err;
    }

    return { success: true };
  }
}

module.exports = new SportsService();
