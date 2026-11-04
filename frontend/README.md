# frontend

- **Owner:** Harnoor
- **Purpose:** User interface for the Legal Document Summarizer.
- **Belongs here:** `src/` (React + TypeScript pages, components, API client), `DESIGN.md` (design spec), dependency files.
- **Must not be edited by others:** everything in this folder. Open a pull request or ask Harnoor.

Stack: Vite, React, TypeScript, react-router. Plain CSS driven by tokens. No UI library.

## Run

```bash
cp .env.example .env   # VITE_API_URL points at the Node backend (default http://localhost:8000)
npm install
npm run dev            # http://localhost:5173
npm run build          # type check + production build
```

The backend allows CORS from `http://localhost:5173` by default (`FRONTEND_URL`).

## Design

`DESIGN.md` is the spec: colour, type, spacing, radius, elevation, motion, component rules and an accessibility checklist. `src/styles/tokens.css` holds the tokens as CSS variables. Change a token there, not a hard-coded value in a component. Screenshots of every screen are in `docs/design/screens/`.

## Backend endpoints used

All calls are in `src/api/client.ts`.

| Endpoint | Used by |
|---|---|
| `POST /api/documents` (multipart field `file`) | Upload |
| `POST /api/documents/:id/process` | Upload |
| `GET /api/documents/:id/report` | Report, Lawyer review |
| `GET /api/documents/:id/clauses` | Report, Lawyer review |
| `GET /api/rules`, `POST /api/rules`, `PATCH /api/rules/:id`, `DELETE /api/rules/:id` | Rules admin |

## Screens: real, mock or missing pieces

| Screen | Status |
|---|---|
| Sign in | **Mock.** No auth endpoint exists. Stores a fake token in `localStorage`. |
| Upload | **Real.** Checks type, size and emptiness in the browser first; shows server rejections (wrong type, too large, scanned PDF) as plain messages. The chosen party is kept in `sessionStorage` only; the API does not accept it yet. |
| Report | **Real** for `/report/<document id>`. `/report/demo` shows mock data. Real clauses have no `rule_id` and no numeric score yet (only `riskLevel`), so those show "No rule id" and "not reported". |
| Lawyer review | **Mock save.** No override endpoint exists; overrides are stored in this browser and shown on the report. The original auto score is never overwritten. |
| Rules admin | **Real** against `/api/rules`. |

In development (`npm run dev`) mock-backed pages show a small amber tag. It does not appear in production builds.

## Harnoor: start here

1. Replace the mock sign-in when Abhishek's auth lands (`login` in `client.ts`) and add route protection.
2. When the backend returns `reportItem` objects and per-clause `rule_id` and score (see `shared/contracts/report.schema.json`), drop the string handling in `getReport`.
3. When an override endpoint exists, swap `saveOverride` in `client.ts` from the browser store to a `PATCH`.
4. Send the party to the API once it is accepted (`Upload.tsx`).
5. Add keyboard and screen-reader testing on real devices; automated checks here covered focus visibility, overflow and contrast tokens only.
