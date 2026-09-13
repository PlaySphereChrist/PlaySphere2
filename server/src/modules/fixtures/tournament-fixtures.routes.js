const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./fixtures.controller');

router.use(authenticate);

// GET /api/tournaments/:tournamentId/fixtures
router.get('/', asyncHandler(ctrl.getTournamentFixtures));

module.exports = router;
