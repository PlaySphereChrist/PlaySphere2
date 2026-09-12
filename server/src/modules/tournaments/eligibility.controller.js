const eligibilityService = require('./eligibility.service');

class EligibilityController {
  
  // --- Rules ---
  
  async listRules(req, res) {
    const rules = await eligibilityService.listRules(req.params.tournamentId, req.user);
    res.json({ success: true, data: { rules } });
  }

  async createRule(req, res) {
    const rule = await eligibilityService.createRule(req.params.tournamentId, req.user, req.body);
    res.status(201).json({ success: true, data: { rule } });
  }

  async updateRule(req, res) {
    const rule = await eligibilityService.updateRule(req.params.tournamentId, req.params.ruleId, req.user, req.body);
    res.json({ success: true, data: { rule } });
  }

  async deleteRule(req, res) {
    await eligibilityService.deleteRule(req.params.tournamentId, req.params.ruleId, req.user);
    res.json({ success: true, data: { deleted: true } });
  }

  // --- Evaluation ---

  async evaluateCandidate(req, res) {
    // Body can have { team_id } or { player_profile_id }
    const result = await eligibilityService.evaluateCandidate(req.params.tournamentId, req.body, req.user);
    res.json({ success: true, data: { result } });
  }

  async getEvaluation(req, res) {
    // We pass candidate identifers via query params for GET
    const candidateData = {
      team_id: req.query.team_id,
      player_profile_id: req.query.player_profile_id
    };
    const result = await eligibilityService.getEvaluationResult(req.params.tournamentId, candidateData, req.user);
    res.json({ success: true, data: { result } });
  }

  // --- Overrides ---

  async overrideEligibility(req, res) {
    // Body should have { team_id } or { player_profile_id } AND { eligible, reason }
    const result = await eligibilityService.overrideEligibility(req.params.tournamentId, req.body, req.user, req.body);
    res.json({ success: true, data: { result } });
  }
}

module.exports = new EligibilityController();
