-- =============================================================================
-- PlaySphere — Initial Database Schema
-- File   : database/schema/001_initial_schema.sql
-- Engine : PostgreSQL 15+
-- Notes  : Local development only. Run ONCE against a fresh database.
--          Requires the pgcrypto extension (used in seeds for password hashing).
--          Execute seeds/001_roles_and_development_users.sql after this file.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid(), crypt()


-- ---------------------------------------------------------------------------
-- 1. SHARED TRIGGER FUNCTION — keeps updated_at current on every UPDATE
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. ENUM TYPES
-- ---------------------------------------------------------------------------

CREATE TYPE tournament_format_type AS ENUM (
  'league',
  'knockout',
  'round_robin',
  'group_stage_knockout',
  'double_elimination'
);

CREATE TYPE tournament_status_type AS ENUM (
  'draft',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
  'archived'
);

CREATE TYPE tournament_participation_type AS ENUM (
  'team',
  'individual'
);

CREATE TYPE payment_entity_type AS ENUM (
  'ground_booking',
  'tournament_registration'
);

CREATE TYPE payment_status_type AS ENUM (
  'created',
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE post_category_type AS ENUM (
  'general',
  'equipment_request',
  'looking_for_players',
  'event_announcement',
  'discussion',
  'feedback'
);


-- =============================================================================
-- DOMAIN 1 — AUTHENTICATION / USERS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- roles
-- System roles. Seeded with: USER, TEAM_MANAGER, ORGANIZER, ADMIN.
-- PLAYER PROFILE IS NOT A ROLE.
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- users
-- Core account table. Public signup creates USER-role accounts only.
-- Organizer and Admin accounts are seeded; there is no public signup path.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      TEXT         NOT NULL,
  is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
  is_email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles
-- Many-to-many between users and system roles.
-- A normal user has exactly one role (USER). Assignment is tracked.
-- ---------------------------------------------------------------------------
CREATE TABLE user_roles (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID        NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- refresh_tokens
-- Stored hashed. Revocation is soft (revoked_at IS NOT NULL = revoked).
-- ---------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_refresh_token_expiry CHECK (expires_at > created_at)
);


-- =============================================================================
-- DOMAIN 2 — SPORTS / PLAYER PROFILES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- sports
-- Master list. Data-driven; never hardcoded into structure.
-- Seeded with: Football, Cricket, Basketball, Volleyball, Badminton.
-- ---------------------------------------------------------------------------
CREATE TABLE sports (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL UNIQUE,
  slug                  VARCHAR(100) NOT NULL UNIQUE,
  description           TEXT,
  min_players_per_team  INT          CHECK (min_players_per_team > 0),
  max_players_per_team  INT          CHECK (max_players_per_team > 0),
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sport_player_counts
    CHECK (
      min_players_per_team IS NULL OR
      max_players_per_team IS NULL OR
      min_players_per_team <= max_players_per_team
    )
);

CREATE TRIGGER trg_sports_updated_at
  BEFORE UPDATE ON sports
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- player_profiles
-- Optional extended profile. A user can exist without one.
-- 1:1 with users (enforced by UNIQUE on user_id).
-- ---------------------------------------------------------------------------
CREATE TABLE player_profiles (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name  VARCHAR(100) NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  date_of_birth DATE,
  gender        VARCHAR(20)  CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  city          VARCHAR(100),
  state         VARCHAR(100),
  phone         VARCHAR(20),
  is_public     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- player_sport_profiles
-- A player may have one profile per sport (skill level, position, etc.).
-- UNIQUE (player_profile_id, sport_id) prevents duplicates.
-- ---------------------------------------------------------------------------
CREATE TABLE player_sport_profiles (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  player_profile_id   UUID         NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  sport_id            UUID         NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  position            VARCHAR(100),
  skill_level         VARCHAR(20)  CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  years_of_experience INT          CHECK (years_of_experience >= 0),
  is_primary          BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (player_profile_id, sport_id)
);

CREATE TRIGGER trg_player_sport_profiles_updated_at
  BEFORE UPDATE ON player_sport_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- DOMAIN 3 — TEAMS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- teams
-- Belongs to a sport. manager_user_id is a regular user who manages the team
-- (not a separate role — see architecture rules).
-- ---------------------------------------------------------------------------
CREATE TABLE teams (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100) NOT NULL,
  sport_id         UUID         NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  manager_user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  logo_url         TEXT,
  description      TEXT,
  city             VARCHAR(100),
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- team_members
-- Links player_profiles (not raw users) to teams.
-- Historical records are preserved: left_at + is_active track lifecycle.
-- Partial unique index prevents a player being active in the same team twice.
-- ---------------------------------------------------------------------------
CREATE TABLE team_members (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_profile_id UUID        NOT NULL REFERENCES player_profiles(id) ON DELETE RESTRICT,
  team_role         VARCHAR(20) NOT NULL DEFAULT 'player'
                    CHECK (team_role IN ('player', 'captain', 'vice_captain', 'substitute')),
  jersey_number     INT         CHECK (jersey_number >= 0 AND jersey_number <= 999),
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at           TIMESTAMPTZ,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_team_member_dates CHECK (left_at IS NULL OR left_at > joined_at)
);

CREATE TRIGGER trg_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Prevents a player from being an active member of the same team twice.
CREATE UNIQUE INDEX uq_team_member_active
  ON team_members (team_id, player_profile_id)
  WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- team_invitations
-- Only one pending invitation per user per team at a time.
-- ---------------------------------------------------------------------------
CREATE TABLE team_invitations (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id            UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by_user_id UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status             VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  message            TEXT,
  expires_at         TIMESTAMPTZ,
  responded_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Only one pending invitation per (team, user) at a time.
CREATE UNIQUE INDEX uq_team_invitation_pending
  ON team_invitations (team_id, invited_user_id)
  WHERE status = 'pending';


-- =============================================================================
-- DOMAIN 4 — GROUNDS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- grounds
-- Venue with geolocation. owner_user_id is optional (some grounds may be
-- public venues not owned by a registered user).
-- ---------------------------------------------------------------------------
CREATE TABLE grounds (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(200)  NOT NULL,
  description    TEXT,
  address        TEXT          NOT NULL,
  city           VARCHAR(100)  NOT NULL,
  state          VARCHAR(100),
  latitude       DECIMAL(9,6),
  longitude      DECIMAL(9,6),
  owner_user_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  contact_phone  VARCHAR(20),
  contact_email  VARCHAR(255),
  amenities      JSONB,
  images         JSONB,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ground_latitude  CHECK (latitude  IS NULL OR (latitude  BETWEEN -90  AND 90)),
  CONSTRAINT chk_ground_longitude CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180))
);

CREATE TRIGGER trg_grounds_updated_at
  BEFORE UPDATE ON grounds
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- ground_sports
-- A ground can host multiple sports. Each sport may have different surface
-- type and capacity at the same ground.
-- ---------------------------------------------------------------------------
CREATE TABLE ground_sports (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_id    UUID         NOT NULL REFERENCES grounds(id) ON DELETE CASCADE,
  sport_id     UUID         NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  surface_type VARCHAR(100),
  capacity     INT          CHECK (capacity > 0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (ground_id, sport_id)
);

-- ---------------------------------------------------------------------------
-- ground_availability
-- Recurring weekly availability template (per day-of-week).
-- Concrete slots are generated into ground_booking_slots when needed.
-- ---------------------------------------------------------------------------
CREATE TABLE ground_availability (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_id             UUID         NOT NULL REFERENCES grounds(id) ON DELETE CASCADE,
  sport_id              UUID         REFERENCES sports(id) ON DELETE RESTRICT,
  day_of_week           SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
  start_time            TIME         NOT NULL,
  end_time              TIME         NOT NULL,
  slot_duration_minutes INT          NOT NULL DEFAULT 60 CHECK (slot_duration_minutes > 0),
  price_per_slot        DECIMAL(10,2) NOT NULL CHECK (price_per_slot >= 0),
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ground_availability_times CHECK (end_time > start_time)
);

CREATE TRIGGER trg_ground_availability_updated_at
  BEFORE UPDATE ON ground_availability
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- ground_booking_slots
-- Concrete date+time slots derived from ground_availability templates.
-- is_available flips to FALSE when a confirmed booking occupies the slot.
-- ---------------------------------------------------------------------------
CREATE TABLE ground_booking_slots (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_id    UUID          NOT NULL REFERENCES grounds(id) ON DELETE CASCADE,
  sport_id     UUID          REFERENCES sports(id) ON DELETE RESTRICT,
  slot_date    DATE          NOT NULL,
  start_time   TIME          NOT NULL,
  end_time     TIME          NOT NULL,
  price        DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_booking_slot_times CHECK (end_time > start_time),
  UNIQUE (ground_id, slot_date, start_time, end_time)
);

-- ---------------------------------------------------------------------------
-- ground_bookings
-- Supports advance + remaining payment model.
-- advance_amount + remaining_amount must always equal total_price.
-- ---------------------------------------------------------------------------
CREATE TABLE ground_bookings (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_id            UUID          NOT NULL REFERENCES grounds(id) ON DELETE RESTRICT,
  slot_id              UUID          NOT NULL REFERENCES ground_booking_slots(id) ON DELETE RESTRICT,
  booked_by_user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  team_id              UUID          REFERENCES teams(id) ON DELETE SET NULL,
  status               VARCHAR(30)   NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  total_price          DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  advance_amount       DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  remaining_amount     DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  advance_paid_at      TIMESTAMPTZ,
  remaining_paid_at    TIMESTAMPTZ,
  notes                TEXT,
  cancelled_at         TIMESTAMPTZ,
  cancellation_reason  TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_booking_amounts
    CHECK (advance_amount + remaining_amount = total_price)
);

CREATE TRIGGER trg_ground_bookings_updated_at
  BEFORE UPDATE ON ground_bookings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- DOMAIN 5 — CASUAL GAMES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- casual_games
-- Open or invite-only pickup games. May be linked to a ground booking.
-- ---------------------------------------------------------------------------
CREATE TABLE casual_games (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id              UUID         NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  ground_id             UUID         REFERENCES grounds(id) ON DELETE SET NULL,
  ground_booking_id     UUID         REFERENCES ground_bookings(id) ON DELETE SET NULL,
  organized_by_user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT,
  scheduled_at          TIMESTAMPTZ  NOT NULL,
  duration_minutes      INT          CHECK (duration_minutes > 0),
  max_participants      INT          CHECK (max_participants > 0),
  min_participants      INT          CHECK (min_participants > 0),
  is_private            BOOLEAN      NOT NULL DEFAULT FALSE,
  status                VARCHAR(30)  NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'full', 'in_progress', 'completed', 'cancelled')),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_casual_game_participants
    CHECK (min_participants IS NULL OR max_participants IS NULL OR min_participants <= max_participants)
);

