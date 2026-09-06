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

---

## High-Level Diagram

```
Browser
  │
  │  HTTP (Vite proxy in dev / direct in prod build)
  ▼
┌─────────────────────────────────────────────┐
│           Express API  (server/)             │
│                                             │
│  Middleware: CORS · Auth · Error Handler    │
│                                             │
│  Router                                     │
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
├── client/                        # React + Vite SPA
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
│   │   ├── config/                # DB pool, env validation
│   │   ├── middleware/            # Auth, error handler, logging
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
│   │   ├── routes/                # Central router that mounts all modules
│   │   ├── utils/                 # Shared helpers (pagination, errors, etc.)
│   │   └── app.js                 # Express app factory
│   ├── server.js                  # Entry point
│   └── package.json
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

- **JWT** (JSON Web Token) issued on login, sent in `Authorization: Bearer <token>` header.
- Tokens are stateless; the server verifies signature and expiry on every protected request.
- **Roles** (`player`, `organizer`, `admin`) are embedded in the token payload.
- **Public signup** creates `player` accounts only.
- `organizer` and `admin` accounts are seeded; there is no public registration path for them.
- **Team Manager** is not a separate role — it is a `player` user who has been assigned as manager of a team record.

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
| No separate Manager role | Manager = user with `manager_id` on a team row |
| No public Organizer/Admin signup | Seeded accounts only |
