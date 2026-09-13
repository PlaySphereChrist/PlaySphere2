const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./matches.controller');

// All endpoints here require authentication
router.use(authenticate);

// GET /api/tournaments/:tournamentId/matches
router.get('/', asyncHandler(ctrl.getTournamentMatches));

// POST /api/tournaments/:tournamentId/matches/from-fixture/:fixtureId
// Or just a separate path for creating from fixture
router.post('/from-fixture/:fixtureId', asyncHandler(ctrl.createMatchFromFixture));

module.exports = router;
