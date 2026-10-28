# frontend

- **Owner:** Harnoor
- **Purpose:** User interface.
- **Belongs here:** Frontend source code and its dependency file.
- **Must not be edited by others:** everything in this folder. Open a pull request or ask Harnoor.

## Run

```bash
cp .env.example .env   # VITE_API_URL points at the Node backend (default port 8000)
npm install
npm run dev            # http://localhost:5173
```

The backend allows CORS from `http://localhost:5173` by default (`FRONTEND_URL`).

## Backend endpoints used

| Endpoint | Used by |
|---|---|
| `POST /api/documents` (multipart field `file`) | Upload |
| `POST /api/documents/:id/process` | Upload |
| `GET /api/documents/:id/report` | Report |
| `GET /api/documents/:id/clauses` | Report |

The backend has no auth endpoints. All HTTP calls live in `src/api/client.ts`.

## Page status

| Page | Status |
|---|---|
| Upload | Real (upload, then process, then redirect to the report) |
| Report | Real for `/report/<document id>`. `/report/demo` uses mock data from `src/api/mock.ts` |
| Login | Mock. No login endpoint exists; the token is a fake string in `localStorage` |
| LawyerReview | Placeholder |
| AdminRules | Placeholder (the `/api/rules` endpoints exist) |

## Harnoor: start here

1. Real clauses show `riskLevel` (LOW/MEDIUM/HIGH style), not a numeric score, and no `rule_id`. The backend does not return them yet. Ask Abhishek via a `shared/contracts` change through Varun.
2. The "my role" selector is not sent to the backend; the API has no field for it.
3. Build AdminRules against the existing `/api/rules` endpoints.
4. Build LawyerReview once a `lawyer_override` endpoint exists.
5. Replace the mock login when auth exists, and add route protection.
6. Add styling, and put reusable pieces in `src/components/`.
