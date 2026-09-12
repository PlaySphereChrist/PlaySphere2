const db = require('../../config/database');

class TeamsService {
  /**
   * Get teams relevant to the authenticated user.
   * Teams they manage OR teams they are members of.
   */
  async getMyTeams(userId) {
    const { rows } = await db.query(
      `SELECT DISTINCT t.id, t.name, t.sport_id, s.name as sport_name, 
              t.manager_user_id, t.logo_url, t.description, t.city, t.is_active,
              (t.manager_user_id = $1) as is_manager
       FROM teams t
       JOIN sports s ON t.sport_id = s.id
       LEFT JOIN player_profiles pp ON pp.user_id = $1
       LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.player_profile_id = pp.id AND tm.is_active = true
       WHERE t.manager_user_id = $1 OR tm.id IS NOT NULL
       ORDER BY t.name ASC`,
      [userId]
    );
    return rows;
  }

  async getTeamById(teamId) {
    const { rows } = await db.query(
      `SELECT t.id, t.name, t.sport_id, s.name as sport_name, 
              t.manager_user_id, t.logo_url, t.description, t.city, t.is_active,
              t.created_at
       FROM teams t
       JOIN sports s ON t.sport_id = s.id
       WHERE t.id = $1`,
      [teamId]
    );
    return rows[0] || null;
  }

  async createTeam(userId, teamData) {
    const { name, sport_id, description, city, logo_url } = teamData;

    // Verify sport exists
    const sportCheck = await db.query('SELECT id FROM sports WHERE id = $1 AND is_active = true', [sport_id]);
    if (sportCheck.rows.length === 0) {
      const err = new Error('Sport not found or inactive');
      err.statusCode = 404;
      throw err;
    }

    const { rows } = await db.query(
      `INSERT INTO teams (name, sport_id, manager_user_id, description, city, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, sport_id, manager_user_id, description, city, logo_url, is_active, created_at`,
      [name, sport_id, userId, description || null, city || null, logo_url || null]
    );

    return rows[0];
  }

