const casualGamesService = require('./casual-games.service');

class CasualGamesController {
  async listGames(req, res) {
    const filters = {
      sport_id: req.query.sport_id,
      status: req.query.status,
      skill_level: req.query.skill_level,
      date: req.query.date,
    };
    const games = await casualGamesService.listGames(filters);
    res.json({ success: true, data: { games } });
  }

  async getGame(req, res) {
    const gameId = req.params.gameId;
    const game = await casualGamesService.getGame(gameId);
    res.json({ success: true, data: { game } });
  }

  async createGame(req, res) {
    const userId = req.user.id;
    const game = await casualGamesService.createGame(userId, req.body);
    res.status(201).json({ success: true, data: { game } });
  }

  async updateGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const game = await casualGamesService.updateGame(gameId, userId, req.body);
    res.json({ success: true, data: { game } });
  }

  async cancelGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const result = await casualGamesService.cancelGame(gameId, userId);
    res.json(result);
  }

  async joinGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const result = await casualGamesService.joinGame(gameId, userId);
    res.json(result);
  }

  async leaveGame(req, res) {
    const gameId = req.params.gameId;
    const userId = req.user.id;
    const result = await casualGamesService.leaveGame(gameId, userId);
    res.json(result);
  }
}

module.exports = new CasualGamesController();
