const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./registration.controller');

router.use(authenticate);

// POST   /api/tournaments/:tournamentId/registrations
router.post('/', asyncHandler(ctrl.register));

// GET    /api/tournaments/:tournamentId/registrations
router.get('/', asyncHandler(ctrl.listRegistrations));

// GET    /api/tournaments/:tournamentId/registrations/my
router.get('/my', asyncHandler(ctrl.getMyRegistration));

// DELETE /api/tournaments/:tournamentId/registrations/:registrationId
router.delete('/:registrationId', asyncHandler(ctrl.cancelRegistration));

// POST /api/tournaments/:tournamentId/registrations/:registrationId/payment/order
const paymentCtrl = require('../payments/razorpay.controller');
router.post('/:registrationId/payment/order', asyncHandler(paymentCtrl.createOrder.bind(paymentCtrl)));

// POST /api/tournaments/:tournamentId/registrations/:registrationId/payment/verify
router.post('/:registrationId/payment/verify', asyncHandler(paymentCtrl.verifyPayment.bind(paymentCtrl)));

module.exports = router;
