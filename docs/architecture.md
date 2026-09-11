# PlaySphere — Architecture

## Overview

PlaySphere is a **local-only, modular monolith** sports ecosystem platform.  
The codebase is a single deployable unit that is internally divided into domain modules. There are no microservices, no service mesh, and no distributed state.

---

## Guiding Principles

1. **Monolith first.** All code lives in one repository and is deployed as a single process pair (Express API + React SPA).
2. **Modules, not services.** Each domain area is a folder with its own routes, controllers, services, and (optionally) SQL helpers — not a separate process.
3. **No ORM.** The database layer uses the `pg` driver and plain SQL. Queries live in service files or dedicated query files per module.
4. **No MongoDB.** PostgreSQL is the only data store.
5. **REST only.** The API is a conventional REST API. No GraphQL, no tRPC.
6. **Local machine only.** No cloud infrastructure, no Docker-Compose for production, no serverless functions.
7. **Responsive UI — mandatory.** Every frontend screen must be responsive across mobile, tablet, laptop/desktop, and large desktop. Responsive design is applied per phase as features are built, not deferred to a final pass.

---

## High-Level Diagram

```
Browser (mobile / tablet / desktop)
  │
  │  HTTP (Vite proxy in dev / direct in prod build)
  ▼
┌─────────────────────────────────────────────┐
│           Express API  (server/)             │
│                                             │
│  Middleware: CORS · Auth · Error Handler    │
│                                             │
│  Router                                     │
│   ├── /api/health                           │
│   ├── /api/auth                             │
│   ├── /api/users                            │
│   ├── /api/player-profiles                  │
│   ├── /api/sports                           │
│   ├── /api/teams                            │
│   ├── /api/grounds                          │
│   ├── /api/bookings                         │
│   ├── /api/casual-games                     │
│   ├── /api/tournaments                      │
│   ├── /api/registrations                    │
│   ├── /api/fixtures                         │
│   ├── /api/matches                          │
│   ├── /api/performance                      │
│   ├── /api/stats                            │
│   ├── /api/leaderboards                     │
│   ├── /api/communities                      │
│   ├── /api/notifications                    │
│   ├── /api/payments                         │
│   └── /api/audit-logs                       │
│                                             │
│  Module: routes → controller → service      │
└──────────────────┬──────────────────────────┘
                   │  pg driver (SQL)
                   ▼
         ┌─────────────────┐
         │   PostgreSQL     │
         │   (local)        │
         └─────────────────┘
```

---

## Repository Layout

```
PlaySphere/
│
├── client/                        # React + Vite SPA (fully responsive)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/            # Shared/reusable UI components
│   │   ├── features/              # Feature-scoped components & logic
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── player-profiles/
│   │   │   ├── sports/
│   │   │   ├── teams/
│   │   │   ├── grounds/
│   │   │   ├── bookings/
│   │   │   ├── casual-games/
│   │   │   ├── tournaments/
│   │   │   ├── fixtures/
│   │   │   ├── matches/
│   │   │   ├── leaderboards/
│   │   │   ├── communities/
│   │   │   ├── notifications/
│   │   │   └── payments/
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # API client, helpers, constants
│   │   ├── pages/                 # Route-level page components
│   │   ├── routes/                # React Router config
│   │   ├── store/                 # Global state (Context or Zustand)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── server/                        # Node.js + Express API
│   ├── src/
│   │   ├── config/                # DB pool (pg), env validation (env.js)
│   │   ├── middleware/            # Auth, errorHandler, notFound, requestLogger
│   │   ├── modules/               # Domain modules (one folder each)
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── player-profiles/
│   │   │   ├── sports/
│   │   │   ├── teams/
│   │   │   ├── grounds/
│   │   │   ├── bookings/
│   │   │   ├── casual-games/
│   │   │   ├── tournaments/
│   │   │   ├── registrations/
│   │   │   ├── eligibility/
│   │   │   ├── fixtures/
│   │   │   ├── matches/
│   │   │   ├── performance/
│   │   │   ├── stats/
│   │   │   ├── leaderboards/
│   │   │   ├── communities/
│   │   │   ├── notifications/
│   │   │   ├── payments/
│   │   │   └── audit-logs/
│   │   ├── routes/                # Central router (index.js), health check
│   │   ├── utils/                 # Shared helpers (asyncHandler.js)
│   │   └── app.js                 # Express app factory, CORS, parsing
│   ├── server.js                  # Entry point, graceful shutdown
│   ├── package.json
│   └── README.md                  # Backend-specific instructions
│
├── database/
│   ├── migrations/                # Ordered SQL migration files
│   ├── seeds/                     # Seed data (admin, organizer, sports)
│   └── schema/                    # Canonical table definitions (reference)
│
├── docs/
│   ├── architecture.md            # This file
│   └── database.md                # Data model & schema decisions
│
├── .agents/
│   └── rules/
│       └── playsphere.md          # AI agent rules for this project
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Module Convention

Every server module follows the same internal pattern:

```
modules/<name>/
  ├── <name>.routes.js       # Express router — defines endpoints
  ├── <name>.controller.js   # Request/response handling, input validation
  └── <name>.service.js      # Business logic + SQL queries (via pg pool)
