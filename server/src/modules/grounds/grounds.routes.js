const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const ctrl = require('./grounds.controller');

// ---------------------------------------------------------------------------
// PUBLIC / AUTHENTICATED — Ground discovery
// All authenticated users can view grounds and slots
// ---------------------------------------------------------------------------
router.get('/', authenticate, asyncHandler(ctrl.listGroundsPublic));
router.get('/:groundId', authenticate, asyncHandler(ctrl.getGround));
router.get('/:groundId/availability', authenticate, asyncHandler(ctrl.listAvailability));
router.get('/:groundId/slots', authenticate, asyncHandler(ctrl.listSlots));

// ---------------------------------------------------------------------------
// USER — Bookings (place and manage own bookings)
// ---------------------------------------------------------------------------
router.post('/:groundId/bookings', authenticate, asyncHandler(ctrl.createBooking));

// ---------------------------------------------------------------------------
// ADMIN — Ground management
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.createGround)
);
router.patch(
  '/:groundId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.updateGround)
);

// ADMIN — Admin-only ground listing (includes inactive)
router.get(
  '/admin/all',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.listGroundsAdmin)
);

// ADMIN — Ground sports
router.post(
  '/:groundId/sports',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.addGroundSport)
);
router.delete(
  '/:groundId/sports/:sportId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.removeGroundSport)
);

// ADMIN — Availability management
router.post(
  '/:groundId/availability',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.createAvailability)
);
router.patch(
  '/:groundId/availability/:availId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.updateAvailability)
);
router.delete(
  '/:groundId/availability/:availId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.deleteAvailability)
);

// ADMIN — Booking slots management
router.post(
  '/:groundId/slots',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.createSlot)
);
router.patch(
  '/:groundId/slots/:slotId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.updateSlot)
);
router.delete(
  '/:groundId/slots/:slotId',
  authenticate, authorizeRoles('ADMIN'),
  asyncHandler(ctrl.deleteSlot)
);

module.exports = router;
