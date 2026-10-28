# core

- **Owner:** Varun
- **Purpose:** Python 3.11+ document pipeline (parse, segment, classify, score, build report), exposed over HTTP for the Node backend.
- **Belongs here:** `service/` (FastAPI app), `parser/`, `segmenter/`, `classifier/`, `scorer/`, `report/`, and `rules/` (`rules.json`, rules are data, not code).
- **Must not be edited by others:** everything in this folder. Open a pull request or ask Varun.

## Run

```bash
cd core
pip install -r requirements.txt
uvicorn service.main:app --port 8001
```

- `GET /health` returns `{"status": "ok"}`.
- `POST /analyze` takes `{document_text, user_party}` and returns a Report. Schemas: `shared/contracts/analyze.request.schema.json` and `analyze.response.schema.json`. Currently a stub that returns an empty Report.

## Rules

`rules/rules.json` holds `{"rules": [{rule_id, category, patterns[], severity_weight}]}`. The list is empty for now.
