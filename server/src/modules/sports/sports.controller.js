const sportsService = require('./sports.service');

class SportsController {
  
  // ==========================================
  // PUBLIC CATALOG ENDPOINTS
  // ==========================================
  
  async getSportsCatalog(req, res) {
    const sports = await sportsService.getActiveSports();
    res.json({
      success: true,
      data: { sports }
    });
  }

  // ==========================================
  // PLAYER SPORT PROFILES (AUTHENTICATED)
  // ==========================================

  async getMySports(req, res) {
    const profiles = await sportsService.getMySportProfiles(req.user.id);
    res.json({
      success: true,
      data: { profiles }
    });
  }

  async addMySport(req, res) {
    // Only accept allowed fields
    const { sport_id, position, skill_level, years_of_experience, is_primary } = req.body;
    
    if (!sport_id) {
      return res.status(400).json({ success: false, message: 'sport_id is required' });
    }

    const newProfile = await sportsService.addSportProfile(req.user.id, {
      sport_id,
      position,
      skill_level,
      years_of_experience,
      is_primary
    });

    res.status(201).json({
      success: true,
      message: 'Sport profile added successfully',
      data: { profile: newProfile }
    });
  }

  async updateMySport(req, res) {
    const { sportProfileId } = req.params;
    const { position, skill_level, years_of_experience, is_primary } = req.body;

    const updatedProfile = await sportsService.updateSportProfile(req.user.id, sportProfileId, {
      position,
      skill_level,
      years_of_experience,
      is_primary
    });

    res.json({
      success: true,
      message: 'Sport profile updated successfully',
      data: { profile: updatedProfile }
    });
  }

  async deleteMySport(req, res) {
    const { sportProfileId } = req.params;
    
    await sportsService.deleteSportProfile(req.user.id, sportProfileId);
    
    res.json({
      success: true,
      message: 'Sport profile deleted successfully'
    });
  }
}

module.exports = new SportsController();
