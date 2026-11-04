# Security audit, phase 4

Date: 2026-11-04. Scope: `backend/`, `core/`, `frontend/` and the git history. Method: read-only review first, then fixes inside `core/` only. `backend/` was not edited. Nothing was pushed.

## How this was done, and what was not available

| Tool or skill | Result |
|---|---|
| `npm audit` (backend/api) | 16 vulnerabilities: 3 critical, 7 high, 6 moderate. See section 4. |
| `npm audit` (frontend) | 0 vulnerabilities. |
| `pip-audit -r core/requirements.txt` | "No known vulnerabilities found". |
| owasp-api-top10, secret-scanning (patterns and method) | Applied by hand with `grep` and by reading the code. |
| owasp-security, threat-modeling | Used as a checklist for the review. No scanner output. |
| semgrep plugin | **Not run.** The `semgrep` command is not installed, and the plugin is a hook/MCP binary whose tools were not available in this session. I did not install a second scanner. There are no Semgrep results in this report. |
| `core/eval/regex_stress.py` (new) | Regex denial-of-service test. See section 3. |
| fp-check | **Pending.** To be applied as a final filtering pass once installed. Section 5 is my own manual triage and must be re-checked then. |

Not tested: the backend running against a database (no database in this environment), so backend findings come from reading code and from `npm` output, not from live requests. Pentest-style exploitation was not attempted.

## 1. Summary

| Severity | Open (backend, owner Abhishek) | Fixed in this phase (core) |
|---|---|---|
| High | B1 no authentication, B2 anyone can change rules, B3 anyone can list every document | none |
| Medium | B4 upload type check, B5 no rate limit or disk quota, B6 pdf-parse, B7 multer 1.x, B8 mass assignment, B9 rule pattern not validated, B10 dependency advisories | C1 unbounded input size, C2 quadratic segmenter |
| Low | B11 error details, B12 processing status race, B13 missing security headers | C3 upload read before size check, C4 error messages echo input |
| Info | | C5 core has no auth (documented), C6 regex check passed, C7 unpinned Python deps (open) |

Frontend: no exploitable finding. See F1 to F3.

Secrets: none found. See section 2.

## 2. Secrets in the repo and its history

| Check | Output |
|---|---|
| Tracked env or key files | Only `backend/api/.env.example` and `frontend/.env.example`. Both contain placeholders (`USER:PASSWORD@HOST`, `localhost`). |
| Patterns in tracked files: AWS keys, GitHub tokens, Stripe, Google, Slack, private keys, connection strings with passwords | Matches are only the placeholder strings in `.env.example` and `backend/api/README.md`, and the test fixture `postgresql://test:test@localhost` in `backend/api/tests/setup.ts`. |
| Password or secret assignments in source | No matches. |
| History search (`git log --all -S`) for `AKIA`, `BEGIN RSA PRIVATE`, `BEGIN PRIVATE KEY`, `sk_live_`, `ghp_` | 0 commits each. |
| History search for `DATABASE_URL=postgres` | 1 commit (`26796e3`), the one that added `.env.example` with placeholders. |
| `.env` ignored | `backend/api/.env` and `frontend/.env` are matched by `.gitignore`. |

Result: clean. A real `DATABASE_URL` (Supabase) will exist on each member's machine. It must stay in `.env` only.

## 3. Regex denial of service in `core/rules`

Command: `python -m core.eval.regex_stress` (new). It ran every pattern in `core/rules/rules.json` in its own process against 21 adversarial input shapes (`a` repeated, spaces, open parentheses, the sample contracts with and without full stops, and each rule keyword repeated back to back), at 100,000 and 200,000 characters, and flags a pattern that is slow (over 0.5 s) or whose time more than triples when the input doubles.

```
Checked 66 patterns from 51 rules, 21 input shapes, 100000 and 200000 characters each.

Slowest 8 patterns (time at 200,000 chars, worst input):
  TRM-007    0.091s  stuff:cure             cure[^.]{0,40}\b(three|five|seven|ten)\s*\(\d+\)\s*days?
  PEN-006    0.060s  stuff:repay            repay[^.]{0,60}(training|bond|cost)
  TRM-008    0.060s  stuff:cure             cure[^.]{0,40}\b(thirty|forty-five|sixty|ninety)\s*\(\d+\)\s*days?
  OBL-007    0.033s  stuff:confidential     confidential[^.]{0,80}\b(five|seven|ten)\s*\(\d+\)\s*years
  PAY-004    0.033s  stuff:deposit          deposit[^.]{0,40}\b(four|five|six)\s*\(\d+\)\s*months
  RGT-001    0.030s  stuff:increase         increase[^.]{0,40}(rent|fees?)\b
  TRM-006    0.025s  stuff:cure             (employee|tenant|recipient)\s+shall\s+give[^.]{0,40}\b(sixty|ninety)
  TRM-004    0.025s  stuff:tenant shall     (landlord|employer|provider|discloser)\s+may\s+terminate[^.]{0,60}(at any time|for any reason)

Flagged: 0
```

