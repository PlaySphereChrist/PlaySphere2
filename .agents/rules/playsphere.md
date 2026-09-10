# PlaySphere — Agent Rules

These rules govern every AI agent working on the PlaySphere codebase.  
**Read and follow all rules before writing or modifying any code.**

---

## 1. Project Identity

- The product is called **PlaySphere** — a local-only, full-stack sports ecosystem platform.
- **TournamentOS** is the tournament-management module *inside* PlaySphere, not a separate product.
- Development target: **local machine only**. Do not add cloud, Docker-Compose-for-production, or serverless configuration.

---

## 2. Technology — Mandatory Stack

| Layer | Allowed | Forbidden |
|---|---|---|
| Frontend | React + Vite (JavaScript) | Next.js, Angular, Vue, TypeScript (unless explicitly asked) |
| Styling | Tailwind CSS | CSS-in-JS, SASS, raw CSS modules (unless explicitly asked) |
| Backend | Node.js + Express.js | NestJS, Fastify, Koa (unless explicitly asked) |
| Database | PostgreSQL + `pg` driver | **MongoDB, Mongoose**, any other database |
| Auth | JWT + bcrypt | Passport.js sessions, OAuth (unless explicitly asked) |
| Payments | Razorpay | Stripe, PayPal (unless explicitly asked) |
| Maps | OpenStreetMap + Leaflet.js | Google Maps, Mapbox (unless explicitly asked) |

> ❌ **Never use MongoDB or Mongoose under any circumstances.**

---

## 3. Architecture — Hard Rules

- **Modular monolith only.** Do NOT introduce microservices, separate processes, or message queues.
- **REST API only.** Do NOT add GraphQL or tRPC.
- **No ORM.** Use plain SQL via `pg`. Do not install Sequelize, Prisma, TypeORM, Drizzle, or similar.
- **No query builders** (Knex etc.) unless explicitly approved by the user.
- All server domain logic lives in `server/src/modules/<name>/`.
- All client domain logic lives in `client/src/features/<name>/`.

---

## 4. User Types & Authentication Rules

```
Role        | Public Signup | Notes
------------|---------------|--------------------------------------------
USER        | ✅ YES        | Default role assigned at signup (implemented Phase 3)
TEAM_MANAGER| ❌ NO         | A USER referenced as manager_user_id on a teams row
ORGANIZER   | ❌ NO         | Seeded preset account only
ADMIN       | ❌ NO         | Seeded preset account only
```

- **Player Profile** is optional and is NOT the same as a User account.
  - A user can exist without a player profile.
  - Do not conflate `users` and `player_profiles` tables.
- **Team Manager** is NOT a separate account type or role.
  - A team manager is an existing USER referenced as `manager_user_id` on the `teams` table.
  - Do NOT create a separate manager signup flow or a TEAM_MANAGER login endpoint.
- **One login endpoint** for all roles — roles are loaded from PostgreSQL after token verification, never from the JWT payload or client input.
- Do NOT add a separate organizer or admin registration endpoint.
- Emails are normalized to lowercase before storage and lookup.

---

## 5. Database Rules

