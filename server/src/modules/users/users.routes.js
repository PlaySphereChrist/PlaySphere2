const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');
const usersController = require('./users.controller');

// All /api/users endpoints require a valid JWT access token.
router.use(authenticate);

router.get('/search', asyncHandler(usersController.searchUsers));
router.get('/me', asyncHandler(usersController.getMe));
router.patch('/me', asyncHandler(usersController.updateMe));

module.exports = router;