CREATE TRIGGER trg_casual_games_updated_at
  BEFORE UPDATE ON casual_games
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- casual_game_participants
-- UNIQUE (casual_game_id, user_id) prevents duplicate participation.
-- player_profile_id is optional (user may not have a profile yet).
-- ---------------------------------------------------------------------------
CREATE TABLE casual_game_participants (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  casual_game_id    UUID        NOT NULL REFERENCES casual_games(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  player_profile_id UUID        REFERENCES player_profiles(id) ON DELETE SET NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'joined'
                    CHECK (status IN ('joined', 'waitlisted', 'cancelled', 'attended', 'no_show')),
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (casual_game_id, user_id)
);

CREATE TRIGGER trg_casual_game_participants_updated_at
  BEFORE UPDATE ON casual_game_participants
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- DOMAIN 6 — TOURNAMENTS (TournamentOS)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- tournaments
-- Organizer-owned. Lifecycle is represented via status enum.
-- Cancellation = status change, NOT deletion.
-- Completed tournaments can be archived; never hard-deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE tournaments (
  id                        UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      VARCHAR(200)                 NOT NULL,
  sport_id                  UUID                         NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  organizer_user_id         UUID                         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  format                    tournament_format_type       NOT NULL,
  participation_type        tournament_participation_type NOT NULL DEFAULT 'team',
  description               TEXT,
  rules                     TEXT,
  banner_url                TEXT,
  city                      VARCHAR(100),
  venue_details             TEXT,
  max_teams                 INT                          CHECK (max_teams > 0),
  min_teams                 INT                          CHECK (min_teams > 1),
  registration_fee          DECIMAL(10,2)                NOT NULL DEFAULT 0 CHECK (registration_fee >= 0),
  prize_pool                DECIMAL(10,2)                CHECK (prize_pool >= 0),
  prize_description         TEXT,
  registration_opens_at     TIMESTAMPTZ,
  registration_closes_at    TIMESTAMPTZ,
  starts_at                 TIMESTAMPTZ,
  ends_at                   TIMESTAMPTZ,
  status                    tournament_status_type       NOT NULL DEFAULT 'draft',
  created_at                TIMESTAMPTZ                  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ                  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tournament_team_counts
    CHECK (min_teams IS NULL OR max_teams IS NULL OR min_teams <= max_teams),
  CONSTRAINT chk_tournament_reg_dates
    CHECK (registration_opens_at IS NULL OR registration_closes_at IS NULL
           OR registration_opens_at < registration_closes_at),
  CONSTRAINT chk_tournament_dates
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- tournament_status_history
-- Immutable record of every status transition.
-- Preserves historical tournament state across the lifecycle.
-- ON DELETE RESTRICT prevents deleting a tournament that has history.
-- ---------------------------------------------------------------------------
CREATE TABLE tournament_status_history (
  id                  UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID                   NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  from_status         tournament_status_type,
  to_status           tournament_status_type  NOT NULL,
  changed_by_user_id  UUID                   REFERENCES users(id) ON DELETE SET NULL,
  reason              TEXT,
  changed_at          TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- tournament_eligibility_rules
-- Flexible rule definitions attached to a tournament.
-- rule_value is JSONB to support any rule type without schema changes.
-- ---------------------------------------------------------------------------
CREATE TABLE tournament_eligibility_rules (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID         NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  rule_type      VARCHAR(50)  NOT NULL
                 CHECK (rule_type IN ('min_age', 'max_age', 'gender', 'skill_level', 'city', 'custom')),
  rule_value     JSONB        NOT NULL,
  description    TEXT,
  is_mandatory   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- tournament_registrations
-- Supports both team-based and individual competition.
-- Exactly one of (team_id, individual_player_profile_id) must be set.
-- ON DELETE RESTRICT on tournament_id preserves historical data.
-- ---------------------------------------------------------------------------
CREATE TABLE tournament_registrations (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id               UUID        NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  team_id                     UUID        REFERENCES teams(id) ON DELETE RESTRICT,
  individual_player_profile_id UUID       REFERENCES player_profiles(id) ON DELETE RESTRICT,
  registered_by_user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                      VARCHAR(30) NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'disqualified')),
  registration_name           VARCHAR(200),
  eligibility_status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (eligibility_status IN ('pending', 'approved', 'rejected', 'overridden')),
  notes                       TEXT,
  registered_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at                 TIMESTAMPTZ,
  reviewed_by_user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Exactly one of team or individual must be set
  CONSTRAINT chk_registration_participant
    CHECK (
      (team_id IS NOT NULL AND individual_player_profile_id IS NULL) OR
      (team_id IS NULL     AND individual_player_profile_id IS NOT NULL)
    )
);

CREATE TRIGGER trg_tournament_registrations_updated_at
  BEFORE UPDATE ON tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- One active (pending/approved) registration per team per tournament.
CREATE UNIQUE INDEX uq_tournament_reg_team
  ON tournament_registrations (tournament_id, team_id)
  WHERE team_id IS NOT NULL
    AND status IN ('pending', 'approved');

-- One active registration per individual per tournament.
CREATE UNIQUE INDEX uq_tournament_reg_individual
  ON tournament_registrations (tournament_id, individual_player_profile_id)
  WHERE individual_player_profile_id IS NOT NULL
    AND status IN ('pending', 'approved');

-- ---------------------------------------------------------------------------
-- tournament_registration_players
-- Individual players listed under a team registration.
-- A player can only appear once per registration.
-- ---------------------------------------------------------------------------
CREATE TABLE tournament_registration_players (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id    UUID        NOT NULL REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  player_profile_id  UUID        NOT NULL REFERENCES player_profiles(id) ON DELETE RESTRICT,
  is_captain         BOOLEAN     NOT NULL DEFAULT FALSE,
  jersey_number      INT         CHECK (jersey_number >= 0 AND jersey_number <= 999),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (registration_id, player_profile_id)
);

-- ---------------------------------------------------------------------------
-- eligibility_evaluations
-- Per-rule evaluation result for each registration (or individual player
-- within a registration for player-level rules).
-- ---------------------------------------------------------------------------
CREATE TABLE eligibility_evaluations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   UUID        NOT NULL REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  rule_id           UUID        NOT NULL REFERENCES tournament_eligibility_rules(id) ON DELETE CASCADE,
  player_profile_id UUID        REFERENCES player_profiles(id) ON DELETE RESTRICT,
  result            VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'fail', 'pending', 'waived')),
  evaluated_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- eligibility_overrides
