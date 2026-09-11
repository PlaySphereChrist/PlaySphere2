const { query } = require('../../config/database');

// Valid values matching the database CHECK constraint on player_profiles.gender
const VALID_GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'];

// Safe columns to SELECT — never includes anything from users (password_hash, tokens, etc.)
const SAFE_SELECT = `
  pp.id,
  pp.user_id,
  pp.display_name,
  pp.bio,
  pp.avatar_url,
  pp.date_of_birth,
  pp.gender,
  pp.city,
  pp.state,
  pp.phone,
  pp.is_public,
  pp.created_at,
  pp.updated_at
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates a display_name value.
 * Throws a 400 error if invalid.
 */
const validateDisplayName = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    const err = new Error('display_name must be a non-empty string');
    err.statusCode = 400;
    throw err;
  }
  if (value.trim().length > 100) {
    const err = new Error('display_name must be 100 characters or fewer');
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Validates optional profile fields. Throws 400 on invalid input.
 * Only validates fields that are present (not undefined).
 */
const validateOptionalFields = (fields) => {
  const { bio, avatar_url, date_of_birth, gender, city, state, phone, is_public } = fields;

  if (bio !== undefined && bio !== null && typeof bio !== 'string') {
    const err = new Error('bio must be a string');
    err.statusCode = 400;
    throw err;
  }

  if (avatar_url !== undefined && avatar_url !== null) {
    if (typeof avatar_url !== 'string') {
      const err = new Error('avatar_url must be a string');
      err.statusCode = 400;
      throw err;
    }
    // Minimal URL format check
    try {
      new URL(avatar_url);
    } catch {
      const err = new Error('avatar_url must be a valid URL');
      err.statusCode = 400;
      throw err;
    }
  }

  if (date_of_birth !== undefined && date_of_birth !== null) {
    const parsed = new Date(date_of_birth);
    if (isNaN(parsed.getTime())) {
      const err = new Error('date_of_birth must be a valid date (YYYY-MM-DD)');
      err.statusCode = 400;
      throw err;
    }
    if (parsed > new Date()) {
      const err = new Error('date_of_birth cannot be in the future');
      err.statusCode = 400;
      throw err;
    }
  }

  if (gender !== undefined && gender !== null && !VALID_GENDERS.includes(gender)) {
    const err = new Error(
      `gender must be one of: ${VALID_GENDERS.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }

  if (city !== undefined && city !== null) {
    if (typeof city !== 'string' || city.trim().length > 100) {
      const err = new Error('city must be a string of up to 100 characters');
      err.statusCode = 400;
      throw err;
    }
  }

  if (state !== undefined && state !== null) {
    if (typeof state !== 'string' || state.trim().length > 100) {
      const err = new Error('state must be a string of up to 100 characters');
      err.statusCode = 400;
      throw err;
    }
  }

  if (phone !== undefined && phone !== null) {
    if (typeof phone !== 'string' || phone.trim().length > 20) {
      const err = new Error('phone must be a string of up to 20 characters');
      err.statusCode = 400;
      throw err;
    }
  }

  if (is_public !== undefined && is_public !== null && typeof is_public !== 'boolean') {
    const err = new Error('is_public must be a boolean');
    err.statusCode = 400;
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Returns the player profile for a given user_id, or null if none exists.
 * Ownership is always determined from the authenticated user ID.
 */
const getProfileByUserId = async (userId) => {
  const result = await query(
    `SELECT ${SAFE_SELECT}
     FROM player_profiles pp
     WHERE pp.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

/**
 * Creates a new player profile for the authenticated user.
 *
 * Security: userId always comes from the authenticated session,
 * never from the request body.
 *
 * Throws 409 if the user already has a profile (UNIQUE constraint on user_id).
 */
const createProfile = async (userId, fields) => {
  const {
    display_name,
    bio = null,
    avatar_url = null,
    date_of_birth = null,
    gender = null,
    city = null,
    state = null,
    phone = null,
    is_public = true
  } = fields;

  // display_name is required on creation
  validateDisplayName(display_name);
  validateOptionalFields(fields);

  try {
    const result = await query(
      `INSERT INTO player_profiles
         (user_id, display_name, bio, avatar_url, date_of_birth, gender,
          city, state, phone, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING
         id, user_id, display_name, bio, avatar_url, date_of_birth,
         gender, city, state, phone, is_public, created_at, updated_at`,
      [
        userId,
        display_name.trim(),
        bio,
        avatar_url,
        date_of_birth || null,
        gender || null,
        city ? city.trim() : null,
        state ? state.trim() : null,
        phone ? phone.trim() : null,
        is_public
      ]
    );
    return result.rows[0];
  } catch (error) {
    // Postgres unique violation: user already has a profile
    if (error.code === '23505' && error.constraint === 'player_profiles_user_id_key') {
      const err = new Error('A Player Profile already exists for this account');
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Updates the authenticated user's own player profile.
 *
 * Security: ownership is enforced via WHERE user_id = $N using the
 * authenticated user ID — not any ID from the client.
 *
 * Only updates fields that are explicitly passed (PATCH semantics).
 * Throws 404 if the user has no profile yet.
 */
const updateProfile = async (userId, fields) => {
  const ALLOWED_COLUMNS = [
    'display_name', 'bio', 'avatar_url', 'date_of_birth',
    'gender', 'city', 'state', 'phone', 'is_public'
  ];

  // Validate provided fields
  if (fields.display_name !== undefined) {
    validateDisplayName(fields.display_name);
    fields.display_name = fields.display_name.trim();
  }
  validateOptionalFields(fields);

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const col of ALLOWED_COLUMNS) {
    if (fields[col] !== undefined) {
      setClauses.push(`${col} = $${paramIndex}`);
      // Trim string fields
      const val = fields[col];
      values.push(
        typeof val === 'string' && col !== 'avatar_url' ? val.trim() : val
      );
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update — return current profile (or 404 if none exists)
    const existing = await getProfileByUserId(userId);
    if (!existing) {
      const err = new Error(
        'No Player Profile found. Create one first with POST /api/player-profiles/me'
      );
      err.statusCode = 404;
      throw err;
    }
    return existing;
  }

  // WHERE user_id = $N ensures we only ever update the authenticated user's own profile
  values.push(userId);

  const result = await query(
    `UPDATE player_profiles
     SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE user_id = $${paramIndex}
     RETURNING
       id, user_id, display_name, bio, avatar_url, date_of_birth,
       gender, city, state, phone, is_public, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    const err = new Error(
      'No Player Profile found. Create one first with POST /api/player-profiles/me'
    );
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
};

// ---------------------------------------------------------------------------
// DELETE — intentionally NOT implemented in Phase 4A
// ---------------------------------------------------------------------------
//
// Reason: player_profiles.id is referenced as a FK by team_members
// (ON DELETE RESTRICT). Deleting a profile would fail if the user has any
// team membership records — including historical ones — because the FK
// constraint prevents it. Future phases will also reference player_profiles
// from tournament_registrations, performance_events, and player_statistics.
//
// A safe deletion path (soft-delete, leave-all-teams-first guard, admin-only
// hard-delete) requires a design decision and schema changes not approved for
// this phase. Therefore this endpoint is omitted for now.
//
// ---------------------------------------------------------------------------

module.exports = {
  getProfileByUserId,
  createProfile,
  updateProfile
};
