# PlaySphere — Database Guide

## Engine

**PostgreSQL 18** (local machine only)  
Driver used by the application: `pg` (node-postgres) — no ORM, no query builder.

---

## Directory Layout

```
database/
├── schema/
│   └── 001_initial_schema.sql     ← Full normalized schema (run once on a fresh DB)
├── seeds/
│   └── 001_roles_and_development_users.sql  ← Roles, sports, dev accounts
└── migrations/
    └── (future incremental change files go here)
```

| Folder | Purpose |
|---|---|
| `schema/` | Canonical full-schema files. Run once against a blank database. |
| `seeds/` | Reference / development data. Safe to re-run (uses ON CONFLICT DO NOTHING). |
| `migrations/` | Future incremental changes (ALTER TABLE, new tables, etc.). Not yet used. |

---

## Prerequisites

- PostgreSQL 18 installed and running locally.
- `psql` available on your PATH (or use full path to `psql.exe`).
- A PostgreSQL superuser or a user with CREATEDB privileges.

On Windows the default installation puts `psql.exe` at:
```
C:\Program Files\PostgreSQL\18\bin\psql.exe
```

Add that directory to your `PATH` for convenience, or invoke `psql` via its full path.

---

## Step 1 — Create the Database

Connect as your PostgreSQL superuser (e.g. `postgres`) and create the database:

```bash
psql -U postgres -c "CREATE DATABASE playsphere;"
```

Or interactively inside `psql`:

```sql
CREATE DATABASE playsphere;
```

---

## Step 2 — Apply the Schema

Run the schema file against the new database.  
This creates all tables, types, triggers, functions, and indexes.

```bash
psql -U postgres -d playsphere -f database/schema/001_initial_schema.sql
```

> **Run only once** on a clean database. Running it a second time will fail
> because the tables already exist. Use migration files for future changes.

---

## Step 3 — Apply the Seed

Run the seed file to insert the four system roles, five initial sports,
and the two preset development accounts.

```bash
psql -U postgres -d playsphere -f database/seeds/001_roles_and_development_users.sql
```

The seed is wrapped in a transaction and uses `ON CONFLICT DO NOTHING`,
so it is safe to run again without duplicating data.

---

## Development Preset Accounts

> ⚠️ **These accounts exist for local development only.**  
> Never use these credentials in staging or production.  
> Change or delete them before exposing the service to any network.

| Role | Email | Password |
|---|---|---|
| Organizer | `organizer@playsphere.local` | `OrganizerDev@123` |
| Admin | `admin@playsphere.local` | `AdminDev@123` |

### Why these passwords are safe in source code

- Passwords are **bcrypt-hashed** (cost factor 12) using PostgreSQL's `pgcrypto`
  `crypt()` function **at seed-execution time**.  
  The SQL file contains only plaintext passwords for the seeding step;
  the database never stores plaintext.
- The resulting hash (e.g. `$2a$12$...`) is compatible with `bcryptjs.compare()`
  in the Node.js application.
- These are **clearly labelled development credentials** used exclusively on a
  local machine. No real secrets, no Razorpay keys, no JWT secrets are included.

---

## Required PostgreSQL Extension

The schema file enables the `pgcrypto` extension automatically:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

This provides:
- `gen_random_uuid()` — UUID generation (also built-in since PostgreSQL 13).
- `crypt()` / `gen_salt()` — bcrypt password hashing used in seeds.

If your PostgreSQL user lacks the `CREATE EXTENSION` privilege, run:

```bash
psql -U postgres -d playsphere -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

---

## Verifying the Installation

After running schema + seed, run these quick checks:

```bash
psql -U postgres -d playsphere
```

```sql
-- Table count (expect 45 tables)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Roles (expect 4 rows)
SELECT name FROM roles ORDER BY name;

-- Sports (expect 5 rows)
SELECT name FROM sports ORDER BY name;

-- Dev accounts (expect 2 rows with hashed passwords)
SELECT email, is_active, is_email_verified,
       LEFT(password_hash, 7) AS hash_prefix
FROM users
ORDER BY email;

-- Role assignments (expect 2 rows)
SELECT u.email, r.name AS role
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
ORDER BY u.email;
```

---

## Database Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Table | `snake_case`, plural | `team_members` |
| Column | `snake_case` | `created_at` |
| FK column | `<singular_table>_id` | `user_id` |
| Primary key | always `id` (UUID) | `id UUID` |
| Enum type | `snake_case` + `_type` suffix | `tournament_status_type` |
| Index | `idx_<table>_<column(s)>` | `idx_users_email` |
| Partial unique index | `uq_<table>_<description>` | `uq_team_member_active` |
| Trigger | `trg_<table>_updated_at` | `trg_users_updated_at` |

---

## Migration / Seed Strategy

### Schema files (`schema/`)
- Run **once** against a blank database to establish the full baseline.
- File naming: `NNN_<description>.sql` (three-digit zero-padded).
- Never edit an already-applied schema file; write a migration instead.

### Migration files (`migrations/`)
- Each file represents an **incremental, ordered change** (ALTER TABLE, CREATE TABLE, etc.).
- File naming: `NNNN_<description>.sql` (four-digit zero-padded).
- A migration runner will be added in a later phase.
- For now, apply manually with `psql -f`.

### Seed files (`seeds/`)
- Reference data and development accounts.
- Always idempotent (`ON CONFLICT DO NOTHING` or `INSERT … WHERE NOT EXISTS`).
- File naming: `NNN_<description>.sql`.

---

## Connecting from the Application

The application reads connection details from environment variables.
Copy `.env.example` to `.env` and fill in the PostgreSQL section:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=playsphere
DB_USER=postgres
DB_PASSWORD=your_local_postgres_password
```

The server creates a connection pool via `pg.Pool` in `server/src/config/db.js`
(implemented in a later phase).

---

## Resetting the Database (Development Only)

To start fresh:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS playsphere;"
psql -U postgres -c "CREATE DATABASE playsphere;"
psql -U postgres -d playsphere -f database/schema/001_initial_schema.sql
psql -U postgres -d playsphere -f database/seeds/001_roles_and_development_users.sql
```
