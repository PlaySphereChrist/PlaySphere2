const express = require('express');
const router  = express.Router();
const asyncHandler  = require('../../utils/asyncHandler');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const ctrl = require('./community.controller');

// All community endpoints require authentication
router.use(authenticate);

// ─── Community (unified) ──────────────────────────────────────────────────────
router.get('/',       asyncHandler(ctrl.getCommunity));
router.post('/',      authorizeRoles('ORGANIZER', 'ADMIN'), asyncHandler(ctrl.updateCommunity));
router.patch('/',     authorizeRoles('ORGANIZER', 'ADMIN'), asyncHandler(ctrl.updateCommunity));

// ─── Membership ───────────────────────────────────────────────────────────────
router.get('/members',   asyncHandler(ctrl.getMembers));
router.post('/join',     asyncHandler(ctrl.joinCommunity));
router.post('/leave',    asyncHandler(ctrl.leaveCommunity));

// ─── Equipment Requests (before /:postId to avoid ambiguity) ─────────────────
router.get('/equipment-requests',           asyncHandler(ctrl.listEquipmentRequests));
router.post('/equipment-requests',          asyncHandler(ctrl.createEquipmentRequest));
router.get('/equipment-requests/:requestId',  asyncHandler(ctrl.getEquipmentRequest));
router.patch('/equipment-requests/:requestId', asyncHandler(ctrl.updateEquipmentRequest));

// ─── Reports ─────────────────────────────────────────────────────────────────
router.post('/reports',             asyncHandler(ctrl.createReport));
router.get('/reports',              authorizeRoles('ADMIN'), asyncHandler(ctrl.listReports));
router.patch('/reports/:reportId',  authorizeRoles('ADMIN'), asyncHandler(ctrl.updateReport));

// ─── Posts ────────────────────────────────────────────────────────────────────
router.get('/posts',              asyncHandler(ctrl.listPosts));
router.post('/posts',             asyncHandler(ctrl.createPost));
router.get('/posts/:postId',      asyncHandler(ctrl.getPost));
router.patch('/posts/:postId',    asyncHandler(ctrl.updatePost));
router.post('/posts/:postId/react', asyncHandler(ctrl.reactToPost));
router.post('/posts/:postId/archive',    asyncHandler(ctrl.archivePost));
router.post('/posts/:postId/moderate',   authorizeRoles('ADMIN'), asyncHandler(ctrl.moderatePost));

// ─── Comments ─────────────────────────────────────────────────────────────────
router.get('/posts/:postId/comments',   asyncHandler(ctrl.listComments));
router.post('/posts/:postId/comments',  asyncHandler(ctrl.createComment));
router.patch('/comments/:commentId',    asyncHandler(ctrl.updateComment));
router.post('/comments/:commentId/archive',  asyncHandler(ctrl.archiveComment));
router.post('/comments/:commentId/moderate', authorizeRoles('ADMIN'), asyncHandler(ctrl.moderateComment));

module.exports = router;
