-- =============================================================================
-- PlaySphere — Roles & Development Seed Data
-- File   : database/seeds/001_roles_and_development_users.sql
-- Engine : PostgreSQL 15+ with pgcrypto extension
--
-- PURPOSE
--   Bootstraps the four system roles, five initial sports, and two
--   preset development-only accounts (organizer + admin).
--
-- SECURITY NOTICE
--   ┌─────────────────────────────────────────────────────────────────────┐
--   │  DEVELOPMENT ACCOUNTS — LOCAL USE ONLY                              │
--   │                                                                     │
--   │  Organizer                                                          │
--   │    Email    : organizer@playsphere.local                            │
--   │    Password : OrganizerDev@123                                      │
--   │                                                                     │
--   │  Admin                                                              │
--   │    Email    : admin@playsphere.local                                │
--   │    Password : AdminDev@123                                          │
--   │                                                                     │
--   │  Passwords are hashed with bcrypt (cost factor 12) using           │
--   │  PostgreSQL's pgcrypto crypt() + gen_salt('bf', 12).               │
--   │  The hashes stored are fully compatible with Node.js bcryptjs      │
--   │  bcrypt.compare() calls made by the application.                   │
--   │                                                                     │
--   │  • Never use these credentials in staging or production.           │
--   │  • Never commit a .env file containing real credentials.           │
--   │  • Change passwords before connecting to any external network.     │
--   │  • No Razorpay secrets are stored here.                            │
--   └─────────────────────────────────────────────────────────────────────┘
--
-- HOW TO RUN
--   See database/README.md
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. ROLES
-- Four system roles. PLAYER PROFILE IS NOT A ROLE.
-- ---------------------------------------------------------------------------

INSERT INTO roles (name, description) VALUES
  (
    'USER',
    'Standard registered user. Created via public signup. May optionally create a Player Profile.'
  ),
  (
    'TEAM_MANAGER',
    'A USER who manages one or more teams. Not a separate account — assigned when a user creates or is appointed as manager of a team.'
  ),
  (
    'ORGANIZER',
    'Can create and manage tournaments, record official match results, and manage eligibility. Seeded account only — no public signup.'
  ),
  (
    'ADMIN',
    'Full platform administration. Manages users, roles, sports, communities, and audit logs. Seeded account only — no public signup.'
  )
ON CONFLICT (name) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. SPORTS
-- Initial data-driven sports list. Additional sports can be added via the
-- admin panel or further seed/migration files without schema changes.
-- ---------------------------------------------------------------------------

INSERT INTO sports (name, slug, description, min_players_per_team, max_players_per_team) VALUES
  (
    'Football',
    'football',
    'Association football (soccer). 11 players per side.',
    7, 11
  ),
  (
    'Cricket',
    'cricket',
    'Cricket. 11 players per side.',
    7, 11
  ),
  (
    'Basketball',
    'basketball',
    'Basketball. 5 players per side.',
    3, 5
  ),
  (
    'Volleyball',
    'volleyball',
    'Volleyball. 6 players per side.',
    4, 6
  ),
  (
    'Badminton',
    'badminton',
    'Badminton. Singles (1v1) or doubles (2v2).',
    1, 2
  )
ON CONFLICT (name) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. PRESET DEVELOPMENT ACCOUNTS
--
-- Passwords are hashed inline using pgcrypto:
--   crypt('<password>', gen_salt('bf', 12))
-- Cost factor 12 matches the default used by the Node.js bcryptjs library.
--
-- The resulting $2a$12$... hash is verified by bcryptjs.compare() in the app.
-- ---------------------------------------------------------------------------

-- 3a. Organizer account
WITH inserted_organizer AS (
  INSERT INTO users (email, password_hash, is_active, is_email_verified)
  VALUES (
    'organizer@playsphere.local',
    crypt('OrganizerDev@123', gen_salt('bf', 12)),
    TRUE,
    TRUE
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id
),
organizer_role AS (
  SELECT id FROM roles WHERE name = 'ORGANIZER'
)
INSERT INTO user_roles (user_id, role_id)
SELECT inserted_organizer.id, organizer_role.id
FROM inserted_organizer, organizer_role
WHERE inserted_organizer.id IS NOT NULL
ON CONFLICT DO NOTHING;


-- 3b. Admin account
WITH inserted_admin AS (
  INSERT INTO users (email, password_hash, is_active, is_email_verified)
  VALUES (
    'admin@playsphere.local',
    crypt('AdminDev@123', gen_salt('bf', 12)),
    TRUE,
    TRUE
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id
),
admin_role AS (
  SELECT id FROM roles WHERE name = 'ADMIN'
)
INSERT INTO user_roles (user_id, role_id)
SELECT inserted_admin.id, admin_role.id
FROM inserted_admin, admin_role
WHERE inserted_admin.id IS NOT NULL
ON CONFLICT DO NOTHING;


COMMIT;

-- =============================================================================
-- END OF SEED
-- =============================================================================
