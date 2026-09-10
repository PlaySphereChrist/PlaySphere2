const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------------------------
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const dbResult = await query('SELECT NOW() AS current_time');
    
    res.status(200).json({
      success: true,
      message: 'API is running',
      dbStatus: 'connected',
      timestamp: dbResult.rows[0].current_time
    });
  } catch (error) {
    console.error('Database connection error in health check:', error);
    res.status(503).json({
      success: false,
      message: 'API is running',
      dbStatus: 'disconnected',
      error: 'Failed to connect to the database'
    });
  }
}));

// Domain modules
router.use('/auth', require('../modules/auth/auth.routes'));

// ---------------------------------------------------------------------------
// TEMPORARY TEST-ONLY RBAC ROUTES — Phase 3 validation only
// These will be removed when real Admin/Organizer routes are implemented.
// ---------------------------------------------------------------------------
router.get(
  '/_test/admin-only',
  authenticate,
  authorizeRoles('ADMIN'),
  (req, res) => res.json({ success: true, message: 'ADMIN access granted', roles: req.user.roles })
);

router.get(
  '/_test/organizer-only',
  authenticate,
  authorizeRoles('ORGANIZER'),
  (req, res) => res.json({ success: true, message: 'ORGANIZER access granted', roles: req.user.roles })
);

router.get(
  '/_test/organizer-or-admin',
  authenticate,
  authorizeRoles('ORGANIZER', 'ADMIN'),
  (req, res) => res.json({ success: true, message: 'ORGANIZER or ADMIN access granted', roles: req.user.roles })
);

module.exports = router;
