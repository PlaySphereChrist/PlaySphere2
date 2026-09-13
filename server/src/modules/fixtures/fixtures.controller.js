const fixturesService = require('./fixtures.service');

exports.getTournamentFixtures = async (req, res) => {
  const fixtures = await fixturesService.getTournamentFixtures(req.params.tournamentId, req.user);
  res.status(200).json({ success: true, data: { fixtures } });
};
