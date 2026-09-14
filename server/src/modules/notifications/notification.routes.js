const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications
router.get('/', asyncHandler(notificationController.getMyNotifications.bind(notificationController)));

// GET /api/notifications/unread-count
router.get('/unread-count', asyncHandler(notificationController.getUnreadCount.bind(notificationController)));

// PATCH /api/notifications/read-all
router.patch('/read-all', asyncHandler(notificationController.markAllAsRead.bind(notificationController)));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', asyncHandler(notificationController.markAsRead.bind(notificationController)));

module.exports = router;
