'use strict';

const svc = require('./community.service');

// Helper: extract roles array from req.user (populated by authenticate middleware)
const roles = (req) => req.user.roles || [];

// ─── Community ────────────────────────────────────────────────────────────────
const getCommunity = async (req, res) => {
  const community = await svc.getCommunity(req.query.community_id);
  res.json({ success: true, community });
};

const updateCommunity = async (req, res) => {
  const community = await svc.updateCommunity(req.body.community_id || req.query.community_id, req.user.id, roles(req), req.body);
  res.json({ success: true, community });
};

// ─── Membership ───────────────────────────────────────────────────────────────
const getMembers = async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const data = await svc.getMembers(req.query.community_id, page, limit);
  res.json({ success: true, ...data });
};

const joinCommunity = async (req, res) => {
  const data = await svc.joinCommunity(req.body.community_id || req.query.community_id, req.user.id);
  res.status(201).json({ success: true, ...data });
};

const leaveCommunity = async (req, res) => {
  const data = await svc.leaveCommunity(req.body.community_id || req.query.community_id, req.user.id);
  res.json({ success: true, ...data });
};

// ─── Posts ────────────────────────────────────────────────────────────────────
const listPosts = async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const category = req.query.category || null;
  const data = await svc.listPosts(req.query.community_id, req.user.id, page, limit, category);
  res.json({ success: true, ...data });
};

const createPost = async (req, res) => {
  const post = await svc.createPost(req.body.community_id || req.query.community_id, req.user.id, roles(req), req.body);
  res.status(201).json({ success: true, post });
};

const getPost = async (req, res) => {
  const post = await svc.getPost(req.params.postId, req.user.id);
  res.json({ success: true, post });
};

const updatePost = async (req, res) => {
  const post = await svc.updatePost(req.params.postId, req.user.id, roles(req), req.body);
  res.json({ success: true, post });
};

const archivePost = async (req, res) => {
  const data = await svc.archivePost(req.params.postId, req.user.id, roles(req));
  res.json({ success: true, ...data });
};

const reactToPost = async (req, res) => {
  const data = await svc.reactToPost(req.params.postId, req.user.id, req.body.reaction);
  res.json({ success: true, ...data });
};

const moderatePost = async (req, res) => {
  const data = await svc.moderatePost(req.params.postId, req.user.id, roles(req), req.body);
  res.json({ success: true, post: data });
};

// ─── Comments ─────────────────────────────────────────────────────────────────
const listComments = async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const data = await svc.listComments(req.params.postId, page, limit);
  res.json({ success: true, ...data });
};

const createComment = async (req, res) => {
  const comment = await svc.createComment(req.params.postId, req.user.id, roles(req), req.body, req.body.community_id || req.query.community_id);
  res.status(201).json({ success: true, comment });
};

const updateComment = async (req, res) => {
  const comment = await svc.updateComment(req.params.commentId, req.user.id, roles(req), req.body);
  res.json({ success: true, comment });
};

const archiveComment = async (req, res) => {
  const data = await svc.archiveComment(req.params.commentId, req.user.id, roles(req));
  res.json({ success: true, ...data });
};

const moderateComment = async (req, res) => {
  const data = await svc.moderateComment(req.params.commentId, req.user.id, roles(req), req.body);
  res.json({ success: true, comment: data });
};

// ─── Equipment Requests ───────────────────────────────────────────────────────
const listEquipmentRequests = async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const data = await svc.listEquipmentRequests(req.query.community_id, req.user.id, page, limit);
  res.json({ success: true, ...data });
};

const createEquipmentRequest = async (req, res) => {
  const post = await svc.createEquipmentRequest(req.body.community_id || req.query.community_id, req.user.id, roles(req), req.body);
  res.status(201).json({ success: true, equipmentRequest: post });
};

const getEquipmentRequest = async (req, res) => {
  const post = await svc.getEquipmentRequest(req.params.requestId, req.user.id);
  res.json({ success: true, equipmentRequest: post });
};

const updateEquipmentRequest = async (req, res) => {
  const post = await svc.updateEquipmentRequest(req.params.requestId, req.user.id, roles(req), req.body);
  res.json({ success: true, equipmentRequest: post });
};

// ─── Reports ─────────────────────────────────────────────────────────────────
const createReport = async (req, res) => {
  const { postId, commentId, reason, description } = req.body;
  const report = await svc.createReport(req.user.id, { postId, commentId, reason, description });
  res.status(201).json({ success: true, report });
};

const listReports = async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const status = req.query.status || null;
  const data = await svc.listReports(roles(req), page, limit, status);
  res.json({ success: true, ...data });
};

const updateReport = async (req, res) => {
  const data = await svc.updateReport(req.params.reportId, req.user.id, roles(req), req.body);
  res.json({ success: true, report: data });
};

module.exports = {
  getCommunity, updateCommunity,
  getMembers, joinCommunity, leaveCommunity,
  listPosts, createPost, getPost, updatePost, archivePost, moderatePost, reactToPost,
  listComments, createComment, updateComment, archiveComment, moderateComment,
  listEquipmentRequests, createEquipmentRequest, getEquipmentRequest, updateEquipmentRequest,
  createReport, listReports, updateReport,
};
