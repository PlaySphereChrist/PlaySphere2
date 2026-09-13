const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const ctrl = require('./tournaments.controller');

// GET /api/tournaments — authenticated but accessible to all roles for discovery.
// Visibility filtering (draft vs public) is enforced inside the service.
router.get('/', authenticate, asyncHandler(ctrl.listTournaments));

// GET /api/tournaments/:tournamentId — authenticated, visibility enforced in service
router.get('/:tournamentId', authenticate, asyncHandler(ctrl.getTournament));

// POST /api/tournaments — ORGANIZER only
router.post(
  '/',
  authenticate,
  authorizeRoles('ORGANIZER', 'ADMIN'),
  asyncHandler(ctrl.createTournament)
);

// GET /api/tournaments/:tournamentId/configuration/validation — check configuration completeness
router.get('/:tournamentId/configuration/validation', authenticate, asyncHandler(ctrl.validateConfiguration));

// Eligibility Engine
router.use('/:tournamentId/eligibility', require('./eligibility.routes'));

// Registrations
router.use('/:tournamentId/registrations', require('./registration.routes'));

// Matches
router.use('/:tournamentId/matches', require('../matches/tournament-matches.routes'));

// Fixtures
router.use('/:tournamentId/fixtures', require('../fixtures/tournament-fixtures.routes'));

// Waitlist
router.use('/:tournamentId/waitlist', require('./waitlist.routes'));

// PATCH /api/tournaments/:tournamentId — authenticated; ownership checked in service
router.patch('/:tournamentId', authenticate, asyncHandler(ctrl.updateTournament));

// No DELETE route — tournaments are archived via status transitions, not deleted.

module.exports = router;
