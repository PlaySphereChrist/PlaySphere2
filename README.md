# PlaySphere

> A local-only, full-stack sports ecosystem platform.

PlaySphere is a modular monolith that brings together everything a recreational or competitive sports community needs — from booking grounds and organising casual games to running full tournaments with fixtures, stats, and leaderboards.

**TournamentOS** is the tournament-management module that lives inside PlaySphere.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (JavaScript) |
| Styling | Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Authentication | JWT + bcrypt |
| Payments | Razorpay |
| Maps | OpenStreetMap + Leaflet.js |

## Architecture

- **Modular Monolith** — single deployable unit with clearly separated modules
- **REST API** — Express routes organised by domain module
- **PostgreSQL** — single relational database, raw SQL / pg driver (no ORM)
- **React SPA** — Vite-powered frontend, communicates with the API

## Core Modules

```
Authentication      Users               Player Profiles
Sports              Teams               Grounds
Ground Bookings     Casual Games        Tournaments
Tournament Reg.     Eligibility         Fixtures
Matches             Performance         Statistics
Leaderboards        Communities         Notifications
Payments            Audit Logs
```

## User Types

| Role | Public Signup | Notes |
|---|---|---|
| Player / User | ✅ Yes | Default signup role |
| Team Manager | — | An existing user who manages a team |
| Organizer | ❌ No | Seeded preset account |
| Admin | ❌ No | Seeded preset account |

## Project Structure

```
PlaySphere/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
├── database/        # Migrations, seeds, schema docs
├── docs/            # Architecture and database documentation
├── .agents/         # AI agent rules and context
├── .env.example     # Environment variable template
├── .gitignore
└── README.md
```

## Getting Started

> ⚠️ This project runs on a **local machine only**. No cloud deployment configuration is included.

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 15
- npm ≥ 10

### Setup

```bash
# 1. Clone and enter the project
cd PlaySphere

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Install server dependencies
cd server && npm install

# 4. Install client dependencies
cd ../client && npm install

# 5. Create the database
# (see docs/database.md)

# 6. Start the backend
cd ../server && npm run dev

# 7. Start the frontend (new terminal)
cd ../client && npm run dev
```

---

## Documentation

- [Architecture](./docs/architecture.md)
- [Database](./docs/database.md)
