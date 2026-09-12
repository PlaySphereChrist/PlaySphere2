const tournamentsService = require('./tournaments.service');

class TournamentsController {
  /**
   * GET /api/tournaments
   * Public: only registration_open
   * ORGANIZER: own + registration_open
   * ADMIN: all
   */
  async listTournaments(req, res) {
    const filters = {
      sport_id:          req.query.sport_id,
      status:            req.query.status,
      organizer_user_id: req.query.organizer_user_id,
    };
    const tournaments = await tournamentsService.listTournaments(filters, req.user);
    res.json({ success: true, data: { tournaments } });
  }

  /**
   * GET /api/tournaments/:tournamentId
   */
  async getTournament(req, res) {
    const tournament = await tournamentsService.getTournament(
      req.params.tournamentId,
      req.user
    );
    res.json({ success: true, data: { tournament } });
  }

  /**
   * POST /api/tournaments
   * ORGANIZER only — organizer_user_id always from req.user.id
   */
  async createTournament(req, res) {
    // Strip organizer_user_id from body — must NEVER trust client-supplied value
    const { organizer_user_id: _ignored, ...data } = req.body;
    const tournament = await tournamentsService.createTournament(req.user.id, data);
    res.status(201).json({ success: true, data: { tournament } });
  }

  /**
   * PATCH /api/tournaments/:tournamentId
   * Updates fields, or transitions status when `status` is present in body.
   */
  async updateTournament(req, res) {
    const tournament = await tournamentsService.updateTournament(
      req.params.tournamentId,
      req.user,
      req.body
    );
    res.json({ success: true, data: { tournament } });
  }
}

module.exports = new TournamentsController();
