'use strict';

const statisticsService = require('./statistics.service');

// GET /api/statistics/tournaments/:tournamentId/players
exports.getTournamentPlayerStatistics = async (req, res) => {
  const stats = await statisticsService.getTournamentPlayerStatistics(
    req.params.tournamentId,
    req.user
  );
  res.status(200).json({ success: true, data: { statistics: stats } });
};

// GET /api/statistics/tournaments/:tournamentId/players/:playerProfileId
exports.getTournamentPlayerStatisticsById = async (req, res) => {
  const result = await statisticsService.getTournamentPlayerStatisticsById(
    req.params.tournamentId,
    req.params.playerProfileId,
    req.user
  );
  res.status(200).json({ success: true, data: result });
};

// GET /api/statistics/tournaments/:tournamentId/teams
exports.getTournamentTeamStatistics = async (req, res) => {
  const stats = await statisticsService.getTournamentTeamStatistics(
    req.params.tournamentId,
    req.user
  );
  res.status(200).json({ success: true, data: { statistics: stats } });
};

// GET /api/statistics/players/:playerProfileId
exports.getPlayerStatistics = async (req, res) => {
  const result = await statisticsService.getPlayerStatistics(
    req.params.playerProfileId,
    req.user
  );
  res.status(200).json({ success: true, data: result });
};

// GET /api/statistics/matches/:matchId
exports.getMatchStatistics = async (req, res) => {
  const result = await statisticsService.getMatchStatistics(
    req.params.matchId,
    req.user
  );
  res.status(200).json({ success: true, data: result });
};

// POST /api/statistics/tournaments/:tournamentId/recalculate
exports.recalculateTournamentStatistics = async (req, res) => {
  const result = await statisticsService.recalculateTournamentStatistics(
    req.params.tournamentId,
    req.user
  );
  res.status(200).json({ success: true, data: result });
};
