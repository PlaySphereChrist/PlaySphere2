BEGIN;

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;

-- A community can either belong to a sport/city generally, or specifically to a tournament.
-- A tournament community shouldn't be publicly listed in the generic communities list in the same way,
-- though that logic will be in the backend service.

COMMIT;
