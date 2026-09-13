'use strict';

const express = require('express');
const router = express.Router();
const leaderboardsController = require('./leaderboards.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');

router.use(authenticate);

// Global or direct LB actions
router.post('/', authorizeRoles('ORGANIZER', 'ADMIN'), leaderboardsController.createLeaderboard);
router.post('/:id/generate', authorizeRoles('ORGANIZER', 'ADMIN'), leaderboardsController.generateLeaderboard);
router.get('/:id', leaderboardsController.getLeaderboard);
router.get('/:id/entries', leaderboardsController.getLeaderboardEntries);

// Optionally handle /tournaments/:tournamentId/leaderboards locally if mounted there, 
// but typically they are mounted on the main index
router.get('/tournaments/:tournamentId', leaderboardsController.getTournamentLeaderboards);

module.exports = router;
