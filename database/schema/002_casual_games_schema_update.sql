-- =============================================================================
-- PlaySphere — Casual Games Schema Update
-- File   : database/schema/002_casual_games_schema_update.sql
-- Notes  : Adds missing columns required for Phase 8 Casual Games
-- =============================================================================

ALTER TABLE casual_games
ADD COLUMN location_name VARCHAR(255),
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN skill_level VARCHAR(30) CHECK (skill_level IN ('Beginner', 'Intermediate', 'Expert', 'Professional'));
