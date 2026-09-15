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

/**
 * Searches users by email or display name
 */
const searchUsers = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) return [];
  const q = `%${searchTerm.trim()}%`;
  const result = await query(
    `SELECT u.id, u.email, pp.display_name, pp.avatar_url
     FROM users u
     LEFT JOIN player_profiles pp ON pp.user_id = u.id
     WHERE u.email ILIKE $1 OR pp.display_name ILIKE $1
     ORDER BY pp.display_name ASC, u.email ASC
     LIMIT 10`,
    [q]
  );
  return result.rows;
};

module.exports = { getUserById, searchUsers };
