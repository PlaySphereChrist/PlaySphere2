const { query } = require('../../config/database');
const tournamentsService = require('../tournaments/tournaments.service');

class FixturesService {
  async getTournamentFixtures(tournamentId, requestingUser) {
    // Visibility check
    await tournamentsService.getTournament(tournamentId, requestingUser);

    const res = await query(`
      SELECT 
        f.id,
        f.tournament_id,
        f.round_number,
        f.round_name,
        f.match_number,
        f.ground_id,
        f.scheduled_at,
        f.status,
        f.notes,
        f.created_at,
        f.updated_at
      FROM fixtures f
      WHERE f.tournament_id = $1
      ORDER BY f.round_number ASC, f.match_number ASC
    `, [tournamentId]);

    return res.rows;
  }
}

module.exports = new FixturesService();
