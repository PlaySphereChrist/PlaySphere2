const { query } = require('../../config/database');

/**
 * Retrieves safe account information for a user by ID.
 *
 * Returns only publicly safe fields. Never returns:
 *   - password_hash
 *   - refresh tokens
 *   - JWT secrets
 *   - internal auth fields
 */
const getUserById = async (userId) => {
  const result = await query(
    `SELECT
       u.id,
       u.email,
       u.is_active,
       u.is_email_verified,
       u.last_login_at,
       u.created_at,
       u.updated_at,
       COALESCE(
         json_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
         '[]'::json
       ) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r       ON r.id = ur.role_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
};

module.exports = { getUserById };
