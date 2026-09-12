const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate } = require('../../middleware/auth');
const sportsController = require('./sports.controller');
const asyncHandler = require('../../utils/asyncHandler');

// All endpoints in this router are mounted under /api/player-profiles/me/sports
// They inherently apply to the authenticated user's player profile.
// The authenticate middleware ensures req.user is set.

router.get('/', authenticate, asyncHandler(sportsController.getMySports));
router.post('/', authenticate, asyncHandler(sportsController.addMySport));
router.patch('/:sportProfileId', authenticate, asyncHandler(sportsController.updateMySport));
router.delete('/:sportProfileId', authenticate, asyncHandler(sportsController.deleteMySport));

module.exports = router;
