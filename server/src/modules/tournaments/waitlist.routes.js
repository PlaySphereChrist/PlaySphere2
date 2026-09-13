const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./registration.controller');

router.use(authenticate);

// GET    /api/tournaments/:tournamentId/waitlist
router.get('/', asyncHandler(ctrl.listWaitlist));

// GET    /api/tournaments/:tournamentId/waitlist/my
router.get('/my', asyncHandler(ctrl.getMyWaitlistEntry));

module.exports = router;
