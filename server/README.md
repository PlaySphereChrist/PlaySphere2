# PlaySphere — Server (Backend)

This is the Node.js + Express backend for PlaySphere.

## Architecture

- **Node.js + Express.js**: REST API server (modular monolith).
- **PostgreSQL**: Primary data store, accessed via the `pg` driver (connection pool, no ORM).
- **JWT**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days, hashed, stored in DB).
- **bcryptjs**: Password hashing (cost factor 12).
- **RBAC**: Role-based access control loaded from the database on every authenticated request.
- **Environment**: All secrets injected via `.env` — never hardcoded.

---

## Required Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default `5000`) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `JWT_ACCESS_SECRET` | **Required.** Secret for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | **Required.** Secret for signing JWT refresh tokens |

> The server will **exit immediately at startup** if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` are missing.
> Never use the same secret for access and refresh tokens.
> Never commit secrets to Git.

---

## Getting Started

### 1. Configure Environment

Copy `.env.example` from the project root and create `server/.env`:

```dotenv
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=playsphere
DB_USER=postgres
DB_PASSWORD=your_local_postgres_password
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=<generate a long random string>
JWT_REFRESH_SECRET=<generate a different long random string>
```

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Nodemon will automatically restart the server on file changes.

### 4. Test Connectivity

```bash
curl http://localhost:5000/api/health
```

Expected:
```json
{
  "success": true,
  "message": "API is running",
  "dbStatus": "connected",
  "timestamp": "..."
}
```

---

## Authentication Endpoints

All authentication endpoints are available under `/api/auth`.

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new USER account (public) |
| `POST` | `/api/auth/login` | No | Login for all roles (USER, TEAM_MANAGER, ORGANIZER, ADMIN) |
| `POST` | `/api/auth/refresh` | No | Rotate refresh token, receive new access + refresh tokens |
| `POST` | `/api/auth/logout` | No | Revoke refresh token server-side |
| `GET` | `/api/auth/me` | Yes (Bearer) | Get current authenticated user with roles |

### Authentication Flow

```
1. Register (POST /api/auth/register)
   └─► User created with USER role assigned from database
   └─► Password bcrypt-hashed at cost 12
   └─► No Player Profile created yet (separate phase)

2. Login (POST /api/auth/login)
   └─► Email normalized to lowercase before lookup
   └─► Password verified with bcrypt.compare()
   └─► Roles loaded from PostgreSQL (never from client input)
   └─► Access token issued (JWT, 15 min, signed with JWT_ACCESS_SECRET)
   └─► Refresh token issued (JWT + random jti, 7 days)
   └─► Refresh token hashed (SHA-256) and stored in refresh_tokens table
   └─► last_login_at updated

3. Access protected routes
   └─► Include: Authorization: Bearer <access_token>
   └─► Middleware validates JWT, loads user + roles from DB

4. Refresh (POST /api/auth/refresh)
   └─► Validates JWT signature and type
   └─► Looks up hash in refresh_tokens table (row-locked)
   └─► Revokes old token, issues new access + refresh token pair
   └─► (Token rotation — old token cannot be reused)

5. Logout (POST /api/auth/logout)
   └─► Marks refresh token as revoked (revoked_at = NOW())
   └─► Safe to call even if token already invalid
```

### Access Token Format

```
Header: Authorization: Bearer <JWT>

JWT payload (access token):
{
  "id": "<user UUID>",
  "type": "access",
  "iat": ...,
  "exp": ...
}
```

> Roles are **NOT** stored in the JWT. They are always loaded fresh from PostgreSQL on each authenticated request.

---

## RBAC Middleware

Two reusable middleware functions are exported from `server/src/middleware/auth.js`:

```javascript
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Require any authenticated user
router.get('/profile', authenticate, handler);

// Require specific role(s)
router.get('/admin/dashboard', authenticate, authorizeRoles('ADMIN'), handler);
router.get('/tournament/create', authenticate, authorizeRoles('ORGANIZER', 'ADMIN'), handler);
```

`authenticate` — validates the Bearer token, loads user and roles from DB, attaches `req.user`.
`authorizeRoles(...roles)` — rejects with HTTP 403 if `req.user.roles` does not include a required role.

---

## Error Handling

All errors use the centralized handler. Responses follow this format:

```json
{ "success": false, "message": "..." }
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation failure |
| 401 | Not authenticated or token invalid/expired |
| 403 | Authenticated but insufficient role |
| 404 | Route not found |
| 409 | Conflict (e.g. duplicate email) |
| 500 | Unexpected server error |

Stack traces are hidden when `NODE_ENV=production`.

---

## Module Structure

```
server/src/
├── config/
│   ├── env.js          — Environment variable loading + startup validation
│   └── database.js     — PostgreSQL pool (pg), query helper, graceful shutdown
├── middleware/
│   ├── auth.js         — authenticate + authorizeRoles middleware
│   ├── errorHandler.js — Centralized JSON error responses
│   ├── notFound.js     — 404 handler
│   └── requestLogger.js — Development request logging
├── modules/
│   └── auth/
│       ├── auth.routes.js     — Express router, endpoint definitions
│       ├── auth.controller.js — Request parsing, validation, response shaping
│       └── auth.service.js    — Business logic + SQL queries
├── routes/
│   └── index.js        — Main router: mounts /health and all module routers
├── utils/
│   └── asyncHandler.js — Wraps async handlers to forward errors to next()
└── app.js              — Express app factory (CORS, body parsing, routes)
server.js               — Entry point, HTTP server, graceful shutdown
```
