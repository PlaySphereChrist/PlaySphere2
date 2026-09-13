const registrationService = require('./registration.service');

class RegistrationController {
  async register(req, res) {
    const result = await registrationService.register(req.params.tournamentId, req.user, req.body);
    const statusCode = result.type === 'registered' ? 201 : 202;
    res.status(statusCode).json({ success: true, data: result });
  }

  async listRegistrations(req, res) {
    const registrations = await registrationService.listRegistrations(req.params.tournamentId, req.user);
    res.json({ success: true, data: { registrations } });
  }

  async getMyRegistration(req, res) {
    const registration = await registrationService.getMyRegistration(req.params.tournamentId, req.user);
    res.json({ success: true, data: { registration } });
  }

  async cancelRegistration(req, res) {
    const result = await registrationService.cancelRegistration(
      req.params.tournamentId,
      req.params.registrationId,
      req.user
    );
    res.json({ success: true, data: result });
  }

  async listWaitlist(req, res) {
    const entries = await registrationService.listWaitlist(req.params.tournamentId, req.user);
    res.json({ success: true, data: { waitlist: entries } });
  }

  async getMyWaitlistEntry(req, res) {
    const entry = await registrationService.getMyWaitlistEntry(req.params.tournamentId, req.user);
    res.json({ success: true, data: { waitlist_entry: entry } });
  }
}

module.exports = new RegistrationController();
