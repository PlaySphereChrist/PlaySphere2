const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const ctrl = require('./razorpay.controller');

// ---------------------------------------------------------------------------
// POST /api/payments/razorpay/webhook
//
// Razorpay calls this server-to-server.
// No JWT authentication — verified by Razorpay HMAC signature instead.
// Express raw body capture middleware is applied in app.js before this route.
// ---------------------------------------------------------------------------
router.post('/razorpay/webhook', asyncHandler(ctrl.handleWebhook.bind(ctrl)));

module.exports = router;
