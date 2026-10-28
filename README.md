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

## Run everything

One-time setup:

```bash
pip install -r core/requirements.txt
cd backend/api && npm install && npm run prisma:generate
cp .env.example .env   # fill in your own DATABASE_URL and DIRECT_URL; never commit .env
```

Start core (port 8001) and backend/api (port 8000) together:

- macOS / Linux / Git Bash: `./scripts/start-all.sh`
- Windows PowerShell: `.\scripts\start-all.ps1`

Each lane can also be started alone: see [core/README.md](core/README.md) and [backend/api/README.md](backend/api/README.md).
