# Owners

| Path | Owner |
|---|---|
| `core/` | Varun |
| `shared/` | Varun |
| root files (`README.md`, `OWNERS.md`, `CONTRIBUTING.md`, `.gitignore`) | Varun |
| `backend/` | Abhishek |
| `frontend/` | Harnoor |
| `docs/` | Daksh |
| `tests/` | Shaurya |

## Rules

- Abhishek's `backend/api/src/services/clauseEngine.ts` is a temporary placeholder. Once `core/` is ready, `backend/api` calls core's `POST /analyze` and the mock is removed. Do not extend the mock.
- Cross-lane calls happen only through the schemas in `shared/contracts/`, never by importing another lane's code.
