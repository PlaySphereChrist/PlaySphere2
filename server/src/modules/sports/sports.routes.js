const express = require('express');
const router = express.Router();
const sportsController = require('./sports.controller');
const asyncHandler = require('../../utils/asyncHandler');

// GET /api/sports
// Returns the public list of active sports
router.get('/', asyncHandler(sportsController.getSportsCatalog));

module.exports = router;
