const groundsService = require('./grounds.service');

class GroundsController {

  // ===========================================================================
  // ADMIN — GROUNDS
  // ===========================================================================

  async listGroundsAdmin(req, res) {
    const { sport_id } = req.query;
    const grounds = await groundsService.listGrounds({ activeOnly: false, sport_id });
    res.json({ success: true, data: { grounds } });
  }

  async listGroundsPublic(req, res) {
    const { sport_id } = req.query;
    const grounds = await groundsService.listGrounds({ activeOnly: true, sport_id });
    res.json({ success: true, data: { grounds } });
  }

  async getGround(req, res) {
    const ground = await groundsService.getGroundById(req.params.groundId);
    if (!ground) return res.status(404).json({ success: false, message: 'Ground not found' });
    res.json({ success: true, data: { ground } });
  }

  async createGround(req, res) {
    const ground = await groundsService.createGround(req.user.id, req.body);
    res.status(201).json({ success: true, message: 'Ground created successfully', data: { ground } });
  }

  async updateGround(req, res) {
    const ground = await groundsService.updateGround(req.params.groundId, req.body);
    res.json({ success: true, message: 'Ground updated successfully', data: { ground } });
  }

  // ===========================================================================
  // ADMIN — GROUND SPORTS
  // ===========================================================================

  async addGroundSport(req, res) {
    const { sport_id, surface_type, capacity } = req.body;
    if (!sport_id) return res.status(400).json({ success: false, message: 'sport_id is required' });
    const record = await groundsService.addGroundSport(req.params.groundId, sport_id, surface_type, capacity);
    res.status(201).json({ success: true, message: 'Sport added to ground', data: { ground_sport: record } });
  }

  async removeGroundSport(req, res) {
    await groundsService.removeGroundSport(req.params.groundId, req.params.sportId);
    res.json({ success: true, message: 'Sport removed from ground' });
  }

  // ===========================================================================
  // ADMIN — AVAILABILITY
  // ===========================================================================

  async listAvailability(req, res) {
    const availability = await groundsService.listAvailability(req.params.groundId);
    res.json({ success: true, data: { availability } });
  }

  async createAvailability(req, res) {
    const record = await groundsService.createAvailability(req.params.groundId, req.body);
    res.status(201).json({ success: true, message: 'Availability created', data: { availability: record } });
  }

  async updateAvailability(req, res) {
    const record = await groundsService.updateAvailability(req.params.availId, req.body);
    res.json({ success: true, message: 'Availability updated', data: { availability: record } });
  }

  async deleteAvailability(req, res) {
    await groundsService.deleteAvailability(req.params.availId);
    res.json({ success: true, message: 'Availability deleted' });
  }

  // ===========================================================================
  // ADMIN — BOOKING SLOTS
  // ===========================================================================

  async listSlots(req, res) {
    const { date, sport_id, available_only } = req.query;
    const slots = await groundsService.listSlots(req.params.groundId, {
      date, sport_id, available_only: available_only === 'true'
    });
    res.json({ success: true, data: { slots } });
  }

  async createSlot(req, res) {
    const slot = await groundsService.createSlot(req.params.groundId, req.body);
    res.status(201).json({ success: true, message: 'Slot created', data: { slot } });
  }

  async updateSlot(req, res) {
    const slot = await groundsService.updateSlot(req.params.slotId, req.body);
    res.json({ success: true, message: 'Slot updated', data: { slot } });
  }

  async deleteSlot(req, res) {
    await groundsService.deleteSlot(req.params.slotId);
    res.json({ success: true, message: 'Slot deleted' });
  }

  // ===========================================================================
  // USER — BOOKINGS
  // ===========================================================================

  async createBooking(req, res) {
    const booking = await groundsService.createBooking(req.user.id, req.params.groundId, req.body);
    res.status(201).json({ success: true, message: 'Booking created successfully', data: { booking } });
  }

  async getMyBookings(req, res) {
    const bookings = await groundsService.getMyBookings(req.user.id);
    res.json({ success: true, data: { bookings } });
  }

  async getBookingById(req, res) {
    const isAdmin = req.user.roles && req.user.roles.includes('ADMIN');
    const booking = await groundsService.getBookingById(req.params.bookingId, req.user.id, isAdmin);
    res.json({ success: true, data: { booking } });
  }

  async cancelBooking(req, res) {
    const isAdmin = req.user.roles && req.user.roles.includes('ADMIN');
    const { reason } = req.body;
    const result = await groundsService.cancelBooking(req.params.bookingId, req.user.id, reason, isAdmin);
    res.json({ success: true, ...result });
  }
}

module.exports = new GroundsController();
