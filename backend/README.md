# backend

- **Owner:** Abhishek
- **Purpose:** REST API, authentication and database.
- **Belongs here:** `api/` (Express routes, controllers, services, Prisma schema, its own tests).
- **Must not be edited by others:** everything in this folder. Open a pull request or ask Abhishek.

## Notes

- The Prisma schema lives in `backend/api/prisma/`.
- `clauseEngine.ts` is a temporary placeholder. Once `core/` is ready, `backend/api` calls core's `POST /analyze` (port 8001) and the mock is removed. Do not extend the mock.
- Cross-lane calls happen only through the schemas in `shared/contracts/`, never by importing another lane's code.
- Copy `api/.env.example` to `api/.env` and fill in your own values. Never commit `.env`.
