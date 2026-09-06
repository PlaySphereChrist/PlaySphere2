# PlaySphere — Database Design

## Engine

**PostgreSQL ≥ 15** (local instance)  
Driver: `pg` (node-postgres) — no ORM, no query builder.

---

## Design Principles

1. **Relational first.** All relationships are expressed as foreign keys.
2. **No soft-delete by default.** If a module needs soft-delete, it adds a `deleted_at` column explicitly and it is documented here.
3. **Timestamps on every table.** All tables carry `created_at` and (where relevant) `updated_at` columns with database-level defaults.
4. **UUID primary keys.** All entities use `uuid` primary keys generated with `gen_random_uuid()`.
5. **Enums as PostgreSQL types.** Role, status, and state columns use `CREATE TYPE` enums to keep the data layer honest.
6. **Migrations are ordered SQL files.** File naming: `NNNN_<description>.sql` (e.g. `0001_create_users.sql`).
7. **Seeds are separate SQL files.** Seeds create admin, organizer accounts and baseline sports data.

---

## Module → Table Mapping (planned, not yet created)

> ⚠️ Full SQL schema will be created in a later phase. This section describes the intended tables per module.

### Authentication
_No dedicated table — auth state lives inside the `users` table._

---

### Users
| Table | Purpose |
|---|---|
| `users` | Core account — email, password hash, role, status |

Key columns (planned):
- `id` uuid PK
- `email` unique, not null
- `password_hash` not null
- `role` enum(`player`, `organizer`, `admin`)
- `is_active` boolean
- `created_at`, `updated_at`

---

### Player Profiles
| Table | Purpose |
|---|---|
| `player_profiles` | Optional extended profile linked 1:1 to a user |

Key columns (planned):
- `id` uuid PK
- `user_id` uuid FK → `users.id` (unique)
- `display_name`, `bio`, `avatar_url`
- `date_of_birth`, `city`
- `created_at`, `updated_at`

---

### Sports
| Table | Purpose |
|---|---|
| `sports` | Master list of sports (seeded) |

---

### Teams
| Table | Purpose |
|---|---|
| `teams` | Team entity |
| `team_members` | Junction — user ↔ team with role/position |

---

### Grounds
| Table | Purpose |
|---|---|
| `grounds` | Venue with location, sport, and amenities |
| `ground_availability` | Recurring or date-specific availability slots |

---

### Ground Bookings
| Table | Purpose |
|---|---|
| `ground_bookings` | A booking of a ground slot by a user or team |

---

### Casual Games
| Table | Purpose |
|---|---|
| `casual_games` | An open or invite-only pickup game at a ground |
| `casual_game_participants` | Junction — user ↔ casual game |

---

### Tournaments (TournamentOS)
| Table | Purpose |
|---|---|
| `tournaments` | Tournament header (name, sport, format, dates) |
| `tournament_rounds` | Rounds within a tournament |

---

### Tournament Registration
| Table | Purpose |
|---|---|
| `tournament_registrations` | Team or individual registration for a tournament |

---

### Eligibility
| Table | Purpose |
|---|---|
| `eligibility_rules` | Rules attached to a tournament (age, gender, rating) |

---

### Fixtures
| Table | Purpose |
|---|---|
| `fixtures` | Scheduled match slots within a tournament round |

---

### Matches
| Table | Purpose |
|---|---|
| `matches` | A played or scheduled contest between two sides |

---

### Performance Recording
| Table | Purpose |
|---|---|
| `match_performances` | Per-player stats recorded for a match |

---

### Statistics
| Table | Purpose |
|---|---|
| `player_stats` | Aggregated career/season stats per player per sport |
| `team_stats` | Aggregated stats per team |

---

### Leaderboards
| Table | Purpose |
|---|---|
| `leaderboard_entries` | Computed ranking snapshots |

---

### Communities
| Table | Purpose |
|---|---|
| `communities` | A sport/location-based group |
| `community_members` | Junction — user ↔ community |
| `community_posts` | Posts within a community |

---

### Notifications
| Table | Purpose |
|---|---|
| `notifications` | Per-user notification records |

---

### Payments
| Table | Purpose |
|---|---|
| `payments` | Razorpay order + verification records |

---

### Audit Logs
| Table | Purpose |
|---|---|
| `audit_logs` | Immutable event log (actor, action, target, timestamp) |

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Table | `snake_case`, plural | `team_members` |
| Column | `snake_case` | `created_at` |
| FK column | `<referenced_table_singular>_id` | `user_id` |
| PK | always `id` | `id uuid` |
| Enum type | `snake_case` with `_type` or `_status` suffix | `tournament_status` |
| Index | `idx_<table>_<column(s)>` | `idx_users_email` |

---

## Migration Files Location

```
database/
  migrations/
    0001_create_users.sql
    0002_create_player_profiles.sql
    ...
  seeds/
    0001_seed_roles_and_admin.sql
    0002_seed_sports.sql
  schema/
    README.md    ← canonical table-by-table reference (added as schema grows)
```
