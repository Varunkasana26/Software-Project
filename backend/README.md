# backend

- **Owner:** Abhishek
- **Purpose:** REST API, authentication, ownership and roles, the rules database, and the call to core.
- **Belongs here:** `api/` (Express routes, controllers, services, Prisma schema, its own tests).
- **Must not be edited by others:** everything in this folder. Open a pull request or ask Abhishek.

## What it does

- Auth: `POST /api/auth/register | login | logout`, `GET /api/auth/me`. Passwords are hashed with bcrypt. The session is a JWT in an `httpOnly` cookie, or an `Authorization: Bearer` header for scripts. Roles: `USER`, `LAWYER`, `ADMIN`. New accounts are always `USER`.
- Documents: each document belongs to the user who uploaded it. A user sees only their own; a lawyer can read any; an admin cannot read documents. Anyone else gets `404`.
- `POST /api/documents` (multipart `file`, `party`) checks the file content (magic bytes), not the name or Content-Type. `POST /api/documents/:id/process` sends the file, the party and the active rules to core's `POST /analyze` and stores the clauses (with `ruleId`, `autoScore`) and the report (`reportItem` objects). If core is unreachable the call fails with `502 CORE_UNREACHABLE`; there is no fallback to fake results.
- `PATCH /api/clauses/:id/override` (lawyer only) stores `lawyerOverride` and a reason. The automatic score is kept. `DELETE` removes the override.
- Rules: `GET /api/rules` for any signed-in user; create, edit and delete for `ADMIN` only. Each change is checked by core (`POST /validate-rules`) before it is saved.

## Source of truth for rules

The `Rule` table in the database. When it is empty at start-up the backend fills it from `core/rules/rules.json` (path in `RULES_SEED_PATH`). The backend sends the active rules to core with every analysis, so an admin's change applies to the next analysis. The mock `clauseEngine.ts` has been removed. Do not add one.

## Database

The Prisma schema is `api/prisma/schema.prisma`. Apply it with `npm run db:push` (uses `DIRECT_URL`, a session-mode connection). The running app uses `DATABASE_URL` (pooled). `npm run seed:users` creates the local demo accounts.

## Rules for this lane

- Cross-lane calls happen only through the schemas in `shared/contracts`, never by importing another lane's code.
- Secrets live in `api/.env` only (git-ignored). `api/.env.example` has placeholders.
- The API tests (`npm test`) run without a database and without core: both are replaced in `tests/mocks.ts`.

## Offline demo mode

`OFFLINE_DEMO=true` (or `start-all --offline`) runs the backend with no database and no `.env`: `src/lib/memoryDb.ts` replaces Prisma, the three public demo accounts in `src/lib/demoAccounts.ts` are created at start-up, and rules are seeded from `core/rules/rules.json`. Data is lost on restart. `config/env.ts` refuses this mode when `NODE_ENV=production`. The same in-memory store is used by the API tests.
