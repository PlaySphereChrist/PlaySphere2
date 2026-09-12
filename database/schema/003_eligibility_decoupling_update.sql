BEGIN;
ALTER TABLE eligibility_evaluations ALTER COLUMN registration_id DROP NOT NULL;
ALTER TABLE eligibility_evaluations ADD COLUMN tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
ALTER TABLE eligibility_evaluations ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE eligibility_overrides ALTER COLUMN registration_id DROP NOT NULL;
ALTER TABLE eligibility_overrides ADD COLUMN tournament_id UUID REFERENCES tournaments(id) ON DELETE RESTRICT;
ALTER TABLE eligibility_overrides ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE RESTRICT;
ALTER TABLE eligibility_overrides ADD COLUMN individual_player_profile_id UUID REFERENCES player_profiles(id) ON DELETE RESTRICT;

ALTER TABLE eligibility_evaluations ADD CONSTRAINT chk_eval_candidate CHECK (num_nonnulls(registration_id, team_id, player_profile_id) >= 1);
ALTER TABLE eligibility_overrides ADD CONSTRAINT chk_override_candidate CHECK (num_nonnulls(registration_id, team_id, individual_player_profile_id) >= 1);
COMMIT;
