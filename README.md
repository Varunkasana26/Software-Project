# Legal Document Summarizer

Upload a legal document, split it into clauses, classify and score each clause, and produce a report.

Lead: Varun. Team: Abhishek, Harnoor, Daksh, Shaurya. See [OWNERS.md](OWNERS.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

| Folder | Purpose |
|---|---|
| `shared/contracts/` | Function signatures and JSON schemas shared by all lanes |
| `core/` | Pipeline: parser, segmenter, classifier, scorer, report, rules |
| `backend/` | REST API and database (Node, Express, Prisma) |
| `frontend/` | User interface |
| `docs/` | Documentation |
| `tests/` | Unit, integration tests and sample documents |

## Run the backend

See [backend/api/README.md](backend/api/README.md). Short version: `cd backend/api && npm install && npm run prisma:generate && npm test`.