- Primary keys: `uuid`, generated with `gen_random_uuid()`.
- Every table must have `created_at TIMESTAMPTZ DEFAULT NOW()`.
- Tables that can be updated must have `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- Foreign keys must be declared explicitly.
- Use PostgreSQL `CREATE TYPE … AS ENUM` for role/status/state columns.
- Migration files: `database/migrations/NNNN_<description>.sql` (4-digit zero-padded).
- Seed files: `database/seeds/NNNN_<description>.sql`.
- Naming: tables = `snake_case` plural; columns = `snake_case`; FK = `<singular_table>_id`.
- **Do NOT modify** `database/schema/001_initial_schema.sql` (Phase 1, locked). Use migration files for any future schema changes.

---

## 6. Server Module Convention

Each module under `server/src/modules/<name>/` must follow this layout:

```
<name>.routes.js      — Express Router, endpoint definitions only
<name>.controller.js  — Request parsing, input validation, response shaping
<name>.service.js     — Business logic + SQL queries (using pg pool)
```

Optionally:
- `<name>.queries.js` — extracted SQL strings for complex modules
- `<name>.middleware.js` — route-level middleware (ownership, permission checks)

Do NOT put business logic in routes. Do NOT put SQL in controllers.

---

## 7. Client Feature Convention

Each feature under `client/src/features/<name>/` may contain:

```
components/   — Feature-specific React components
hooks/        — Feature-specific custom hooks
api.js        — API call functions for this feature (uses the shared api client)
index.js      — Public exports from this feature
```

Page-level components live in `client/src/pages/`.  
Shared/reusable components live in `client/src/components/`.

---

## 8. Responsive UI — Mandatory

Every frontend screen **must be responsive** using Tailwind CSS breakpoints:

| Prefix | Breakpoint |
|---|---|
| (none) | Mobile-first base styles |
| `sm:` | ≥ 640px |
| `md:` | ≥ 768px (tablet) |
| `lg:` | ≥ 1024px (laptop/desktop) |
| `xl:` | ≥ 1280px (large desktop) |

- Responsive design must be implemented **as each feature is built** — not deferred.
- This applies to all user types: Player/User, Team Manager, Organizer, Admin.
- Do NOT ship non-responsive pages with a plan to fix them later.
- Do NOT use fixed pixel widths for layout containers. Use Tailwind responsive utilities.

---

## 9. Casual Games Rules

- Casual Games must support a **player level**: `beginner`, `intermediate`, `expert`.
- Level is set by the game creator and can be used to filter/discover games.
- **Player Profile is NOT required** to create or join a casual game.
- Casual Games are **entirely separate** from:
  - Official tournaments
  - Official matches and fixtures
  - Official performance events
  - Official player statistics
  - Official leaderboards
- Do NOT connect casual game results to any official statistics pipeline.
- Do NOT add casual games to the tournament bracket or match management system.

---

## 10. Official Match Management Rules

- Official matches exist only within the Tournament → Fixture → Match flow.
- **Organizer** records official results, scores, and performance events.
- **Players and Team Managers** must NOT be able to directly edit official match results or official statistics.
- The authoritative pipeline is:
  `performance_events` → `player_statistics` / `team_statistics`
- The following tables already exist in the Phase 1 schema — **do NOT recreate them**:
  `fixtures`, `matches`, `match_participants`, `performance_events`,
  `performance_event_players`, `player_statistics`, `team_statistics`
- When implementing the matches phase, reuse and extend the existing tables only.

---

## 11. Community AI Moderation Rules

- Community posts/comments must pass through an AI-assisted moderation check.
- Moderation outcome categories: **safe** (publish), **unsafe** (block), **uncertain** (flag for Admin).
- AI moderation is an **assistance layer only**. Admin moderation and user reporting must remain available.
- **Never** apply AI moderation to: official match results, player statistics, tournament decisions, or any official data.
- Moderation provider and API key must be configured via environment variables only. **Never hardcode API keys.**
- Required env vars: `MODERATION_API_KEY`, `MODERATION_API_URL`.
- Before implementing the Communities module: **verify the current official API documentation** of the chosen moderation provider.

---

## 12. Core Modules (Do Not Remove or Rename)

```
auth            users               player-profiles
sports          teams               grounds
bookings        casual-games        tournaments
registrations   eligibility         fixtures
matches         performance         stats
leaderboards    communities         notifications
payments        audit-logs
```

---

## 13. What You Must NOT Do Without Explicit User Approval

- ❌ Change the technology stack
- ❌ Add a new database engine
- ❌ Introduce microservices or a message broker
- ❌ Add public signup for organizer or admin
- ❌ Create a separate Team Manager account system
- ❌ Add cloud deployment configuration
- ❌ Install packages that are not directly required for the current task
- ❌ Invent requirements not stated by the user
- ❌ Skip ahead to the next implementation phase
- ❌ Modify `database/schema/001_initial_schema.sql` (use migration files instead)
- ❌ Create a duplicate match/fixture system (reuse Phase 1 tables)
- ❌ Apply AI moderation to official statistics or match results
- ❌ Hardcode any API key, JWT secret, or external service credential
- ❌ Ship non-responsive frontend pages

---

## 14. General Agent Behaviour

- Read these rules before every coding session.
- Ask the user before making architectural decisions not covered here.
- Complete only the phase the user has requested, then stop and wait.
- Never auto-proceed to the next phase.
- Preserve all existing comments and docstrings unrelated to the current change.
- Run sanity checks (lint, build, test) after completing a phase and report results.