Conclusion: the current rules do not show catastrophic backtracking on these inputs. The patterns are safe because every repeat is bounded (`{0,40}`) or sits next to a literal. This is a test result, not a proof. It does not cover rules that someone adds later.

Residual risk: if rules become editable (the admin screen already writes patterns to the database), a user-supplied pattern such as `(a+)+$` would hang the process. See B9. Python's `re` has no timeout.

## 4. Findings

Severity is my judgement for a deployment that is reachable by other people. For a local classroom demo, B1 to B3 matter less.

### Backend (open, owner lane: backend / Abhishek)

| ID | Severity | Finding | Where | Evidence | Suggested fix |
|---|---|---|---|---|---|
| B1 | High | No authentication or authorisation on any route. | `backend/api/src/app.ts:24-27`, `src/routes/*.ts` | Four routers are mounted with no auth middleware; none of the 15 route handlers (14 in the routers plus `GET /api`) checks a user. | Add auth middleware (JWT or session) before the routers; tie each document to its owner (`ownerId`) and check it on every `/api/documents/:id*` and `/api/reports/:id` call. |
| B2 | High | Anyone can create, edit or delete classification rules. | `src/routes/rules.ts:19-27` | `POST`, `PATCH`, `DELETE` on `/api/rules` have only input validation. | Admin-role check on every write route. Reads can stay open to signed-in users. |
| B3 | High | `GET /api/documents` returns every document with all its clauses and report to any caller. | `src/services/documentService.ts` (`getDocuments`, `include: { clauses, report }`) | Reading the code: no owner filter, page limit up to 100. | Filter by owner. Do not include clauses in list results. |
| B4 | Medium | Upload type is decided by the client's `Content-Type` header, and the stored extension comes from the original file name. | `src/middleware/upload.ts:9-16, 33` | `allowedMimeTypes.includes(file.mimetype)`; `path.extname(file.originalname)`. A file can claim `text/plain` and have any content. There is no content check. | Check the first bytes (`%PDF-` for PDFs, valid UTF-8 for text). Choose the stored extension from the detected type, not from the name. |
| B5 | Medium | No rate limiting, no per-user quota, uploads accumulate on disk. | `src/app.ts`, `src/middleware/upload.ts:27` | No `express-rate-limit`. Each upload writes up to 10 MB to `uploads/`. | Add rate limiting on upload and process; per-user quota; delete files of failed or old documents. |
| B6 | Medium | `pdf-parse` 1.1.4 is old and parses PDFs on the main thread. | `src/lib/fileExtractor.ts:9-10`, `package.json:29` | `await pdfParse(buffer)` runs inside the request. A slow or malformed PDF blocks every other request. | Move PDF parsing to `core/` (it already uses `pdfplumber`, has a 10 MB, 300 page and 2,000,000 character limit) or to a worker. |
| B7 | Medium | `multer` 1.4.5-lts.2 is deprecated by npm because of known vulnerabilities. | `package.json:28` | `npm view multer@1.4.5-lts.2 deprecated` prints: "Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version." `npm audit` did not list it, so the registry notice is the evidence. | Upgrade to multer 2.x and re-run the upload tests. |
| B8 | Medium | Mass assignment: validated data is thrown away and the raw body is saved. | `src/middleware/validation.ts` (result of `parseAsync` is discarded), `src/controllers/ruleController.ts:23, 71` | `createRule(req.body)` and `updateRule(id, req.body)` receive the unparsed body. Prisma accepts `id`, `createdAt` and `updatedAt`, so a caller can set them. Not exercised live (no database). | Assign the parsed result back (`req.body = await schema.parseAsync(req.body)`) and make the schemas `.strict()`. |
| B9 | Medium | Rule `pattern` is not validated as a regular expression. | `src/validators/document.ts:23` | `pattern: z.string().min(1)` only. The mock engine does not run patterns yet, so nothing breaks today; any consumer that compiles it will throw on a bad pattern or hang on a catastrophic one. | Compile in a `try/catch` on save, cap the length, reject nested quantifiers, and run it on the server with a timeout or in `core` (see backend-issues.md). |
| B10 | Medium | 16 dependency advisories. | `backend/api/package.json` | See the table below. | `npm audit fix` clears most. `zod` and `vitest` need a major upgrade. |
| B11 | Low | Error responses can include internals. | `src/middleware/errorHandler.ts:58, 66, 72`; `src/services/documentService.ts:145` | `response.details = err.details` is sent to the client. Prisma `err.meta` (table and column names) is returned for P2002 and P2003, and the raw caught error is passed as `details` for status 500. | Log the detail on the server and return only a fixed message with a request id. |
| B12 | Low | The "already processing" check is not atomic, and a crash can leave a document in `PROCESSING` forever. | `src/services/documentService.ts:93-99` | Read-then-update in two statements; no timeout or retry path. A stuck document returns 409 on every later call. | Use `updateMany({ where: { id, status: { not: "PROCESSING" } } })` and check the count; add a stale-lock timeout. |
| B13 | Low | No security headers and a public health route that reports database state. | `src/app.ts`, `src/routes/health.ts:8-18` | No `helmet`. `/api/health` returns `database: "connected"`. | Add `helmet()`. Keep the detailed health check internal. |

