const matchesService = require('./matches.service');

exports.getTournamentMatches = async (req, res) => {
  const matches = await matchesService.getTournamentMatches(req.params.tournamentId, req.user);
  res.status(200).json({ success: true, data: { matches } });
};

exports.getMatch = async (req, res) => {
  const match = await matchesService.getMatch(req.params.matchId, req.user);
  res.status(200).json({ success: true, data: { match } });
};

exports.getMatchParticipants = async (req, res) => {
  const participants = await matchesService.getMatchParticipants(req.params.matchId, req.user);
  res.status(200).json({ success: true, data: { participants } });
};

exports.createMatchFromFixture = async (req, res) => {
  const match = await matchesService.createMatchFromFixture(
    req.params.tournamentId,
    req.params.fixtureId,
    req.body,
    req.user
  );
  res.status(201).json({ success: true, data: { match } });
};
