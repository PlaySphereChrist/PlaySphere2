const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const teamsController = require('./teams.controller');

// All endpoints require authentication
router.use(authenticate);

// --- MY INVITATIONS ---
router.get('/', asyncHandler(teamsController.getMyInvitations));
router.post('/:invitationId/respond', asyncHandler(teamsController.respondToInvitation));

module.exports = router;