-- Organizer-recorded manual eligibility decisions with mandatory reason.
-- ---------------------------------------------------------------------------
CREATE TABLE eligibility_overrides (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id      UUID        NOT NULL REFERENCES tournament_registrations(id) ON DELETE RESTRICT,
  overridden_by_user_id UUID       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason               TEXT        NOT NULL,
  override_type        VARCHAR(20) NOT NULL CHECK (override_type IN ('approve', 'reject')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- tournament_waitlist
-- Ordered waiting list. position is unique per tournament.
-- Promoted entries move to tournament_registrations.
-- ---------------------------------------------------------------------------
CREATE TABLE tournament_waitlist (
  id                            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id                 UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id                       UUID        REFERENCES teams(id) ON DELETE CASCADE,
  individual_player_profile_id  UUID        REFERENCES player_profiles(id) ON DELETE CASCADE,
  registered_by_user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  position                      INT         NOT NULL CHECK (position > 0),
  status                        VARCHAR(20) NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting', 'promoted', 'withdrawn')),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, position),
  CONSTRAINT chk_waitlist_participant
    CHECK (
      (team_id IS NOT NULL AND individual_player_profile_id IS NULL) OR
      (team_id IS NULL     AND individual_player_profile_id IS NOT NULL)
    )
);

CREATE TRIGGER trg_tournament_waitlist_updated_at
  BEFORE UPDATE ON tournament_waitlist
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- DOMAIN 7 — FIXTURES / MATCHES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- fixtures
-- Scheduled match slots within a tournament round.
-- Round name captures labels like "Quarter Final", "Semi Final".
-- ---------------------------------------------------------------------------
CREATE TABLE fixtures (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID         NOT NULL REFERENCES tournaments(id) ON DELETE RESTRICT,
  round_number   INT          NOT NULL CHECK (round_number > 0),
  round_name     VARCHAR(100),
  match_number   INT          CHECK (match_number > 0),
  ground_id      UUID         REFERENCES grounds(id) ON DELETE SET NULL,
  scheduled_at   TIMESTAMPTZ,
  status         VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_fixtures_updated_at
  BEFORE UPDATE ON fixtures
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- matches
-- A contest between two participants. May belong to a fixture (tournament)
-- or to a casual game. Exactly one of fixture_id/casual_game_id should be set
-- in practice, though the DB allows both to be NULL for ad-hoc recording.
-- result_summary is JSONB for sport-specific score data.
-- winner_registration_id references the winning tournament_registration.
-- recorded_by_user_id is the organizer who officially recorded the result.
-- ---------------------------------------------------------------------------
CREATE TABLE matches (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id            UUID        REFERENCES fixtures(id) ON DELETE RESTRICT,
  tournament_id         UUID        REFERENCES tournaments(id) ON DELETE RESTRICT,
  casual_game_id        UUID        REFERENCES casual_games(id) ON DELETE RESTRICT,
  sport_id              UUID        NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  ground_id             UUID        REFERENCES grounds(id) ON DELETE SET NULL,
  scheduled_at          TIMESTAMPTZ,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  status                VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'abandoned', 'cancelled', 'walkover')),
  result_summary        JSONB,
  winner_registration_id UUID       REFERENCES tournament_registrations(id) ON DELETE SET NULL,
  recorded_by_user_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- match_participants
-- The two sides of a match. side = 'home' | 'away'.
-- For tournament matches: registration_id links to the team/individual entry.
-- For casual matches: player_profile_id or team_id is used directly.
-- score and result are JSONB/VARCHAR to support any sport.
-- ---------------------------------------------------------------------------
CREATE TABLE match_participants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  registration_id  UUID        REFERENCES tournament_registrations(id) ON DELETE RESTRICT,
  team_id          UUID        REFERENCES teams(id) ON DELETE RESTRICT,
  player_profile_id UUID       REFERENCES player_profiles(id) ON DELETE RESTRICT,
  side             VARCHAR(10) NOT NULL CHECK (side IN ('home', 'away')),
  score            JSONB,
  result           VARCHAR(20) CHECK (result IN ('win', 'loss', 'draw', 'walkover', 'abandoned')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- At least one participant identifier must be present
  CONSTRAINT chk_match_participant_identity
    CHECK (
      registration_id IS NOT NULL OR
      team_id IS NOT NULL OR
      player_profile_id IS NOT NULL
    )
);

CREATE TRIGGER trg_match_participants_updated_at
  BEFORE UPDATE ON match_participants
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Each match has exactly one 'home' and one 'away' participant.
CREATE UNIQUE INDEX uq_match_participant_side
  ON match_participants (match_id, side);


-- =============================================================================
-- DOMAIN 8 — PERFORMANCE / STATISTICS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- sport_stat_definitions
-- Defines what statistics exist for each sport (goals, wickets, points, etc.).
-- stat_key must be unique per sport.
-- ---------------------------------------------------------------------------
CREATE TABLE sport_stat_definitions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id    UUID         NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  stat_key    VARCHAR(100) NOT NULL,
  stat_name   VARCHAR(200) NOT NULL,
  description TEXT,
  data_type   VARCHAR(20)  NOT NULL CHECK (data_type IN ('integer', 'decimal', 'boolean', 'duration')),
  is_cumulative BOOLEAN    NOT NULL DEFAULT TRUE,
  applies_to  VARCHAR(10)  NOT NULL CHECK (applies_to IN ('player', 'team', 'both')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (sport_id, stat_key)
);

-- ---------------------------------------------------------------------------
-- performance_events
-- Atomic, organizer-recorded events during a match (goal, wicket, etc.).
-- These are the authoritative source of truth for statistics.
-- Players and team managers do NOT record official performance events.
-- ---------------------------------------------------------------------------
CREATE TABLE performance_events (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id                 UUID        NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
  sport_stat_definition_id UUID        NOT NULL REFERENCES sport_stat_definitions(id) ON DELETE RESTRICT,
  event_time_seconds       INT         CHECK (event_time_seconds >= 0),
  event_metadata           JSONB,
  recorded_by_user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recorded_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- performance_event_players
-- Links players (and optionally teams) to a specific performance event.
-- A player appears at most once per event.
-- ---------------------------------------------------------------------------
CREATE TABLE performance_event_players (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_event_id UUID          NOT NULL REFERENCES performance_events(id) ON DELETE CASCADE,
  player_profile_id    UUID          NOT NULL REFERENCES player_profiles(id) ON DELETE RESTRICT,
  team_id              UUID          REFERENCES teams(id) ON DELETE RESTRICT,
  value                DECIMAL(15,4),
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (performance_event_id, player_profile_id)
);

-- ---------------------------------------------------------------------------
-- player_statistics
-- Aggregated stats derived from performance_events. NOT manually editable.
-- Scope is identified by sport + optional tournament + optional season_year.
-- Function index on COALESCE handles NULL tournament/season uniqueness.
-- ---------------------------------------------------------------------------
CREATE TABLE player_statistics (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  player_profile_id UUID          NOT NULL REFERENCES player_profiles(id) ON DELETE RESTRICT,
  sport_id          UUID          NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  tournament_id     UUID          REFERENCES tournaments(id) ON DELETE RESTRICT,
  season_year       INT           CHECK (season_year >= 2000 AND season_year <= 2100),
  stat_key          VARCHAR(100)  NOT NULL,
  stat_value        DECIMAL(15,4) NOT NULL DEFAULT 0,
  computed_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_player_statistics_updated_at
  BEFORE UPDATE ON player_statistics
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Unique stat per player × sport × scope (handles NULL tournament/season via COALESCE).
CREATE UNIQUE INDEX uq_player_statistics
  ON player_statistics (
    player_profile_id,
    sport_id,
    stat_key,
    COALESCE(tournament_id::TEXT, 'NULL'),
    COALESCE(season_year::TEXT,   'NULL')
  );

-- ---------------------------------------------------------------------------
-- team_statistics
-- Aggregated stats derived from performance_events. NOT manually editable.
-- ---------------------------------------------------------------------------
CREATE TABLE team_statistics (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID          NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  sport_id      UUID          NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  tournament_id UUID          REFERENCES tournaments(id) ON DELETE RESTRICT,
  season_year   INT           CHECK (season_year >= 2000 AND season_year <= 2100),
  stat_key      VARCHAR(100)  NOT NULL,
  stat_value    DECIMAL(15,4) NOT NULL DEFAULT 0,
  computed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_team_statistics_updated_at
  BEFORE UPDATE ON team_statistics
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE UNIQUE INDEX uq_team_statistics
  ON team_statistics (
    team_id,
    sport_id,
    stat_key,
    COALESCE(tournament_id::TEXT, 'NULL'),
    COALESCE(season_year::TEXT,   'NULL')
  );

-- ---------------------------------------------------------------------------
-- leaderboards
-- Named leaderboard definitions. Entries are computed snapshots.
-- ---------------------------------------------------------------------------
CREATE TABLE leaderboards (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  sport_id         UUID         REFERENCES sports(id) ON DELETE RESTRICT,
  tournament_id    UUID         REFERENCES tournaments(id) ON DELETE RESTRICT,
  leaderboard_type VARCHAR(30)  NOT NULL
                   CHECK (leaderboard_type IN ('player', 'team', 'all_time', 'seasonal', 'tournament')),
  stat_key         VARCHAR(100) NOT NULL,
  season_year      INT          CHECK (season_year >= 2000 AND season_year <= 2100),
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  computed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_leaderboards_updated_at
  BEFORE UPDATE ON leaderboards
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- leaderboard_entries
-- Ranked entries. Exactly one of player_profile_id or team_id must be set.
-- Partial unique indexes prevent duplicate entries per leaderboard.
-- ---------------------------------------------------------------------------
CREATE TABLE leaderboard_entries (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id    UUID          NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  player_profile_id UUID          REFERENCES player_profiles(id) ON DELETE RESTRICT,
  team_id           UUID          REFERENCES teams(id) ON DELETE RESTRICT,
  rank              INT           NOT NULL CHECK (rank > 0),
  stat_value        DECIMAL(15,4) NOT NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_leaderboard_entry_subject
    CHECK (
      (player_profile_id IS NOT NULL AND team_id IS NULL) OR
      (player_profile_id IS NULL     AND team_id IS NOT NULL)
    )
);

CREATE TRIGGER trg_leaderboard_entries_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE UNIQUE INDEX uq_leaderboard_entry_player
  ON leaderboard_entries (leaderboard_id, player_profile_id)
  WHERE player_profile_id IS NOT NULL;

CREATE UNIQUE INDEX uq_leaderboard_entry_team
  ON leaderboard_entries (leaderboard_id, team_id)
  WHERE team_id IS NOT NULL;


-- =============================================================================
-- DOMAIN 9 — COMMUNITY
-- =============================================================================

-- ---------------------------------------------------------------------------
-- communities
-- Sport/location-based groups. One unified system; equipment requests are a
-- post category (post_category_type.equipment_request), not a separate module.
-- ---------------------------------------------------------------------------
CREATE TABLE communities (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  sport_id            UUID         REFERENCES sports(id) ON DELETE RESTRICT,
  city                VARCHAR(100),
  banner_url          TEXT,
  created_by_user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_public           BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- community_members
-- UNIQUE (community_id, user_id) prevents duplicate membership.
-- ---------------------------------------------------------------------------
CREATE TABLE community_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  UUID        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

-- ---------------------------------------------------------------------------
-- posts
-- Community posts. Soft-deleted with is_deleted + deleted_at.
-- Equipment requests are category = 'equipment_request'.
-- ---------------------------------------------------------------------------
CREATE TABLE posts (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id      UUID               NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_user_id    UUID               NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title             VARCHAR(300)       NOT NULL,
  body              TEXT               NOT NULL,
  category          post_category_type NOT NULL DEFAULT 'general',
  is_pinned         BOOLEAN            NOT NULL DEFAULT FALSE,
  is_locked         BOOLEAN            NOT NULL DEFAULT FALSE,
  is_deleted        BOOLEAN            NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- comments
-- Threaded via parent_comment_id (self-referential FK).
-- Soft-deleted with is_deleted + deleted_at.
-- ---------------------------------------------------------------------------
CREATE TABLE comments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_comment_id UUID       REFERENCES comments(id) ON DELETE CASCADE,
  body             TEXT        NOT NULL,
  is_deleted       BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- reports
-- Exactly one of post_id or comment_id must be set per report.
-- ---------------------------------------------------------------------------
CREATE TABLE reports (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  post_id             UUID        REFERENCES posts(id) ON DELETE CASCADE,
  comment_id          UUID        REFERENCES comments(id) ON DELETE CASCADE,
  reason              VARCHAR(100) NOT NULL,
  description         TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_report_subject
    CHECK (
      (post_id IS NOT NULL AND comment_id IS NULL) OR
      (post_id IS NULL     AND comment_id IS NOT NULL)
    )
);

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- DOMAIN 10 — PAYMENTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- payments
-- entity_type + entity_id distinguish ground booking vs tournament reg payments.
-- payment_type distinguishes advance vs remaining vs full payments.
-- razorpay_order_id and razorpay_payment_id are stored for reconciliation;
-- neither is a secret — the signature (HMAC) is verified server-side.
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                   UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entity_type          payment_entity_type  NOT NULL,
  entity_id            UUID                 NOT NULL,
  razorpay_order_id    VARCHAR(255)         UNIQUE,
  razorpay_payment_id  VARCHAR(255)         UNIQUE,
  razorpay_signature   TEXT,
  amount               DECIMAL(10,2)        NOT NULL CHECK (amount > 0),
  currency             VARCHAR(10)          NOT NULL DEFAULT 'INR',
  status               payment_status_type  NOT NULL DEFAULT 'created',
  payment_type         VARCHAR(20)          CHECK (payment_type IN ('full', 'advance', 'remaining')),
  description          TEXT,
  metadata             JSONB,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- refunds
-- Partial or full refund records linked to a payment.
-- ---------------------------------------------------------------------------
CREATE TABLE refunds (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id            UUID          NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  razorpay_refund_id    VARCHAR(255)  UNIQUE,
  amount                DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reason                TEXT,
  status                VARCHAR(20)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processed', 'failed')),
  initiated_by_user_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  processed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- DOMAIN 11 — NOTIFICATIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- notifications
-- Per-user inbox records. entity_type + entity_id allow linking to any entity.
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(100) NOT NULL,
  title        VARCHAR(300) NOT NULL,
  body         TEXT         NOT NULL,
  entity_type  VARCHAR(100),
  entity_id    UUID,
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- notification_preferences
-- Per-user, per-type opt-in/opt-out settings.
-- ---------------------------------------------------------------------------
CREATE TABLE notification_preferences (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type   VARCHAR(100) NOT NULL,
  is_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, notification_type)
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- DOMAIN 12 — AUDIT LOGS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- audit_logs
-- Append-only. No updated_at (immutable). No ON DELETE CASCADE on actor —
-- we want audit records to survive user deletion (actor_user_id SET NULL).
-- previous_state and new_state capture the JSONB snapshots of what changed.
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
  actor_role      VARCHAR(50),
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(100) NOT NULL,
  entity_id       UUID,
  previous_state  JSONB,
  new_state       JSONB,
  reason          TEXT,
  metadata        JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- INDEXES
-- (All FK columns not already covered by PK/UNIQUE get an explicit index.)
-- =============================================================================

-- --- Domain 1: Auth / Users ---
CREATE INDEX idx_user_roles_role_id          ON user_roles (role_id);
CREATE INDEX idx_refresh_tokens_user_id      ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at   ON refresh_tokens (expires_at);

-- --- Domain 2: Sports / Player Profiles ---
CREATE INDEX idx_player_profiles_user_id           ON player_profiles (user_id);
CREATE INDEX idx_player_sport_profiles_sport_id    ON player_sport_profiles (sport_id);

-- --- Domain 3: Teams ---
CREATE INDEX idx_teams_sport_id              ON teams (sport_id);
CREATE INDEX idx_teams_manager_user_id       ON teams (manager_user_id);
CREATE INDEX idx_team_members_team_id        ON team_members (team_id);
CREATE INDEX idx_team_members_player_profile_id ON team_members (player_profile_id);
CREATE INDEX idx_team_invitations_team_id    ON team_invitations (team_id);
CREATE INDEX idx_team_invitations_invited_user_id ON team_invitations (invited_user_id);

-- --- Domain 4: Grounds ---
CREATE INDEX idx_grounds_city                ON grounds (city);
CREATE INDEX idx_grounds_owner_user_id       ON grounds (owner_user_id);
CREATE INDEX idx_ground_sports_ground_id     ON ground_sports (ground_id);
CREATE INDEX idx_ground_sports_sport_id      ON ground_sports (sport_id);
CREATE INDEX idx_ground_availability_ground_id ON ground_availability (ground_id);
CREATE INDEX idx_ground_booking_slots_ground_id ON ground_booking_slots (ground_id);
CREATE INDEX idx_ground_booking_slots_slot_date ON ground_booking_slots (slot_date);
CREATE INDEX idx_ground_bookings_ground_id   ON ground_bookings (ground_id);
CREATE INDEX idx_ground_bookings_slot_id     ON ground_bookings (slot_id);
CREATE INDEX idx_ground_bookings_user_id     ON ground_bookings (booked_by_user_id);
CREATE INDEX idx_ground_bookings_status      ON ground_bookings (status);

-- --- Domain 5: Casual Games ---
CREATE INDEX idx_casual_games_sport_id       ON casual_games (sport_id);
CREATE INDEX idx_casual_games_ground_id      ON casual_games (ground_id);
CREATE INDEX idx_casual_games_organizer_id   ON casual_games (organized_by_user_id);
CREATE INDEX idx_casual_games_scheduled_at   ON casual_games (scheduled_at);
CREATE INDEX idx_casual_game_participants_game_id  ON casual_game_participants (casual_game_id);
CREATE INDEX idx_casual_game_participants_user_id  ON casual_game_participants (user_id);

-- --- Domain 6: Tournaments ---
CREATE INDEX idx_tournaments_sport_id        ON tournaments (sport_id);
CREATE INDEX idx_tournaments_organizer_id    ON tournaments (organizer_user_id);
CREATE INDEX idx_tournaments_status          ON tournaments (status);
CREATE INDEX idx_tournament_status_history_tournament_id ON tournament_status_history (tournament_id);
CREATE INDEX idx_eligibility_rules_tournament_id   ON tournament_eligibility_rules (tournament_id);
CREATE INDEX idx_tournament_registrations_tournament_id ON tournament_registrations (tournament_id);
CREATE INDEX idx_tournament_registrations_team_id       ON tournament_registrations (team_id);
CREATE INDEX idx_tournament_registrations_individual_id ON tournament_registrations (individual_player_profile_id);
CREATE INDEX idx_tournament_registrations_status        ON tournament_registrations (status);
CREATE INDEX idx_reg_players_registration_id ON tournament_registration_players (registration_id);
CREATE INDEX idx_reg_players_profile_id      ON tournament_registration_players (player_profile_id);
CREATE INDEX idx_eligibility_evals_reg_id    ON eligibility_evaluations (registration_id);
CREATE INDEX idx_eligibility_evals_rule_id   ON eligibility_evaluations (rule_id);
CREATE INDEX idx_eligibility_overrides_reg_id ON eligibility_overrides (registration_id);
CREATE INDEX idx_tournament_waitlist_tournament_id ON tournament_waitlist (tournament_id);

-- --- Domain 7: Fixtures / Matches ---
CREATE INDEX idx_fixtures_tournament_id      ON fixtures (tournament_id);
CREATE INDEX idx_fixtures_round_number       ON fixtures (tournament_id, round_number);
CREATE INDEX idx_matches_fixture_id          ON matches (fixture_id);
CREATE INDEX idx_matches_tournament_id       ON matches (tournament_id);
CREATE INDEX idx_matches_casual_game_id      ON matches (casual_game_id);
CREATE INDEX idx_matches_sport_id            ON matches (sport_id);
CREATE INDEX idx_matches_status              ON matches (status);
CREATE INDEX idx_match_participants_match_id ON match_participants (match_id);
CREATE INDEX idx_match_participants_reg_id   ON match_participants (registration_id);
CREATE INDEX idx_match_participants_team_id  ON match_participants (team_id);

-- --- Domain 8: Performance / Statistics ---
CREATE INDEX idx_performance_events_match_id    ON performance_events (match_id);
CREATE INDEX idx_performance_events_stat_def_id ON performance_events (sport_stat_definition_id);
CREATE INDEX idx_perf_event_players_event_id    ON performance_event_players (performance_event_id);
CREATE INDEX idx_perf_event_players_profile_id  ON performance_event_players (player_profile_id);
CREATE INDEX idx_player_statistics_profile_id   ON player_statistics (player_profile_id);
CREATE INDEX idx_player_statistics_sport_id     ON player_statistics (sport_id);
CREATE INDEX idx_player_statistics_tournament_id ON player_statistics (tournament_id);
CREATE INDEX idx_team_statistics_team_id         ON team_statistics (team_id);
CREATE INDEX idx_team_statistics_sport_id        ON team_statistics (sport_id);
CREATE INDEX idx_leaderboard_entries_leaderboard_id ON leaderboard_entries (leaderboard_id);
CREATE INDEX idx_leaderboard_entries_rank        ON leaderboard_entries (leaderboard_id, rank);

-- --- Domain 9: Community ---
CREATE INDEX idx_communities_sport_id         ON communities (sport_id);
CREATE INDEX idx_communities_city             ON communities (city);
CREATE INDEX idx_community_members_community_id ON community_members (community_id);
CREATE INDEX idx_community_members_user_id    ON community_members (user_id);
CREATE INDEX idx_posts_community_id           ON posts (community_id);
CREATE INDEX idx_posts_author_id              ON posts (author_user_id);
CREATE INDEX idx_posts_category              ON posts (category);
CREATE INDEX idx_posts_created_at            ON posts (created_at DESC);
CREATE INDEX idx_comments_post_id            ON comments (post_id);
CREATE INDEX idx_comments_author_id          ON comments (author_user_id);
CREATE INDEX idx_comments_parent_id          ON comments (parent_comment_id);
CREATE INDEX idx_reports_post_id             ON reports (post_id);
CREATE INDEX idx_reports_comment_id          ON reports (comment_id);
CREATE INDEX idx_reports_status             ON reports (status);

-- --- Domain 10: Payments ---
CREATE INDEX idx_payments_user_id            ON payments (user_id);
CREATE INDEX idx_payments_entity             ON payments (entity_type, entity_id);
CREATE INDEX idx_payments_status             ON payments (status);
CREATE INDEX idx_refunds_payment_id          ON refunds (payment_id);

-- --- Domain 11: Notifications ---
CREATE INDEX idx_notifications_user_id       ON notifications (user_id);
CREATE INDEX idx_notifications_user_unread   ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at    ON notifications (created_at DESC);
CREATE INDEX idx_notification_prefs_user_id  ON notification_preferences (user_id);

-- --- Domain 12: Audit ---
CREATE INDEX idx_audit_logs_actor_user_id    ON audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_entity          ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_action          ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at      ON audit_logs (created_at DESC);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
