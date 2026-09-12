const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const teamsController = require('./teams.controller');

// All endpoints require authentication
router.use(authenticate);

// --- TEAMS ---
router.get('/', asyncHandler(teamsController.getMyTeams));
router.post('/', asyncHandler(teamsController.createTeam));
router.get('/:teamId', asyncHandler(teamsController.getTeamById));
router.patch('/:teamId', asyncHandler(teamsController.updateTeam));

// --- MEMBERS ---
router.get('/:teamId/members', asyncHandler(teamsController.getTeamMembers));
router.delete('/:teamId/members/:memberId', asyncHandler(teamsController.removeTeamMember));

// --- INVITATIONS (Team Manager issuing) ---
router.post('/:teamId/invitations', asyncHandler(teamsController.inviteUser));

module.exports = router;
