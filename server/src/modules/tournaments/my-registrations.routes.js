const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const { query } = require('../../config/database');

router.use(authenticate);

// GET /api/registrations
router.get('/', asyncHandler(async (req, res) => {
  const sql = `
    SELECT
      tr.id AS registration_id,
      tr.tournament_id,
      tr.status AS registration_status,
      tr.eligibility_status,
      tr.registered_at,
      t.name AS tournament_name,
      t.sport_id,
      s.name AS sport_name,
      t.format,
      t.participation_type,
      t.starts_at,
      t.status AS tournament_status
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    JOIN sports s ON t.sport_id = s.id
    WHERE tr.registered_by_user_id = $1
    ORDER BY tr.registered_at DESC
  `;
  const result = await query(sql, [req.user.id]);
  res.json({ success: true, data: { registrations: result.rows } });
}));

module.exports = router;
