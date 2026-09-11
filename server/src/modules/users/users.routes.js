const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const asyncHandler = require('../../utils/asyncHandler');
const usersController = require('./users.controller');

// All /api/users/me endpoints require a valid JWT access token.
// req.user.id is always sourced from the authenticate middleware, never from the client.
router.get('/me', authenticate, asyncHandler(usersController.getMe));
router.patch('/me', authenticate, asyncHandler(usersController.updateMe));

module.exports = router;
