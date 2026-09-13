'use strict';

const performanceService = require('./performance.service');

exports.getMatchPerformanceEvents = async (req, res) => {
  const events = await performanceService.getMatchPerformanceEvents(req.params.matchId, req.user);
  res.status(200).json({ success: true, data: { events } });
};

exports.createPerformanceEvent = async (req, res) => {
  const result = await performanceService.createPerformanceEvent(req.params.matchId, req.body, req.user);
  res.status(201).json({ success: true, data: result });
};

exports.getPerformanceEvent = async (req, res) => {
  const event = await performanceService.getPerformanceEvent(req.params.eventId, req.user);
  res.status(200).json({ success: true, data: { event } });
};

exports.getPerformanceEventPlayers = async (req, res) => {
  const players = await performanceService.getPerformanceEventPlayers(req.params.eventId, req.user);
  res.status(200).json({ success: true, data: { players } });
};
