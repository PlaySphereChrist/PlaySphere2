const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');
const profilesController = require('./player-profiles.controller');

// All /api/player-profiles/me endpoints require authentication.
// user_id is always derived from req.user (set by authenticate middleware),
// never from URL params or the request body.
router.get('/me', authenticate, asyncHandler(profilesController.getMyProfile));
router.post('/me', authenticate, asyncHandler(profilesController.createMyProfile));
router.patch('/me', authenticate, asyncHandler(profilesController.updateMyProfile));

// DELETE /me is intentionally not implemented in Phase 4A.
// See player-profiles.service.js for the rationale (FK integrity with team_members).

module.exports = router;
