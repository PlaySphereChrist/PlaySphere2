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
router.use('/users', require('../modules/users/users.routes'));
router.use('/player-profiles', require('../modules/player-profiles/player-profiles.routes'));
router.use('/sports', require('../modules/sports/sports.routes'));
router.use('/teams', require('../modules/teams/teams.routes'));
router.use('/team-invitations', require('../modules/teams/team-invitations.routes'));
router.use('/grounds', require('../modules/grounds/grounds.routes'));
router.use('/ground-bookings', require('../modules/grounds/ground-bookings.routes'));
router.use('/payments', require('../modules/payments/payments.routes'));
router.use('/casual-games', require('../modules/casual-games/casual-games.routes'));
router.use('/tournaments',  require('../modules/tournaments/tournaments.routes'));
router.use('/registrations', require('../modules/tournaments/my-registrations.routes'));
router.use('/matches', require('../modules/matches/matches.routes'));
router.use('/performance-events', require('../modules/performance/performance.routes'));
router.use('/statistics', require('../modules/stats/statistics.routes'));
router.use('/leaderboards', require('../modules/leaderboards/leaderboards.routes'));
router.use('/community',   require('../modules/community/community.routes'));

module.exports = router;