```

A module may additionally contain:
- `<name>.queries.js` — extracted raw SQL strings for complex modules
- `<name>.middleware.js` — route-specific middleware (e.g. ownership checks)

---

## Authentication & Authorization

Implemented in Phase 3. The following describes the actual running system.

- **JWT access tokens** (15 min, signed with `JWT_ACCESS_SECRET`) sent in `Authorization: Bearer <token>` header.
- **JWT refresh tokens** (7 days, random `jti` claim, signed with `JWT_REFRESH_SECRET`). Stored as SHA-256 hashes in the `refresh_tokens` table. Token rotation is enforced — old tokens are revoked on use.
- **Roles** are loaded from PostgreSQL on every authenticated request. They are **never** read from the JWT payload or from client input.
- **Public signup** creates `USER` accounts only. No role field is accepted from the client during registration.
- `ORGANIZER` and `ADMIN` accounts are seeded; there is no public registration path for them.
- **Team Manager** is not a separate role or account. It is a `USER` referenced as `manager_user_id` on a `teams` row.
- **Player Profile** remains optional and is entirely separate from the base `User` account.
- **RBAC middleware**: `authenticate` validates the Bearer token and loads user + roles from DB. `authorizeRoles(...roles)` rejects with HTTP 403 if the user does not hold a required role.
- Emails are normalized to lowercase before storage and lookup.

### Auth Endpoints (live at `/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Public USER-only signup |
| `POST` | `/api/auth/login` | No | Login for all roles |
| `POST` | `/api/auth/refresh` | No | Refresh token rotation |
| `POST` | `/api/auth/logout` | No | Server-side token revocation |
| `GET` | `/api/auth/me` | Bearer | Authenticated user + DB-loaded roles |

---

## Responsive UI — Mandatory Requirement

Every frontend screen in PlaySphere **must be responsive** across all viewport sizes:

| Breakpoint | Target |
|---|---|
| Mobile | `< 768px` (sm) |
| Tablet | `768px – 1023px` (md) |
| Laptop / Desktop | `1024px – 1279px` (lg) |
| Large Desktop | `≥ 1280px` (xl / 2xl) |

- Tailwind CSS responsive utility classes (`sm:`, `md:`, `lg:`, `xl:`) are the required approach.
- Responsive layout must be implemented **as each feature phase is built**, not deferred to a final polish pass.
- This applies to all user types: Player/User, Team Manager, Organizer, and Admin.
- Do not ship non-responsive pages with a plan to fix them later.

---

## Casual Games — Player Level

Casual Games must support a **player/game level** field:

| Level | Description |
|---|---|
| `beginner` | Open to all, no experience required |
| `intermediate` | Some experience expected |
| `expert` | Advanced / professional level |

- Level is selected by the creator when posting a casual game.
- Casual games can be browsed and filtered by level.
- A **Player Profile is NOT required** to create or join a casual game.
- Casual Games are **entirely separate** from official tournaments, official matches, official performance events, official player statistics, and official leaderboards.
- Do not add casual game results to any official statistics pipeline.

---

## Official Match Management (MVP)

PlaySphere includes an MVP match-management system for **official tournament matches only**.

### Match Data Fields

| Field | Description |
|---|---|
| Scheduled time | Date and time of the match |
| Venue | Ground/location reference |
| Participants | Teams or individual players (two sides: home / away) |
| Status | Current match lifecycle state |
| Score / Result | Score per side and declared winner |
| Match notes | Free-text notes recorded by the Organizer |

