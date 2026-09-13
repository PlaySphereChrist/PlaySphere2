'use strict';

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./performance.controller');

router.use(authenticate);

// GET /api/performance-events/:eventId
router.get('/:eventId', asyncHandler(ctrl.getPerformanceEvent));

// GET /api/performance-events/:eventId/players
router.get('/:eventId/players', asyncHandler(ctrl.getPerformanceEventPlayers));

module.exports = router;
