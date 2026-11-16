# Frontend

React, TypeScript, Vite and react-router. No UI or animation library. CSS variables in `src/styles/tokens.css` drive both themes.

## Run

```bash
cp .env.example .env   # optional VITE_API_URL, defaults to http://localhost:8000
npm install
npm run dev
npm run build
```

The API uses an httpOnly cookie session. Offline demo mode is supported by `../scripts/start-all.sh --offline`; the login page shows the three local demo accounts when the backend reports offline mode.

## Real endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/me` | Account creation, login, logout and session restoration |
| `POST /api/documents` multipart `file`, `party` | Upload with selected contract side |
| `POST /api/documents/:id/process` | Analyze through core |
| `GET /api/documents`, `GET /api/documents/:id`, `GET /api/documents/:id/report`, `GET /api/documents/:id/clauses` | Document list and report data |
| `PATCH /api/clauses/:id/override`, `DELETE /api/clauses/:id/override` | Lawyer-only score overrides; automatic score remains available |
| `GET /api/rules`, `POST /api/rules`, `PATCH /api/rules/:id`, `DELETE /api/rules/:id` | Rule administration; writes require ADMIN |
| `GET /api/health` | Detect offline demo mode for account hints |

Reports use `reportItem` objects and full clauses from the live report response. The optional `/report/demo` development route uses `src/api/mock.ts` and is explicitly demo data. No mock-backed auth, upload, override or rules remain. USER can analyze and read own documents; LAWYER can review documents and override clauses; ADMIN can manage rules.

The report's overall gauge is the mean of up to five highest effective clause scores (override when present, otherwise auto score). High risk means effective score at least 8. This is a first-pass aid, not legal advice.


## Document and lawyer review routes

`/documents` shows the document list for every signed-in role. For LAWYER accounts, selecting a document changes the URL to `/documents/:id` and opens its clauses and override controls beside the list. USER and ADMIN accounts remain on the document list if they visit that URL. The former `/review/:id` route redirects to `/documents/:id`. Reports open at `/report/:id`.
