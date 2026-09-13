const express = require('express');
const router = express.Router();
const sportsController = require('./sports.controller');
const asyncHandler = require('../../utils/asyncHandler');

// GET /api/sports
// Returns the public list of active sports
router.get('/', asyncHandler(sportsController.getSportsCatalog));

// GET /api/sports/:sportId/stat-definitions
// Returns stat definitions for a specific sport
router.get('/:sportId/stat-definitions', asyncHandler(sportsController.getSportStatDefinitions));

module.exports = router;