### Match Status Lifecycle

```
Scheduled → Live → Completed
         ↘ Postponed
         ↘ Cancelled
```

| Status | Meaning |
|---|---|
| `scheduled` | Fixture confirmed, match not yet started |
| `live` | Match currently in progress |
| `completed` | Final result recorded |
| `postponed` | Match delayed, new time TBD |
| `cancelled` | Match will not be played |

### Official Match Flow

```
Tournament
  └─► Fixture (scheduled slot)
        └─► Match (the contest)
              └─► match_participants (home side, away side)
                    └─► Result recorded by Organizer
                          └─► performance_events (per-player event log)
                                └─► player_statistics / team_statistics (derived)
```

### Access Control Rules

- **Organizer** records official results, scores, and performance events.
- **Players and Team Managers** cannot directly edit official match results or official statistics.
- Casual Games do **not** use this system.

### Existing Schema Tables (already created in Phase 1 — do not duplicate)

The following tables already exist in `database/schema/001_initial_schema.sql`:

| Table | Role in the Match System |
|---|---|
| `fixtures` | Scheduled match slots within a tournament round |
| `matches` | The official contest record |
| `match_participants` | Home / away side per match |
| `performance_events` | Authoritative per-player event log |
| `performance_event_players` | Players involved in each performance event |
| `player_statistics` | Derived stats per player (tournament / season / career) |
| `team_statistics` | Derived stats per team |
| `tournament_status_history` | Immutable log of tournament status transitions |

> ⚠️ When implementing the Matches phase: **reuse and extend the existing tables**. Do NOT create a parallel match system.

---

## Community AI Content Moderation

Community posts and comments must pass through an **AI-assisted content moderation** layer before publication.

### Moderation Flow

```
User submits post/comment
  └─► Backend sends content to moderation API
        ├─► SAFE     → publish immediately
        ├─► UNSAFE   → block, return rejection message to user
        └─► UNCERTAIN → flag for Admin review; content held pending
```

### Content Categories Checked

- Harassment / bullying
- Hate speech / abusive language
- Threats / violent content
- Sexual / inappropriate content
- Spam / repeated/irrelevant content
- Severe profanity
- Other unsafe content

### Implementation Rules

- AI moderation is an **assistance layer only** — not the final authority.
- **Admin moderation must remain available** regardless of AI decisions.
- **Manual reporting by users** must remain available.
- AI must **never** be used for official player statistics, match results, or tournament decisions.
- The moderation provider and model are **configurable via environment variables** (e.g. `MODERATION_API_KEY`, `MODERATION_API_URL`). No API keys are hardcoded.
- When implementing the Communities module: **verify the current official API/model documentation** from the chosen provider before writing integration code.

### Environment Variables (placeholder — values set in `.env` only)

```
MODERATION_API_KEY=
MODERATION_API_URL=
```

---

## Payment Flow (Razorpay)

1. Client requests an **order** from the server (`POST /api/payments/create-order`).
2. Server creates an order via Razorpay API and returns `order_id` + `key_id`.
3. Client opens the Razorpay checkout widget.
4. On success, client sends `payment_id`, `order_id`, `signature` to `POST /api/payments/verify`.
5. Server verifies the HMAC signature and records the payment.

---

## Maps (OpenStreetMap + Leaflet)

- Ground locations are stored as `latitude` / `longitude` columns in PostgreSQL.
- The frontend uses **Leaflet.js** with OpenStreetMap tiles — no API key required.
- No server-side geo queries in the first phase; filtering by sport/city is sufficient.

---

## Key Constraints

| Constraint | Decision |
|---|---|
| No MongoDB / Mongoose | PostgreSQL + raw `pg` driver only |
| No microservices | Single Express process |
| No cloud | Local machine development only |
| No separate Manager role | Manager = USER with `manager_user_id` FK on a `teams` row |
| No public Organizer/Admin signup | Seeded accounts only |
| Roles never from JWT or client | Always loaded fresh from PostgreSQL |
| Responsive UI | Mandatory for every screen, implemented per phase |
| AI moderation — community only | Never applied to statistics or match results |
| Casual Games ≠ Official system | Entirely separate; no shared statistics pipeline |
| Existing match tables | Reuse Phase 1 schema — do not create a duplicate system |
