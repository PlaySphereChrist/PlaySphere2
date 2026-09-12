const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams so we can access :tournamentId
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./eligibility.controller');

// All eligibility endpoints require authentication
router.use(authenticate);

// Rules CRUD
router.get('/rules', asyncHandler(ctrl.listRules));
router.post('/rules', asyncHandler(ctrl.createRule));
router.patch('/rules/:ruleId', asyncHandler(ctrl.updateRule));
router.delete('/rules/:ruleId', asyncHandler(ctrl.deleteRule));

// Evaluation Engine
router.post('/evaluate', asyncHandler(ctrl.evaluateCandidate));
router.get('/evaluation', asyncHandler(ctrl.getEvaluation));

// Overrides
router.post('/override', asyncHandler(ctrl.overrideEligibility));

module.exports = router;
