const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./casual-games.controller');

// Read operations can be public or authenticated? 
// The prompt says "Authenticated users can join... Create an API for discovering casual games"
// Usually viewing games requires authentication in this system? Let's make it authenticated to be safe,
// but PlaySphere usually makes discovery public.
// "Casual Games are informal games created by logged-in PlaySphere users."
// Let's require auth for mutations, and allow public for GET, consistent with grounds.
// Wait, prompt: "Any authenticated USER can create or join a casual game."
// Let's just make it all authenticated. It's safer.
router.use(authenticate);

router.get('/', asyncHandler(ctrl.listGames));
router.post('/', asyncHandler(ctrl.createGame));
router.get('/:gameId', asyncHandler(ctrl.getGame));
router.patch('/:gameId', asyncHandler(ctrl.updateGame));
router.post('/:gameId/cancel', asyncHandler(ctrl.cancelGame));
router.post('/:gameId/join', asyncHandler(ctrl.joinGame));
router.post('/:gameId/leave', asyncHandler(ctrl.leaveGame));

module.exports = router;
