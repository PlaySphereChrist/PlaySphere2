const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./grounds.controller');
const paymentCtrl = require('../payments/razorpay.controller');

// All booking endpoints require authentication
router.use(authenticate);

// GET /api/ground-bookings/me  — authenticated user's own bookings
router.get('/me', asyncHandler(ctrl.getMyBookings));

// GET /api/ground-bookings/:bookingId  — booking detail (own or admin)
router.get('/:bookingId', asyncHandler(ctrl.getBookingById));

// POST /api/ground-bookings/:bookingId/cancel
router.post('/:bookingId/cancel', asyncHandler(ctrl.cancelBooking));

// ---------------------------------------------------------------------------
// PAYMENT FLOW
// POST /api/ground-bookings/:bookingId/payment/order   — create Razorpay order
// POST /api/ground-bookings/:bookingId/payment/verify  — verify checkout response
// POST /api/ground-bookings/:bookingId/payment/refund  — process eligible refund
// ---------------------------------------------------------------------------
router.post('/:bookingId/payment/order', asyncHandler(paymentCtrl.createOrder.bind(paymentCtrl)));
router.post('/:bookingId/payment/verify', asyncHandler(paymentCtrl.verifyPayment.bind(paymentCtrl)));
router.post('/:bookingId/payment/refund', asyncHandler(paymentCtrl.processRefund.bind(paymentCtrl)));

module.exports = router;
