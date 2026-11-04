# Backend issues for Abhishek

Raised by Varun's phase 4 review. `backend/` was not edited. The first four are integration work needed so the frontend and `core/` can be connected; the rest are security items from `docs/security/audit.md` (IDs B1 to B13 refer to that file). Changes to `shared/contracts/` go through Varun.

## 1. Lawyer override endpoint (needed by the frontend)

The lawyer review screen cannot save yet. It stores overrides in the browser (`frontend/src/api/mock.ts`) with a TODO.

Add:

```
PATCH /api/clauses/:id/override
Body:     { "score": 0-10 (number), "reason": non-empty string (max 1000) }
200:      the clause, including score { auto, lawyer_override }
404:      clause not found     400: validation failed     401/403: once auth exists
```

Rules:
- `auto` is never changed by this call. Store the override in its own column (`lawyerOverride`, `lawyerOverrideReason`, `overriddenAt`, and `overriddenBy` once users exist).
- `DELETE /api/clauses/:id/override` should clear the override.
- Only a reviewer or admin role may call it (see B1).
- Report and clause reads must return `score: { auto, lawyer_override }` as in `shared/contracts/clause.schema.json`.

Contract gap for Varun: `clause.schema.json` has `lawyer_override` but no field for the reason. The frontend requires a reason. Proposal: add optional `lawyer_override_reason` (string) and `overridden_at` (date-time) to the clause schema.

## 2. Rule `pattern` is not validated as a regex (crash and ReDoS risk)

`src/validators/document.ts:23` is `pattern: z.string().min(1)`. Nothing compiles it. The mock engine does not run patterns, so it is latent today, but:
- an invalid pattern such as `(unclosed` is saved and will throw when any code compiles it;
- a catastrophic pattern such as `(a+)+$` will hang the process that runs it on a long clause. Python's `re` and JavaScript's `RegExp` have no timeout.

The frontend already refuses an invalid pattern in the browser, but that is not a control: the API must check too.

Required on `POST` and `PATCH /api/rules`:
1. Compile in a `try/catch`; return 400 with the message.
2. Limit the length (suggest 500 characters).
3. Reject nested quantifiers and repeats on groups that can repeat (for example `(x+)+`, `(x*)*`, `(x|x)*`). A package such as `safe-regex2` can do this check.
4. Run each pattern against a 100,000-character test string with a time limit when a rule is saved or enabled, and reject it if it is slow. `core/eval/regex_stress.py` shows the method.
5. Do not execute a stored pattern in the Node process on user documents. Matching belongs in `core/` (see item 4).

Also fix B8: `validate()` discards the parsed body, so the controllers save the raw `req.body`. Assign the parsed result and make the schemas `.strict()`.

## 3. Report lists are strings and must become `reportItem` objects

`topRisks`, `obligations` and `exitConditions` are `string[]` today (`src/types/index.ts`, `ProcessingResult` and the `Report` model). `shared/contracts/report.schema.json` now defines each entry as:

```
{ "clause_index": integer, "text": string, "rule_id": string | null, "score": number, "label": "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL" }
```

Needed:
- Change the Prisma `Report` model so the three lists store objects (Postgres `Json` or `Json[]`), and migrate.
- Change `ClauseProcessingEngine` and `ProcessingResult` to return those objects.
- Return the contract's field names in the API (snake_case, or add a mapping layer and document it).
- Return `rule_id` and `score: { auto, lawyer_override }` on every clause. Today clauses have only `riskLevel`, so the frontend shows "No rule id" and "not reported".
- The frontend maps both shapes in `frontend/src/api/client.ts` (`getReport`) and will drop the string handling once this lands.

## 4. Two separate rule stores need one source of truth

| | `backend` `/api/rules` (Postgres) | `core/rules/rules.json` |
|---|---|---|
| Identifier | uuid `id` | `rule_id` such as `PEN-004` |
| Pattern | one `pattern` string | `patterns[]` (several regexes) |
| Strength | `riskLevel` LOW / MEDIUM / HIGH | `severity_weight` 1 to 5 |
| Effect | `sentiment` | `party_effect_hint` (from the tenant, employee, recipient or client side) |
| Other | `name`, `explanation`, `isActive` | `category` (lower case), `explanation` |

Today the admin screen edits one list and the analyzer reads the other, so an admin's change has no effect on results.

Proposal (to agree with Varun, then change `shared/contracts/`):
1. **The database is the source of truth.** The admin screen already writes there.
2. Add `shared/contracts/rule.schema.json`: `rule_id` (stable string, unique), `category`, `patterns` (array), `severity_weight` (1 to 5), `party_effect_hint`, `explanation`, `is_active`.
3. Migrate the backend `Rule` model to that shape (`pattern` becomes `patterns[]`, add `ruleId`, `severityWeight`, `partyEffectHint`).
4. Backend exposes `GET /api/rules/export` (active rules in the contract shape). `core` loads them at start-up and on a refresh call, and validates every rule with the existing loader (regex compiles, no duplicate `rule_id`, weight range) plus the safety check from item 2. A rule that fails is skipped and logged, not loaded.
5. `core/rules/rules.json` stays as the seed file and the offline fallback, and the 51 current rules are imported once into the database.

Alternative: `core` owns the rules and exposes `GET/PUT /rules`; the backend proxies the admin screen to it. It keeps one validator but makes core stateful. I recommend the database option because the rest of the data already lives there.

## 5. Security items from the audit (backend)

Full detail, evidence and file lines are in `docs/security/audit.md`. In priority order:

| ID | Item | Severity |
|---|---|---|
| B1 | Add authentication and per-document ownership checks to every route | High |
| B2 | Admin-only writes on `/api/rules` | High |
| B3 | `GET /api/documents` must not list other people's documents or return clauses in list results | High |
| B4 | Check file content (magic bytes), not the client `Content-Type`; choose the stored extension from the detected type | Medium |
| B5 | Rate limit upload and process; per-user quota; clean up old files | Medium |
| B6 | Stop parsing PDFs in the Node request (use `core`, which now has 10 MB, 300 page and 2,000,000 character limits) | Medium |
| B7 | Upgrade `multer` 1.x to 2.x | Medium |
| B8 | Save the validated body, not `req.body`; `.strict()` schemas | Medium |
| B10 | `npm audit fix` (body-parser first); plan the `zod` and `vitest` major upgrades | Medium |
| B11 | Do not return `details` (Prisma `meta`, raw errors) to the client | Low |
| B12 | Make the processing lock atomic and add a stale-lock timeout | Low |
| B13 | Add `helmet()`; keep detailed health output internal | Low |

When `core` is connected (replacing `clauseEngine.ts`), call `POST http://127.0.0.1:8001/analyze` only from the server, treat the `{error, code}` body as the failure contract, and never pass the core URL or its error text to the browser.
