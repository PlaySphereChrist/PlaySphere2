const { query, pool } = require('../../config/database');
const tournamentsService = require('./tournaments.service');

class EligibilityService {
  _badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }
  _forbidden(msg) { const e = new Error(msg); e.statusCode = 403; return e; }
  _notFound(msg) { const e = new Error(msg); e.statusCode = 404; return e; }

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------
  
  async _enforceOrganizer(tournamentId, user) {
    const isAdmin = user.roles?.includes('ADMIN');
    const res = await query('SELECT organizer_user_id, status FROM tournaments WHERE id = $1', [tournamentId]);
    if (!res.rows.length) throw this._notFound('Tournament not found');
    
    const tournament = res.rows[0];
    if (!isAdmin && tournament.organizer_user_id !== user.id) {
      throw this._forbidden('Only the organizer or an admin can manage eligibility rules');
    }
    return tournament;
  }

  async _checkRulesModifiable(tournament) {
    // Rules can only be changed before registration starts (in 'draft' state)
    if (tournament.status !== 'draft') {
      throw this._badRequest(`Cannot modify eligibility rules when tournament status is "${tournament.status}"`);
    }
  }

  // ---------------------------------------------------------------------------
  // RULES MANAGEMENT
  // ---------------------------------------------------------------------------
  
  async listRules(tournamentId, user) {
    // Anyone who can view the tournament can view its rules.
    await tournamentsService.getTournament(tournamentId, user);
    const res = await query(
      `SELECT * FROM tournament_eligibility_rules WHERE tournament_id = $1 ORDER BY created_at ASC`,
      [tournamentId]
    );
    return res.rows;
  }

  async createRule(tournamentId, user, data) {
    const tournament = await this._enforceOrganizer(tournamentId, user);
    await this._checkRulesModifiable(tournament);

    const { rule_type, rule_value, description, is_mandatory } = data;
    if (!rule_type || !rule_value) {
      throw this._badRequest('rule_type and rule_value are required');
    }

    const validTypes = ['min_age', 'max_age', 'gender', 'skill_level', 'city', 'custom'];
    if (!validTypes.includes(rule_type)) {
      throw this._badRequest(`Invalid rule_type. Must be one of: ${validTypes.join(', ')}`);
    }

    const res = await query(
      `INSERT INTO tournament_eligibility_rules 
        (tournament_id, rule_type, rule_value, description, is_mandatory)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        tournamentId,
        rule_type,
        rule_value,
        description || null,
        is_mandatory === undefined ? true : !!is_mandatory
      ]
    );

    return res.rows[0];
  }

  async updateRule(tournamentId, ruleId, user, data) {
    const tournament = await this._enforceOrganizer(tournamentId, user);
    await this._checkRulesModifiable(tournament);

    const { rule_value, description, is_mandatory } = data;
    const fields = [];
    const values = [];
    let idx = 1;

    if (rule_value !== undefined) {
      fields.push(`rule_value = $${idx++}`);
      values.push(rule_value);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (is_mandatory !== undefined) {
      fields.push(`is_mandatory = $${idx++}`);
      values.push(is_mandatory);
    }

    if (fields.length === 0) {
      const res = await query(`SELECT * FROM tournament_eligibility_rules WHERE id = $1 AND tournament_id = $2`, [ruleId, tournamentId]);
      if (!res.rows.length) throw this._notFound('Rule not found');
      return res.rows[0];
    }

    values.push(ruleId);
    values.push(tournamentId);

    const res = await query(
      `UPDATE tournament_eligibility_rules SET ${fields.join(', ')} 
       WHERE id = $${idx} AND tournament_id = $${idx + 1} RETURNING *`,
      values
    );

    if (!res.rows.length) throw this._notFound('Rule not found');
    return res.rows[0];
  }

  async deleteRule(tournamentId, ruleId, user) {
    const tournament = await this._enforceOrganizer(tournamentId, user);
    await this._checkRulesModifiable(tournament);

    const res = await query(
      `DELETE FROM tournament_eligibility_rules WHERE id = $1 AND tournament_id = $2 RETURNING id`,
      [ruleId, tournamentId]
    );

    if (!res.rows.length) throw this._notFound('Rule not found');
    return { deleted: true };
  }

  // ---------------------------------------------------------------------------
  // EVALUATION ENGINE
  // ---------------------------------------------------------------------------

  async evaluateCandidate(tournamentId, candidateData, user) {
    // Only organizer or admin can trigger an evaluation for a candidate.
    await this._enforceOrganizer(tournamentId, user);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.evaluateCandidateInternal(client, tournamentId, candidateData);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Internal evaluation engine - no authorization checks, requires active transaction client
  async evaluateCandidateInternal(client, tournamentId, candidateData) {
    const { team_id, player_profile_id } = candidateData;
    if (!team_id && !player_profile_id) {
      throw this._badRequest('Must provide either team_id or player_profile_id');
    }
    if (team_id && player_profile_id) {
      throw this._badRequest('Cannot provide both team_id and player_profile_id');
    }

    const rulesRes = await client.query(
      `SELECT * FROM tournament_eligibility_rules WHERE tournament_id = $1 ORDER BY created_at ASC`,
      [tournamentId]
    );
    const rules = rulesRes.rows;
    
    // Fetch candidate demographic info
    let candidateInfo = { profiles: [] };
    if (team_id) {
      // Validate team exists
      const teamRes = await client.query('SELECT name FROM teams WHERE id = $1', [team_id]);
      if (!teamRes.rows.length) throw this._notFound('Team not found');
      
      // Fetch all team members' profiles
      const membersRes = await client.query(
        `SELECT pp.id, pp.date_of_birth, pp.gender, pp.city 
         FROM team_members tm
         JOIN player_profiles pp ON tm.player_profile_id = pp.id
         WHERE tm.team_id = $1 AND tm.is_active = true`,
        [team_id]
      );
      candidateInfo.profiles = membersRes.rows;
      if (candidateInfo.profiles.length === 0) {
        throw this._badRequest('Team has no player profiles configured');
      }
    } else {
      // Fetch individual profile
      const profRes = await client.query(
        `SELECT id, date_of_birth, gender, city FROM player_profiles WHERE id = $1`,
        [player_profile_id]
      );
      if (!profRes.rows.length) throw this._notFound('Player profile not found');
      candidateInfo.profiles = profRes.rows;
    }

    // Clean previous automatic evaluations for this candidate/tournament
    if (team_id) {
      await client.query('DELETE FROM eligibility_evaluations WHERE tournament_id = $1 AND team_id = $2', [tournamentId, team_id]);
    } else {
      await client.query('DELETE FROM eligibility_evaluations WHERE tournament_id = $1 AND player_profile_id = $2 AND team_id IS NULL', [tournamentId, player_profile_id]);
    }

    let allPassed = true;
    const evaluationResults = [];

    for (const rule of rules) {
      const result = this._evaluateRule(rule, candidateInfo);

      if (rule.is_mandatory && result.passed !== true) {
        allPassed = false;
      }

      const evalResultStr = result.passed === true ? 'pass' : (result.passed === false ? 'fail' : 'pending');

      const insertRes = await client.query(
        `INSERT INTO eligibility_evaluations
         (tournament_id, team_id, player_profile_id, rule_id, result, notes, evaluated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [
          tournamentId,
          team_id || null,
          player_profile_id || null,
          rule.id,
          evalResultStr,
          result.reason
        ]
      );
      evaluationResults.push({
        rule,
        result: insertRes.rows[0]
      });
    }

    // Fetch any existing override to provide effective eligibility
    const override = await this._getActiveOverride(tournamentId, team_id, player_profile_id, client);

    let effective_eligible = allPassed;
    if (override) {
      effective_eligible = (override.override_type === 'approve');
    }

    return {
      automatic_eligible: allPassed,
      override: override ? {
        eligible: override.override_type === 'approve',
        reason: override.reason,
        by: override.overridden_by_name,
        at: override.created_at
      } : null,
      effective_eligible,
      details: evaluationResults
    };
  }

  _evaluateRule(rule, candidateInfo) {
    const profiles = candidateInfo.profiles;
    let passed = true;
    const reasons = [];

    // Helper to calculate age
    const calcAge = (dob) => {
      if (!dob) return null;
      const diff = Date.now() - new Date(dob).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };

    switch (rule.rule_type) {
      case 'min_age':
        const minAge = rule.rule_value.min_age;
        for (const p of profiles) {
          const age = calcAge(p.date_of_birth);
          if (age === null) { passed = false; reasons.push(`Missing DOB for player ${p.id}`); }
          else if (age < minAge) { passed = false; reasons.push(`Player ${p.id} age ${age} < ${minAge}`); }
        }
        if (passed) reasons.push(`All players meet minimum age of ${minAge}`);
        break;

      case 'max_age':
        const maxAge = rule.rule_value.max_age;
        for (const p of profiles) {
          const age = calcAge(p.date_of_birth);
          if (age === null) { passed = false; reasons.push(`Missing DOB for player ${p.id}`); }
          else if (age > maxAge) { passed = false; reasons.push(`Player ${p.id} age ${age} > ${maxAge}`); }
        }
        if (passed) reasons.push(`All players meet maximum age of ${maxAge}`);
        break;

      case 'gender':
        const allowedGender = rule.rule_value.gender?.toLowerCase();
        for (const p of profiles) {
          if (!p.gender || p.gender.toLowerCase() !== allowedGender) {
            passed = false;
            reasons.push(`Player ${p.id} does not match required gender '${allowedGender}'`);
          }
        }
        if (passed) reasons.push(`All players match gender requirement '${allowedGender}'`);
        break;

      case 'city':
        const requiredCity = rule.rule_value.city?.toLowerCase();
        for (const p of profiles) {
          if (!p.city || p.city.toLowerCase() !== requiredCity) {
            passed = false;
            reasons.push(`Player ${p.id} is not in city '${requiredCity}'`);
          }
        }
        if (passed) reasons.push(`All players are in required city '${requiredCity}'`);
        break;

      default:
        // Custom or unsupported rules cannot be evaluated automatically
        passed = 'pending';
        reasons.push(`Automatic evaluation for rule type '${rule.rule_type}' is not supported. Requires manual override.`);
        break;
    }

    return {
      passed, // Boolean (true/false) or 'pending'
      reason: reasons.join('; ')
    };
  }

  // ---------------------------------------------------------------------------
  // OVERRIDES
  // ---------------------------------------------------------------------------

  async _getActiveOverride(tournamentId, teamId, playerProfileId, client = null) {
    const executeQuery = client ? client.query.bind(client) : query;
    // Assumes most recent override dictates the state, or we just fetch the latest
    const params = [tournamentId];
    let candidateClause = '';
    
    if (teamId) {
      params.push(teamId);
      candidateClause = `AND team_id = $2`;
    } else {
      params.push(playerProfileId);
      candidateClause = `AND individual_player_profile_id = $2 AND team_id IS NULL`;
    }

    const res = await executeQuery(
      `SELECT o.*, u.email as overridden_by_name 
       FROM eligibility_overrides o
       JOIN users u ON o.overridden_by_user_id = u.id
       WHERE tournament_id = $1 ${candidateClause}
       ORDER BY o.id DESC LIMIT 1`,
      params
    );

    return res.rows.length ? res.rows[0] : null;
  }

  async getEvaluationResult(tournamentId, candidateData, user) {
    await this._enforceOrganizer(tournamentId, user);
    
    const { team_id, player_profile_id } = candidateData;
    if (!team_id && !player_profile_id) throw this._badRequest('Candidate identifier required');

    const params = [tournamentId];
    let candidateClause = '';
    
    if (team_id) {
      params.push(team_id);
      candidateClause = `AND team_id = $2`;
    } else {
      params.push(player_profile_id);
      candidateClause = `AND player_profile_id = $2 AND team_id IS NULL`;
    }

    const evalsRes = await query(
      `SELECT e.*, r.rule_type, r.description as rule_description, r.is_mandatory
       FROM eligibility_evaluations e
       JOIN tournament_eligibility_rules r ON e.rule_id = r.id
       WHERE e.tournament_id = $1 ${candidateClause}
       ORDER BY e.created_at ASC`,
      params
    );

    let automatic_eligible = true;
    for (const ev of evalsRes.rows) {
      if (ev.is_mandatory && ev.result !== 'pass') {
        automatic_eligible = false;
      }
    }

    if (evalsRes.rows.length === 0) {
      automatic_eligible = null; // Not evaluated yet
    }

    const override = await this._getActiveOverride(tournamentId, team_id, player_profile_id);
    let effective_eligible = automatic_eligible;
    if (override) {
      effective_eligible = (override.override_type === 'approve');
    }

    return {
      automatic_eligible,
      override: override ? {
        eligible: override.override_type === 'approve',
        reason: override.reason,
        by: override.overridden_by_name,
        at: override.created_at
      } : null,
      effective_eligible,
      details: evalsRes.rows
    };
  }

  async overrideEligibility(tournamentId, candidateData, user, data) {
    await this._enforceOrganizer(tournamentId, user);

    const { team_id, player_profile_id } = candidateData;
    if (!team_id && !player_profile_id) throw this._badRequest('Must provide either team_id or player_profile_id');
    if (team_id && player_profile_id) throw this._badRequest('Cannot provide both team_id and player_profile_id');

    const { eligible, reason } = data;
    if (typeof eligible !== 'boolean') throw this._badRequest('eligible must be a boolean');
    if (!reason || !reason.trim()) throw this._badRequest('A non-empty reason is required for an override');

    const overrideType = eligible ? 'approve' : 'reject';

    // Insert new override record (preserving history since we append)
    await query(
      `INSERT INTO eligibility_overrides
       (tournament_id, team_id, individual_player_profile_id, overridden_by_user_id, override_type, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tournamentId,
        team_id || null,
        player_profile_id || null,
        user.id,
        overrideType,
        reason.trim()
      ]
    );

    return await this.getEvaluationResult(tournamentId, candidateData, user);
  }
}

module.exports = new EligibilityService();
