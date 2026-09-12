const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./grounds.controller');

// All booking endpoints require authentication
router.use(authenticate);

// GET /api/ground-bookings/me  — authenticated user's own bookings
router.get('/me', asyncHandler(ctrl.getMyBookings));

// GET /api/ground-bookings/:bookingId  — booking detail (own or admin)
router.get('/:bookingId', asyncHandler(ctrl.getBookingById));

// POST /api/ground-bookings/:bookingId/cancel
router.post('/:bookingId/cancel', asyncHandler(ctrl.cancelBooking));

module.exports = router;