Checked and not a finding:
- **Path traversal:** stored file names are generated by the server (`<time>-<random><ext>`), and `path.extname` cannot contain a separator. `deleteDocument` only unlinks the path the server saved.
- **CORS:** `origin` is a single configured value (`FRONTEND_URL`), not `*`, so the credentials setting is acceptable.
- **Body size:** `express.json({ limit: "1mb" })`, and page size is capped at 100 by the schema.

Dependency advisories (`npm audit`, backend/api):

| Package | Severity | Path | Reachable from a request? |
|---|---|---|---|
| body-parser 2.0.0-2.3.0 | high | express > body-parser | **Yes.** Denial of service via trailing bytes. Fixed by `npm audit fix`. |
| zod < 4.6.6 | high | direct | Partly. Memory exhaustion on oversized collections; bodies are capped at 1 MB. Needs a major upgrade. |
| proxy-addr <= 2.0.7 | critical | express > proxy-addr | **No.** The advisory is about trusting forwarded addresses; the app never sets `trust proxy` (grep found none). |
| qs 6.7.0-6.16.0 | moderate | express, body-parser | **No.** The bug is in `qs.stringify` with `arrayFormat: 'comma'`, which the app does not call. |
| mysql2, deepmerge-ts, fast-uri | high | prisma > mysql2, prisma > @prisma/config, prisma > @prisma/dev > ajv | **No.** All sit under the Prisma CLI toolchain. The app uses the `pg` adapter, not mysql2. |
| vitest, tinypool, @vitest/mocker, glob, minimatch, test-exclude, @vitest/coverage-v8 | critical to moderate | devDependencies | **No.** Test tooling only, not installed in production. |

### Core (fixed in this phase, owner lane: core)

| ID | Severity | Finding and evidence | Fix (commit lane `core:`) | Status |
|---|---|---|---|---|
| C1 | Medium | No limit on text size. A 5 MB contract took 17.7 s, and the JSON route accepted any size. A few requests could keep the service busy. | `MAX_CHARS = 2,000,000` and `MAX_PAGES = 300` in `parser/parser.py`; JSON text checked in `service/main.py`. New codes `DOCUMENT_TOO_LARGE` (413) and `TOO_MANY_PAGES` (422). | Fixed |
| C2 | Medium | Quadratic string joins in the segmenter: 1 MB made of tiny fragments took **24.49 s**. | Collect parts in a list and join once (`segmenter/segmenter.py`). Same input now **0.85 s**. | Fixed |
| C3 | Low | The upload was read fully into memory before the size check. | Read in 1 MB chunks and stop at 10 MB; middleware rejects an oversized `Content-Length` before the body is read. Live: 12 MB file rejected in 0.23 s with 413; a 30 MB request rejected in 0.002 s. | Fixed |
| C4 | Low | Error messages echoed the submitted text (validation errors) and library text (`PARSE_FAILED`). | Validation errors list field names only; the PDF error is a fixed sentence. Test `test_error_messages_do_not_echo_input_or_library_text`. | Fixed |
| C5 | Info | The service has no authentication. | Documented in `service/main.py`: bind to 127.0.0.1 (the uvicorn default) and never expose port 8001. `scripts/start-all.*` does not change the host. | Documented |
| C6 | Info | Regex rules vs catastrophic backtracking. | Section 3: 0 of 66 patterns flagged. | Pass |
| C7 | Low | `core/requirements.txt` is unpinned, so installs can pick up new versions. | Pin versions once the team freezes dependencies (`pip freeze`). Not done here because it needs a decision on which versions to freeze. | Open |

