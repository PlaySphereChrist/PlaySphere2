'use strict';

const express = require('express');
const router = express.Router();
const leaderboardsController = require('./leaderboards.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');

router.use(authenticate);

// Tournament-scoped listing (must be before /:id to prevent Express ambiguity)
router.get('/tournaments/:tournamentId', leaderboardsController.getTournamentLeaderboards);

// Direct leaderboard CRUD
router.post('/', authorizeRoles('ORGANIZER', 'ADMIN'), leaderboardsController.createLeaderboard);
router.post('/:id/generate', authorizeRoles('ORGANIZER', 'ADMIN'), leaderboardsController.generateLeaderboard);
router.get('/:id', leaderboardsController.getLeaderboard);
router.get('/:id/entries', leaderboardsController.getLeaderboardEntries);

module.exports = router;