  async updateTeam(userId, teamId, updateData) {
    // Check ownership
    const team = await this.getTeamById(teamId);
    if (!team) {
      const err = new Error('Team not found');
      err.statusCode = 404;
      throw err;
    }
    if (team.manager_user_id !== userId) {
      const err = new Error('Not authorized to update this team');
      err.statusCode = 403;
      throw err;
    }

    const { name, description, city, logo_url, is_active } = updateData;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(city);
    }
    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramIndex++}`);
      values.push(logo_url);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) return team;

    values.push(teamId);

    const { rows } = await db.query(
      `UPDATE teams
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, sport_id, manager_user_id, description, city, logo_url, is_active, updated_at`,
      values
    );

    return rows[0];
  }

  // --- Members ---

  async getTeamMembers(teamId) {
    const { rows } = await db.query(
      `SELECT tm.id as member_id, tm.team_role, tm.jersey_number, tm.joined_at, tm.is_active,
              pp.id as player_profile_id, pp.display_name, pp.user_id
       FROM team_members tm
       JOIN player_profiles pp ON tm.player_profile_id = pp.id
       WHERE tm.team_id = $1 AND tm.is_active = true
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );
    return rows;
  }

  async removeTeamMember(userId, teamId, memberId) {
    const team = await this.getTeamById(teamId);
    if (!team) {
      const err = new Error('Team not found');
      err.statusCode = 404;
      throw err;
    }
    if (team.manager_user_id !== userId) {
      const err = new Error('Not authorized to manage members of this team');
      err.statusCode = 403;
      throw err;
    }

    // Rather than hard delete, we set is_active = false and left_at = NOW() to preserve historical integrity.
    const { rowCount } = await db.query(
      `UPDATE team_members
       SET is_active = false, left_at = NOW()
       WHERE id = $1 AND team_id = $2 AND is_active = true`,
      [memberId, teamId]
    );

    if (rowCount === 0) {
      const err = new Error('Active team member not found');
      err.statusCode = 404;
      throw err;
    }

    return { success: true };
  }

  // --- Invitations ---

  async inviteUser(managerUserId, teamId, invitedUserId, message) {
    const team = await this.getTeamById(teamId);
    if (!team) {
      const err = new Error('Team not found');
      err.statusCode = 404;
      throw err;
    }
    if (team.manager_user_id !== managerUserId) {
      const err = new Error('Not authorized to invite members to this team');
      err.statusCode = 403;
      throw err;
    }

    if (managerUserId === invitedUserId) {
      const err = new Error('You cannot invite yourself');
      err.statusCode = 400;
      throw err;
    }

    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [invitedUserId]);
    if (userCheck.rows.length === 0) {
      const err = new Error('Invited user not found');
      err.statusCode = 404;
      throw err;
    }

    // Check if already a member
    const memberCheck = await db.query(
      `SELECT tm.id FROM team_members tm
       JOIN player_profiles pp ON tm.player_profile_id = pp.id
       WHERE tm.team_id = $1 AND pp.user_id = $2 AND tm.is_active = true`,
      [teamId, invitedUserId]
    );
    if (memberCheck.rows.length > 0) {
      const err = new Error('User is already an active member of this team');
      err.statusCode = 409;
      throw err;
    }

    // Check if pending invitation exists
    const invCheck = await db.query(
      `SELECT id FROM team_invitations 
       WHERE team_id = $1 AND invited_user_id = $2 AND status = 'pending'`,
      [teamId, invitedUserId]
    );
    if (invCheck.rows.length > 0) {
      const err = new Error('A pending invitation already exists for this user');
      err.statusCode = 409;
      throw err;
    }

    const { rows } = await db.query(
      `INSERT INTO team_invitations (team_id, invited_user_id, invited_by_user_id, message, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, team_id, invited_user_id, status, created_at`,
      [teamId, invitedUserId, managerUserId, message || null]
    );

    return rows[0];
  }

  async getMyInvitations(userId) {
    const { rows } = await db.query(
      `SELECT ti.id, ti.team_id, t.name as team_name, ti.invited_by_user_id, ti.message, ti.status, ti.created_at
       FROM team_invitations ti
       JOIN teams t ON ti.team_id = t.id
       WHERE ti.invited_user_id = $1 AND ti.status = 'pending'
       ORDER BY ti.created_at DESC`,
      [userId]
    );
    return rows;
  }

  async respondToInvitation(userId, invitationId, action) {
    if (!['accept', 'reject'].includes(action)) {
      const err = new Error('Invalid action');
      err.statusCode = 400;
      throw err;
    }

    // We need a transaction if accepting, to also insert the team member.
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const invRes = await client.query(
        `SELECT * FROM team_invitations WHERE id = $1 AND invited_user_id = $2 AND status = 'pending' FOR UPDATE`,
        [invitationId, userId]
      );
      if (invRes.rows.length === 0) {
        const err = new Error('Pending invitation not found or unauthorized');
        err.statusCode = 404;
        throw err;
      }
      const invitation = invRes.rows[0];

      if (action === 'reject') {
        await client.query(
          `UPDATE team_invitations SET status = 'declined', responded_at = NOW() WHERE id = $1`,
          [invitationId]
        );
        await client.query('COMMIT');
        return { success: true, message: 'Invitation declined' };
      }

      // Action is accept. Requires player_profile.
      const ppRes = await client.query('SELECT id FROM player_profiles WHERE user_id = $1', [userId]);
      if (ppRes.rows.length === 0) {
        const err = new Error('You must create a Player Profile before joining a team');
        err.statusCode = 400;
        throw err;
      }
      const playerProfileId = ppRes.rows[0].id;

      // Check if already an active member (edge case)
      const memRes = await client.query(
        `SELECT id FROM team_members WHERE team_id = $1 AND player_profile_id = $2 AND is_active = true`,
        [invitation.team_id, playerProfileId]
      );
      if (memRes.rows.length > 0) {
        // Just mark as accepted since they are already in the team somehow
        await client.query(
          `UPDATE team_invitations SET status = 'accepted', responded_at = NOW() WHERE id = $1`,
          [invitationId]
        );
        await client.query('COMMIT');
        return { success: true, message: 'Invitation accepted (already a member)' };
      }

      // Accept and insert member
      await client.query(
        `UPDATE team_invitations SET status = 'accepted', responded_at = NOW() WHERE id = $1`,
        [invitationId]
      );

      await client.query(
        `INSERT INTO team_members (team_id, player_profile_id, team_role, is_active)
         VALUES ($1, $2, 'player', true)
         ON CONFLICT (team_id, player_profile_id) WHERE is_active = TRUE DO NOTHING`,
        [invitation.team_id, playerProfileId]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Invitation accepted and joined team' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = new TeamsService();
