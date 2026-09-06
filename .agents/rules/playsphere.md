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
player      | ✅ YES        | Default role assigned at signup
organizer   | ❌ NO         | Seeded preset account only
admin       | ❌ NO         | Seeded preset account only
```

- **Player Profile** is optional and is NOT the same as a User account.
  - A user can exist without a player profile.
  - Do not conflate `users` and `player_profiles` tables.
- **Team Manager** is NOT a separate account type or role.
  - A team manager is an existing `player` user referenced as `manager_id` on the `teams` table.
  - Do NOT create a separate manager signup flow or role enum value.
- **One login page** for all roles — role is determined from the JWT payload after login.
- Do NOT add a separate organizer or admin registration endpoint.

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

## 8. Core Modules (Do Not Remove or Rename)

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

## 9. What You Must NOT Do Without Explicit User Approval

- ❌ Change the technology stack
- ❌ Add a new database engine
- ❌ Introduce microservices or a message broker
- ❌ Add public signup for organizer or admin
- ❌ Create a separate Team Manager account system
- ❌ Add cloud deployment configuration
- ❌ Install packages that are not directly required for the current task
- ❌ Invent requirements not stated by the user
- ❌ Skip ahead to the next implementation phase

---

## 10. General Agent Behaviour

- Read these rules before every coding session.
- Ask the user before making architectural decisions not covered here.
- Complete only the phase the user has requested, then stop and wait.
- Never auto-proceed to the next phase.
- Preserve all existing comments and docstrings unrelated to the current change.
- Run sanity checks (lint, build, test) after completing a phase and report results.
