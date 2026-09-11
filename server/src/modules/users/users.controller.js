const usersService = require('./users.service');

/**
 * GET /api/users/me
 * Returns the authenticated user's safe account information.
 * req.user is set by the authenticate middleware — never from the client.
 */
const getMe = async (req, res) => {
  const user = await usersService.getUserById(req.user.id);

  res.status(200).json({
    success: true,
    message: 'User account retrieved',
    data: { user }
  });
};

/**
 * PATCH /api/users/me
 * Intentionally limited in Phase 4A.
 *
 * Email is the core authentication identity and must not be changed without
 * a verified email-change workflow (re-confirmation to the new address).
 * That workflow is out of scope for Phase 4A.
 *
 * Fields that must NEVER be accepted from the client:
 *   id, password_hash, roles, user_roles, is_active, is_email_verified,
 *   last_login_at, created_at, updated_at
 *
 * If the user supplies any of those fields, reject immediately.
 * Otherwise, respond with a clear message that no editable account fields
 * are exposed in this phase.
 */
const updateMe = async (req, res) => {
  const FORBIDDEN = [
    'id', 'password_hash', 'password', 'roles', 'user_roles',
    'is_active', 'is_email_verified', 'last_login_at',
    'created_at', 'updated_at', 'email'
  ];

  for (const field of FORBIDDEN) {
    if (req.body[field] !== undefined) {
      const err = new Error(
        `Field '${field}' cannot be modified through this endpoint`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // No other editable account-level fields exist on the users table in Phase 4A.
  // Return the current user unchanged so callers get a consistent response shape.
  const user = await usersService.getUserById(req.user.id);

  res.status(200).json({
    success: true,
    message:
      'No editable account fields are available in this version. ' +
      'To update your public profile (display name, bio, etc.), use PATCH /api/player-profiles/me.',
    data: { user }
  });
};

module.exports = { getMe, updateMe };
