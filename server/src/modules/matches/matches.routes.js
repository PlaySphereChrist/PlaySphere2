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

module.exports = router;
