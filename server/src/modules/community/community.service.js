'use strict';

const { query } = require('../../config/database');

// ─── Unique PlaySphere Community Name ─────────────────────────────────────────
const COMMUNITY_NAME = 'PlaySphere Global Community';

// ─── Error helpers (matching project convention: err.statusCode) ──────────────
function err(statusCode, msg) {
  const e = new Error(msg);
  e.statusCode = statusCode;
  return e;
}
const notFound  = (msg) => err(404, msg);
const forbidden = (msg) => err(403, msg);
const badReq    = (msg) => err(400, msg);
const conflict  = (msg) => err(409, msg);

// ─── UUID validation ──────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertUuid(val, label) {
  if (!val || !UUID_RE.test(val)) throw badReq(`${label} must be a valid UUID.`);
}

// ─── Fetch the unified community ──────────────────────────────────────────────
async function _getCommunity() {
  const res = await query(
    `SELECT id, name, description, is_public, is_active, created_by_user_id, created_at, updated_at
     FROM communities WHERE name = $1 AND is_active = TRUE LIMIT 1`,
    [COMMUNITY_NAME]
  );
  if (!res.rows[0]) throw notFound('PlaySphere Global Community not found. Run the seed.');
  return res.rows[0];
}

// ─── Check membership ─────────────────────────────────────────────────────────
async function _isMember(communityId, userId) {
  const res = await query(
    'SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2',
    [communityId, userId]
  );
  return res.rows.length > 0;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────
function isAdmin(userRoles)    { return Array.isArray(userRoles) && userRoles.includes('ADMIN'); }
function isOrgOrAdmin(roles)   { return Array.isArray(roles) && (roles.includes('ORGANIZER') || roles.includes('ADMIN')); }

// ─── COMMUNITY ────────────────────────────────────────────────────────────────

async function getCommunity() {
  return _getCommunity();
}

async function updateCommunity(userId, userRoles, { description }) {
  if (!isOrgOrAdmin(userRoles)) throw forbidden('Only ORGANIZER or ADMIN can update the community.');
  if (!description || !description.trim()) throw badReq('description is required.');
  const community = await _getCommunity();
  const res = await query(
    `UPDATE communities SET description = $1 WHERE id = $2
     RETURNING id, name, description, is_public, is_active, created_by_user_id, updated_at`,
    [description.trim(), community.id]
  );
  return res.rows[0];
}

// ─── MEMBERSHIP ───────────────────────────────────────────────────────────────

async function getMembers(page = 1, limit = 50) {
  const community = await _getCommunity();
  const offset = Math.max(0, (page - 1) * limit);
  const res = await query(
    `SELECT cm.id, cm.user_id, cm.role, cm.joined_at, u.email
     FROM community_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.community_id = $1
     ORDER BY cm.joined_at ASC
     LIMIT $2 OFFSET $3`,
    [community.id, limit, offset]
  );
  const countRes = await query(
    'SELECT COUNT(*) FROM community_members WHERE community_id = $1', [community.id]
  );
  return { members: res.rows, total: parseInt(countRes.rows[0].count, 10) };
}

async function joinCommunity(userId) {
  const community = await _getCommunity();
  const existing = await query(
    'SELECT id FROM community_members WHERE community_id = $1 AND user_id = $2',
    [community.id, userId]
  );
  if (existing.rows.length > 0) throw conflict('Already a member of this community.');
  const res = await query(
    `INSERT INTO community_members (community_id, user_id, role)
     VALUES ($1, $2, 'member') RETURNING id, role, joined_at`,
    [community.id, userId]
  );
  return { communityId: community.id, membership: res.rows[0] };
}

async function leaveCommunity(userId) {
  const community = await _getCommunity();
  const res = await query(
    'DELETE FROM community_members WHERE community_id = $1 AND user_id = $2 RETURNING id',
    [community.id, userId]
  );
  if (res.rows.length === 0) throw notFound('Not a member of this community.');
  return { message: 'Left community successfully.' };
}

// ─── POSTS ────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['general', 'equipment_request', 'looking_for_players', 'event_announcement', 'discussion', 'feedback'];

async function listPosts(page = 1, limit = 20, category = null) {
  const community = await _getCommunity();
  const offset = Math.max(0, (page - 1) * limit);
  if (category && !VALID_CATEGORIES.includes(category)) {
    throw badReq(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  const params = [community.id, limit, offset];
  let categoryClause = '';
  if (category) {
    params.push(category);
    categoryClause = `AND p.category = $${params.length}::post_category_type`;
  }
  const res = await query(
    `SELECT p.id, p.title, p.body, p.category, p.is_pinned, p.is_locked,
            p.is_deleted, p.is_moderated, p.moderation_reason,
            p.created_at, p.updated_at, p.author_user_id, u.email AS author_email,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = FALSE) AS comment_count
     FROM posts p
     JOIN users u ON u.id = p.author_user_id
     WHERE p.community_id = $1
       AND p.is_deleted  = FALSE
       AND p.is_moderated = FALSE
       ${categoryClause}
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT $2 OFFSET $3`,
    params
  );
  const countParams = [community.id];
  let countWhere = '';
  if (category) { countParams.push(category); countWhere = `AND category = $${countParams.length}::post_category_type`; }
  const countRes = await query(
    `SELECT COUNT(*) FROM posts WHERE community_id = $1 AND is_deleted = FALSE AND is_moderated = FALSE ${countWhere}`,
    countParams
  );
  return { posts: res.rows, total: parseInt(countRes.rows[0].count, 10) };
}

async function createPost(userId, userRoles, { title, body, category = 'general' }) {
  if (!title || !title.trim()) throw badReq('title is required.');
  if (!body  || !body.trim())  throw badReq('body is required.');
  if (title.trim().length > 300) throw badReq('title must be ≤ 300 characters.');
  if (body.trim().length > 10000) throw badReq('body must be ≤ 10000 characters.');
  if (!VALID_CATEGORIES.includes(category)) {
    throw badReq(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  const community = await _getCommunity();
  const member = await _isMember(community.id, userId);
  if (!member) throw forbidden('You must join the community before posting.');
  const res = await query(
    `INSERT INTO posts (community_id, author_user_id, title, body, category)
     VALUES ($1, $2, $3, $4, $5::post_category_type)
     RETURNING id, title, body, category, is_pinned, is_locked, is_moderated, created_at, updated_at`,
    [community.id, userId, title.trim(), body.trim(), category]
  );
  return res.rows[0];
}

async function getPost(postId) {
  assertUuid(postId, 'postId');
  const res = await query(
    `SELECT p.id, p.title, p.body, p.category, p.is_pinned, p.is_locked,
            p.is_deleted, p.is_moderated, p.moderation_reason,
            p.created_at, p.updated_at, p.author_user_id, u.email AS author_email
     FROM posts p JOIN users u ON u.id = p.author_user_id
     WHERE p.id = $1 AND p.is_deleted = FALSE`,
    [postId]
  );
  if (!res.rows[0]) throw notFound('Post not found.');
  return res.rows[0];
}

async function updatePost(postId, userId, userRoles, { title, body }) {
  const post = await getPost(postId);
  const admin = isAdmin(userRoles);
  if (post.author_user_id !== userId && !admin) throw forbidden('You can only edit your own posts.');
  if (post.is_moderated && !admin) throw forbidden('This post has been moderated.');
  if (post.is_locked    && !admin) throw forbidden('This post is locked.');
  const newTitle = title !== undefined ? title.trim() : post.title;
  const newBody  = body  !== undefined ? body.trim()  : post.body;
  if (!newTitle) throw badReq('title cannot be empty.');
  if (!newBody)  throw badReq('body cannot be empty.');
  const res = await query(
    `UPDATE posts SET title = $1, body = $2 WHERE id = $3
     RETURNING id, title, body, category, updated_at`,
    [newTitle, newBody, postId]
  );
  return res.rows[0];
}

async function archivePost(postId, userId, userRoles) {
  const post = await getPost(postId);
  const admin = isAdmin(userRoles);
  if (post.author_user_id !== userId && !admin) throw forbidden('You can only archive your own posts.');
  const res = await query(
    `UPDATE posts SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1
     RETURNING id, is_deleted, deleted_at`,
    [postId]
  );
  return res.rows[0];
}

async function moderatePost(postId, adminUserId, userRoles, { moderate, reason }) {
  if (!isAdmin(userRoles)) throw forbidden('Only ADMIN can moderate posts.');
  assertUuid(postId, 'postId');
  const checkRes = await query('SELECT id FROM posts WHERE id = $1', [postId]);
  if (!checkRes.rows[0]) throw notFound('Post not found.');
  const res = await query(
    `UPDATE posts SET is_moderated = $1, moderation_reason = $2 WHERE id = $3
     RETURNING id, is_moderated, moderation_reason, updated_at`,
    [Boolean(moderate), reason || null, postId]
  );
  return res.rows[0];
}

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

async function listComments(postId, page = 1, limit = 50) {
  await getPost(postId);
  const offset = Math.max(0, (page - 1) * limit);
  const res = await query(
    `SELECT c.id, c.post_id, c.body, c.is_deleted, c.is_moderated, c.moderation_reason,
            c.parent_comment_id, c.created_at, c.updated_at,
            c.author_user_id, u.email AS author_email
     FROM comments c JOIN users u ON u.id = c.author_user_id
     WHERE c.post_id = $1 AND c.is_deleted = FALSE AND c.is_moderated = FALSE
     ORDER BY c.created_at ASC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );
  return { comments: res.rows };
}

async function createComment(postId, userId, userRoles, { body, parentCommentId = null }) {
  const post = await getPost(postId);
  if (post.is_locked) throw forbidden('Post is locked. Comments are disabled.');
  if (!body || !body.trim()) throw badReq('body is required.');
  if (body.trim().length > 5000) throw badReq('body must be ≤ 5000 characters.');
  const community = await _getCommunity();
  const member = await _isMember(community.id, userId);
  if (!member) throw forbidden('You must join the community before commenting.');
  if (parentCommentId) {
    assertUuid(parentCommentId, 'parentCommentId');
    const parentRes = await query(
      'SELECT id FROM comments WHERE id = $1 AND post_id = $2 AND is_deleted = FALSE',
      [parentCommentId, postId]
    );
    if (!parentRes.rows[0]) throw notFound('Parent comment not found.');
  }
  const res = await query(
    `INSERT INTO comments (post_id, author_user_id, body, parent_comment_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, post_id, body, parent_comment_id, created_at, updated_at`,
    [postId, userId, body.trim(), parentCommentId || null]
  );
  return res.rows[0];
}

async function getComment(commentId) {
  assertUuid(commentId, 'commentId');
  const res = await query(
    'SELECT * FROM comments WHERE id = $1 AND is_deleted = FALSE',
    [commentId]
  );
  if (!res.rows[0]) throw notFound('Comment not found.');
  return res.rows[0];
}

async function updateComment(commentId, userId, userRoles, { body }) {
  const comment = await getComment(commentId);
  const admin = isAdmin(userRoles);
  if (comment.author_user_id !== userId && !admin) throw forbidden('You can only edit your own comments.');
  if (comment.is_moderated && !admin) throw forbidden('This comment has been moderated.');
  if (!body || !body.trim()) throw badReq('body is required.');
  if (body.trim().length > 5000) throw badReq('body must be ≤ 5000 characters.');
  const res = await query(
    'UPDATE comments SET body = $1 WHERE id = $2 RETURNING id, body, updated_at',
    [body.trim(), commentId]
  );
  return res.rows[0];
}

async function archiveComment(commentId, userId, userRoles) {
  const comment = await getComment(commentId);
  const admin = isAdmin(userRoles);
  if (comment.author_user_id !== userId && !admin) throw forbidden('You can only archive your own comments.');
  const res = await query(
    `UPDATE comments SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1
     RETURNING id, is_deleted, deleted_at`,
    [commentId]
  );
  return res.rows[0];
}

async function moderateComment(commentId, adminUserId, userRoles, { moderate, reason }) {
  if (!isAdmin(userRoles)) throw forbidden('Only ADMIN can moderate comments.');
  assertUuid(commentId, 'commentId');
  const checkRes = await query('SELECT id FROM comments WHERE id = $1', [commentId]);
  if (!checkRes.rows[0]) throw notFound('Comment not found.');
  const res = await query(
    `UPDATE comments SET is_moderated = $1, moderation_reason = $2 WHERE id = $3
     RETURNING id, is_moderated, moderation_reason, updated_at`,
    [Boolean(moderate), reason || null, commentId]
  );
  return res.rows[0];
}

// ─── EQUIPMENT REQUESTS (posts with category = 'equipment_request') ───────────

async function listEquipmentRequests(page = 1, limit = 20) {
  return listPosts(page, limit, 'equipment_request');
}

async function createEquipmentRequest(userId, userRoles, { title, body }) {
  return createPost(userId, userRoles, { title, body, category: 'equipment_request' });
}

async function getEquipmentRequest(requestId) {
  const post = await getPost(requestId);
  if (post.category !== 'equipment_request') throw notFound('Equipment request not found.');
  return post;
}

async function updateEquipmentRequest(requestId, userId, userRoles, { title, body }) {
  const post = await getPost(requestId);
  if (post.category !== 'equipment_request') throw notFound('Equipment request not found.');
  return updatePost(requestId, userId, userRoles, { title, body });
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────

const VALID_REPORT_STATUSES = ['pending', 'reviewed', 'actioned', 'dismissed'];

async function createReport(reporterUserId, { postId, commentId, reason, description }) {
  if (!reason || !reason.trim()) throw badReq('reason is required.');
  if (reason.trim().length > 100) throw badReq('reason must be ≤ 100 characters.');

  const hasPost    = Boolean(postId);
  const hasComment = Boolean(commentId);

  if (!hasPost && !hasComment) throw badReq('Provide exactly one of postId or commentId.');
  if (hasPost && hasComment)   throw badReq('Provide exactly one of postId or commentId, not both.');

  if (hasPost) {
    assertUuid(postId, 'postId');
    const c = await query('SELECT id FROM posts WHERE id = $1 AND is_deleted = FALSE', [postId]);
    if (!c.rows[0]) throw notFound('Post not found.');
  }
  if (hasComment) {
    assertUuid(commentId, 'commentId');
    const c = await query('SELECT id FROM comments WHERE id = $1 AND is_deleted = FALSE', [commentId]);
    if (!c.rows[0]) throw notFound('Comment not found.');
  }

  const res = await query(
    `INSERT INTO reports (reporter_user_id, post_id, comment_id, reason, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, reporter_user_id, post_id, comment_id, reason, description, status, created_at`,
    [reporterUserId, postId || null, commentId || null, reason.trim(), description ? description.trim() : null]
  );
  return res.rows[0];
}

async function listReports(userRoles, page = 1, limit = 20, status = null) {
  if (!isAdmin(userRoles)) throw forbidden('Only ADMIN can access the moderation queue.');
  if (status && !VALID_REPORT_STATUSES.includes(status)) {
    throw badReq(`status must be one of: ${VALID_REPORT_STATUSES.join(', ')}`);
  }
  const offset = Math.max(0, (page - 1) * limit);
  const params = [limit, offset];
  let whereClause = '';
  if (status) { params.push(status); whereClause = `WHERE r.status = $${params.length}`; }
  const res = await query(
    `SELECT r.id, r.reporter_user_id, u.email AS reporter_email,
            r.post_id, r.comment_id, r.reason, r.description, r.status,
            r.reviewed_by_user_id, r.reviewed_at, r.moderation_action,
            r.created_at, r.updated_at
     FROM reports r JOIN users u ON u.id = r.reporter_user_id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return { reports: res.rows };
}

async function updateReport(reportId, adminUserId, userRoles, { status, moderationAction }) {
  if (!isAdmin(userRoles)) throw forbidden('Only ADMIN can update reports.');
  assertUuid(reportId, 'reportId');
  if (!status) throw badReq('status is required.');
  if (!VALID_REPORT_STATUSES.includes(status)) {
    throw badReq(`status must be one of: ${VALID_REPORT_STATUSES.join(', ')}`);
  }
  const existing = await query('SELECT id FROM reports WHERE id = $1', [reportId]);
  if (!existing.rows[0]) throw notFound('Report not found.');
  const res = await query(
    `UPDATE reports
     SET status = $1, reviewed_by_user_id = $2, reviewed_at = NOW(),
         moderation_action = COALESCE($3, moderation_action)
     WHERE id = $4
     RETURNING id, status, reviewed_by_user_id, reviewed_at, moderation_action, updated_at`,
    [status, adminUserId, moderationAction || null, reportId]
  );
  return res.rows[0];
}

module.exports = {
  getCommunity,
  updateCommunity,
  getMembers,
  joinCommunity,
  leaveCommunity,
  listPosts,
  createPost,
  getPost,
  updatePost,
  archivePost,
  moderatePost,
  listComments,
  createComment,
  getComment,
  updateComment,
  archiveComment,
  moderateComment,
  listEquipmentRequests,
  createEquipmentRequest,
  getEquipmentRequest,
  updateEquipmentRequest,
  createReport,
  listReports,
  updateReport,
};
