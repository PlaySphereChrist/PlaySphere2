-- =============================================================================
-- PlaySphere — Community Schema Additive Migration
-- File   : database/schema/004_community_schema.sql
-- Engine : PostgreSQL 15+
--
-- PURPOSE
--   The core community tables (communities, community_members, posts, comments,
--   reports) already exist in 001_initial_schema.sql. This migration:
--     1. Adds moderation columns to posts and comments (idempotently).
--     2. Adds moderation_action column to reports (idempotently).
--     3. Seeds the single unified PlaySphere Global Community (idempotently).
--
-- IDEMPOTENT — safe to run multiple times.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. ADD MODERATION COLUMNS TO posts
--    posts.is_moderated  — TRUE when hidden by admin moderation
--    posts.moderation_reason — text note from admin
-- ---------------------------------------------------------------------------
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_moderated    BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- ---------------------------------------------------------------------------
-- 2. ADD MODERATION COLUMNS TO comments
-- ---------------------------------------------------------------------------
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS is_moderated    BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- ---------------------------------------------------------------------------
-- 3. ADD moderation_action TO reports
--    Records what action was taken when resolving/dismissing a report.
-- ---------------------------------------------------------------------------
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS moderation_action VARCHAR(255);

-- ---------------------------------------------------------------------------
-- 4. SEED — Initialize the single unified PlaySphere Community
--    Uses the organizer dev account. Idempotent via IF NOT EXISTS pattern.
--    community_members entry for the organizer added with role='admin'.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_organizer_id  UUID;
  v_community_id  UUID;
BEGIN
  SELECT id INTO v_organizer_id
  FROM users
  WHERE email = 'organizer@playsphere.local'
  LIMIT 1;

  IF v_organizer_id IS NULL THEN
    RAISE NOTICE 'Organizer dev account not found — skipping community seed.';
    RETURN;
  END IF;

  SELECT id INTO v_community_id
  FROM communities
  WHERE name = 'PlaySphere Global Community'
  LIMIT 1;

  IF v_community_id IS NULL THEN
    INSERT INTO communities (name, description, is_public, is_active, created_by_user_id)
    VALUES (
      'PlaySphere Global Community',
      'The unified community platform for all PlaySphere users — discuss sports, find teammates, share equipment.',
      TRUE,
      TRUE,
      v_organizer_id
    )
    RETURNING id INTO v_community_id;

    RAISE NOTICE 'Created PlaySphere Global Community: %', v_community_id;
  ELSE
    RAISE NOTICE 'PlaySphere Global Community already exists: %', v_community_id;
  END IF;

  -- Ensure organizer is a member (role = admin)
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (v_community_id, v_organizer_id, 'admin')
  ON CONFLICT (community_id, user_id) DO NOTHING;

END $$;

COMMIT;

-- =============================================================================
-- END OF MIGRATION 004
-- =============================================================================
