'use strict';

const leaderboardsService = require('./leaderboards.service');
const asyncHandler = require('../../utils/asyncHandler');

class LeaderboardsController {
  
  createLeaderboard = asyncHandler(async (req, res) => {
    const { tournamentId } = req.body;
    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'tournamentId is required in body' });
    }
    const lb = await leaderboardsService.createLeaderboard(tournamentId, req.body, req.user);
    res.status(201).json({ success: true, leaderboard: lb });
  });

  generateLeaderboard = asyncHandler(async (req, res) => {
    const result = await leaderboardsService.generateTournamentLeaderboard(req.params.id, req.user);
    res.status(200).json({ success: true, data: result });
  });

  getLeaderboard = asyncHandler(async (req, res) => {
    const lb = await leaderboardsService.getLeaderboard(req.params.id, req.user);
    res.status(200).json({ success: true, leaderboard: lb });
  });

  getLeaderboardEntries = asyncHandler(async (req, res) => {
    const entries = await leaderboardsService.getLeaderboardEntries(req.params.id, req.user);
    res.status(200).json({ success: true, entries });
  });

  getTournamentLeaderboards = asyncHandler(async (req, res) => {
    const leaderboards = await leaderboardsService.getTournamentLeaderboards(req.params.tournamentId, req.user);
    res.status(200).json({ success: true, leaderboards });
  });
}

module.exports = new LeaderboardsController();
