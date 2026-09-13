'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./performance.controller');

router.use(authenticate);

// GET /api/matches/:matchId/performance-events
router.get('/', asyncHandler(ctrl.getMatchPerformanceEvents));

// POST /api/matches/:matchId/performance-events
router.post('/', asyncHandler(ctrl.createPerformanceEvent));

module.exports = router;
