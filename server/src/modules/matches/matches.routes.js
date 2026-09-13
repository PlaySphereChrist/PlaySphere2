const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./matches.controller');

router.use(authenticate);

// GET /api/matches/:matchId
router.get('/:matchId', asyncHandler(ctrl.getMatch));

// GET /api/matches/:matchId/participants
router.get('/:matchId/participants', asyncHandler(ctrl.getMatchParticipants));

// POST /api/matches/:matchId/start
router.post('/:matchId/start', asyncHandler(ctrl.startMatch));

// POST /api/matches/:matchId/complete
router.post('/:matchId/complete', asyncHandler(ctrl.completeMatch));

// POST /api/matches/:matchId/cancel
router.post('/:matchId/cancel', asyncHandler(ctrl.cancelMatch));

// Performance events nested under match
router.use('/:matchId/performance-events', require('../performance/match-performance.routes'));

module.exports = router;
