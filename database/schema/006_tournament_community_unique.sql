BEGIN;

ALTER TABLE communities
  ADD CONSTRAINT unique_tournament_id UNIQUE (tournament_id);

COMMIT;