Limits added and the live checks, on the running service:

```
12 MB upload                        {"error":"File is larger than the 10 MB limit.","code":"FILE_TOO_LARGE"} [413] 0.23s
30 MB upload                        {"error":"The request body is too large.","code":"REQUEST_TOO_LARGE"} [413] 0.002s
corrupt PDF                         {"error":"Could not read the PDF. It may be corrupt or password-protected.","code":"PARSE_FAILED"} [422]
JSON missing user_party             {"error":"Invalid request: user_party: Field required","code":"INVALID_REQUEST"} [422]
body that is not JSON               {"error":"The request body must be valid JSON ...","code":"INVALID_REQUEST"} [422]
```

`pytest core/tests`: 12 passed (8 existing plus 4 new in `core/tests/test_security.py`).

Not tested: a PDF built to expand when decompressed (a "PDF bomb"). The 10 MB and 300 page limits reduce this but I did not measure the worst case.

### Frontend (owner lane: frontend)

| ID | Severity | Finding | Status |
|---|---|---|---|
| F1 | Info | The sign-in token is kept in `localStorage` (`src/api/client.ts:46`). Any script on the page could read it. It is a mock token today. When real auth lands, prefer an `HttpOnly` cookie (the backend already allows credentials) and keep tokens short-lived. | Open, depends on backend auth |
| F2 | Info | No Content-Security-Policy. Add one in the hosting layer or response headers when deployed; a meta tag would break the Vite dev server. | Open |
| F3 | Pass | No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or `document.write` in `src/`. React escapes all text. `npm audit`: 0 vulnerabilities. | Pass |

No frontend code was changed in this phase.

## 5. Items I dropped or downgraded (manual triage, to re-check with fp-check)

| Item | Why it was dropped or downgraded |
|---|---|
| `proxy-addr` critical | Needs `trust proxy`; not set. Not reachable. |
| `qs` moderate | Needs `qs.stringify` with `arrayFormat: 'comma'`; not called. |
| `mysql2`, `deepmerge-ts`, `fast-uri` high | Only in the Prisma CLI toolchain path; the app uses `pg`. |
| `tinypool`, `vitest`, `glob`, `minimatch` etc. | devDependencies only. |
| "Path traversal on upload and delete" | File names are server-generated; see "Checked and not a finding". |
| "CORS credentials with a wildcard" | Not present: the origin is one configured URL. |
| ReDoS in core rules | Tested; 0 flagged. Kept as an info item, not a vulnerability. |
| Backend `Ignore file deletion errors` (`documentService.ts:160`) | Leaves orphan files, not a security bug. Folded into B5 (cleanup). |

## 6. What changed in the repo

- `core/`: `parser/parser.py`, `parser/__init__.py`, `segmenter/segmenter.py`, `service/main.py`, new `eval/regex_stress.py`, new `tests/test_security.py`.
- `docs/security/`: this file and `backend-issues.md`.
- `backend/` and `frontend/`: not changed.

## 7. Status after phase 8 (backend integration)

Checked in code and tests on 2026-11-04. Items not listed here are unchanged.

| ID | Status |
|---|---|
| B1 no authentication | Fixed: JWT auth on every route except health and `/auth/*`; tests in `backend/api/tests/auth.test.ts` and `access.test.ts`. |
| B2 anyone can change rules | Fixed: admin only (`rules.test.ts`). |
| B3 any user can list all documents | Fixed: a user sees only their own; a lawyer sees all; an admin none (`access.test.ts`). |
| B4 upload type from client header | Fixed: magic-byte check (`upload.test.ts`). |
| B5 no rate limit | Partly: `express-rate-limit` on login, register, upload and process. No per-user quota or old-file cleanup. |
| B6 pdf-parse in the Node request | Fixed: removed; PDFs are read by core, which has size, page and character limits. |
| B7 multer 1.x | Fixed: multer 2.5.0. |
| B8 mass assignment | Fixed: the parsed body replaces `req.body`; rule and override schemas are `.strict()`. |
| B9 rule pattern not validated | Fixed: core checks every rule on save (regex, length, nested repeats). Residual: see known-limitations. |
| B10 dependency advisories | Partly: `npm audit fix` took 16 down to 8 (5 moderate, 1 high, 2 critical). The remaining production one is `zod` (major upgrade); the critical ones are dev-only test tools. |
| B11 error details leaked | Fixed: fixed messages with a code; server logs the cause. |
| B12 processing lock race | Fixed: the lock is one conditional update, with a 5-minute stale timeout. |
| B13 security headers | Fixed: `helmet()`. The health route still reports database state. |
| fp-check | Not applied (plugin not installed). |
