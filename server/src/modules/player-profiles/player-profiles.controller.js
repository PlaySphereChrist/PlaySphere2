const profilesService = require('./player-profiles.service');

// Fields that must NEVER be accepted from the client on /me endpoints.
// Ownership is always determined by the authenticated session.
const CLIENT_FORBIDDEN = ['user_id', 'id', 'created_at', 'updated_at'];

/**
 * Checks request body for fields that must never come from the client.
 * Throws 400 if any are present.
 */
const rejectForbiddenFields = (body) => {
  for (const field of CLIENT_FORBIDDEN) {
    if (body[field] !== undefined) {
      const err = new Error(
        `Field '${field}' cannot be set by the client`
      );
      err.statusCode = 400;
      throw err;
    }
  }
};

/**
 * GET /api/player-profiles/me
 *
 * Returns the authenticated user's Player Profile, or a clear message if
 * none exists. Does NOT auto-create a profile — Player Profiles are optional.
 */
const getMyProfile = async (req, res) => {
  const profile = await profilesService.getProfileByUserId(req.user.id);

  if (!profile) {
    return res.status(200).json({
      success: true,
      message:
        'You do not have a Player Profile yet. Player Profiles are optional — ' +
        'create one with POST /api/player-profiles/me to participate in competitive activities.',
      data: { profile: null }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Player Profile retrieved',
    data: { profile }
  });
};

/**
 * POST /api/player-profiles/me
 *
 * Creates a Player Profile for the authenticated user.
 * user_id always comes from req.user — client-supplied user_id is rejected.
 * One profile per user; duplicate creation returns 409.
 */
const createMyProfile = async (req, res) => {
  rejectForbiddenFields(req.body);

  const profile = await profilesService.createProfile(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Player Profile created',
    data: { profile }
  });
};

/**
 * PATCH /api/player-profiles/me
 *
 * Updates the authenticated user's own Player Profile.
 * user_id and id are immutable and rejected if supplied.
 * Returns 404 if no profile exists yet.
 */
const updateMyProfile = async (req, res) => {
  rejectForbiddenFields(req.body);

  const profile = await profilesService.updateProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Player Profile updated',
    data: { profile }
  });
};

module.exports = { getMyProfile, createMyProfile, updateMyProfile };
