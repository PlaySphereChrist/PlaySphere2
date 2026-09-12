const teamsService = require('./teams.service');

class TeamsController {
  
  // ==========================================
  // TEAMS
  // ==========================================

  async getMyTeams(req, res) {
    const teams = await teamsService.getMyTeams(req.user.id);
    res.json({
      success: true,
      data: { teams }
    });
  }

  async getTeamById(req, res) {
    const team = await teamsService.getTeamById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    res.json({
      success: true,
      data: { team }
    });
  }

  async createTeam(req, res) {
    const { name, sport_id, description, city, logo_url } = req.body;
    
    if (!name || !sport_id) {
      return res.status(400).json({ success: false, message: 'Name and sport_id are required' });
    }

    const team = await teamsService.createTeam(req.user.id, {
      name, sport_id, description, city, logo_url
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team }
    });
  }

  async updateTeam(req, res) {
    const { name, description, city, logo_url, is_active } = req.body;
    
    const team = await teamsService.updateTeam(req.user.id, req.params.teamId, {
      name, description, city, logo_url, is_active
    });

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: { team }
    });
  }

  // ==========================================
  // MEMBERS
  // ==========================================

  async getTeamMembers(req, res) {
    // Only verify team exists
    const team = await teamsService.getTeamById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const members = await teamsService.getTeamMembers(req.params.teamId);
    res.json({
      success: true,
      data: { members }
    });
  }

  async removeTeamMember(req, res) {
    await teamsService.removeTeamMember(req.user.id, req.params.teamId, req.params.memberId);
    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  }

  // ==========================================
  // INVITATIONS
  // ==========================================

  async inviteUser(req, res) {
    const { invited_user_id, message } = req.body;
    if (!invited_user_id) {
      return res.status(400).json({ success: false, message: 'invited_user_id is required' });
    }

    const invitation = await teamsService.inviteUser(req.user.id, req.params.teamId, invited_user_id, message);
    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: { invitation }
    });
  }

  async getMyInvitations(req, res) {
    const invitations = await teamsService.getMyInvitations(req.user.id);
    res.json({
      success: true,
      data: { invitations }
    });
  }

  async respondToInvitation(req, res) {
    const { action } = req.body; // 'accept' or 'reject'
    const result = await teamsService.respondToInvitation(req.user.id, req.params.invitationId, action);
    res.json(result);
  }

}

module.exports = new TeamsController();
