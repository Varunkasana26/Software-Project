# Test cases (submission set)

Exactly 8 cases. Each one was run for real on 2026-11-04 against the repository at the commit named in the final report; the "Actual result" column is the output of that run, not an expectation.

How to repeat the runs:

| Run | Command (from the repo root) |
|---|---|
| core automated tests | `python -m pytest core/tests -v` |
| backend automated tests | `cd backend/api && npx vitest run --reporter=verbose` |
| live stack check | start the stack (`scripts/start-all.sh` or `.\scripts\start-all.ps1`), then `python scripts/smoke-test.py` |

Pass/fail below is for the run described, and every case passed.

| ID | Scenario | Input | Expected result | How it is run | Automated test | Actual result (real run) | Pass/fail |
|---|---|---|---|---|---|---|---|
| TC-01 | A scanned PDF is rejected | `core/data/samples/scanned_sample.pdf` (one page that is only an embedded image, no text layer) | Rejected with code `SCANNED_PDF_UNSUPPORTED`; HTTP 422 through the whole stack; no report is created | pytest, plus the smoke test against the live stack | `core/tests/test_core.py::test_scanned_pdf_is_rejected`; `backend/api/tests/processing.test.ts` "passes core's rejection of a scanned PDF through" | pytest: PASSED. Backend test: passed. Live smoke test: `HTTP 422 SCANNED_PDF_UNSUPPORTED`. | Pass |
| TC-02 | A file over 10 MB is rejected | A `.txt` of 10 MB + 1 byte (`a` repeated) | Rejected with code `FILE_TOO_LARGE`, HTTP 413, before the text is analysed | pytest, plus a direct POST to core `/analyze` | `core/tests/test_core.py::test_oversized_file_is_rejected`; `core/tests/test_security.py::test_oversized_upload_is_rejected_with_413` | pytest: both PASSED. Live POST to core: `413 {'error': 'File is larger than the 10 MB limit.', 'code': 'FILE_TOO_LARGE'}`. | Pass |
| TC-03 | A clause that matches no rule is "other" with no rule ids | Text: `The sky is blue and the grass is green today.` (party tenant) | `category = OTHER`, `rule_id = null`, `matched_rule_ids = []` (the engine does not guess) | pytest, plus a direct POST to core `/analyze` | `core/tests/test_core.py::test_no_matching_rule_gives_other_and_no_rule_ids` | pytest: PASSED. Live: `OTHER None []`. | Pass |
| TC-04 | The matched rule id is stored | Clause: `The deposit is non-refundable if the Tenant leaves early.` | `rule_id` names the strongest matching rule (`PEN-008` for this clause alone) and is saved on the clause in the database | pytest, backend test with core mocked, and the live smoke test on a full contract | `core/tests/test_core.py::test_matched_rule_id_is_stored`; `backend/api/tests/processing.test.ts` "stores clauses with rule id and automatic score" | pytest: PASSED. Backend: passed (stored `ruleId: PEN-008`, `autoScore: 8`). Live smoke test: `top risk is a reportItem with a rule id [PEN-004 score 10]`. | Pass |
| TC-05 | A lawyer's override keeps the automatic score | Lawyer calls `PATCH /api/clauses/:id/override` with `{score: 3, reason}` on a clause whose automatic score is 10. A normal user tries the same call. | Response shows `score: {auto: 10, lawyer_override: 3}`; the automatic score is unchanged; the user gets 403 | pytest, backend tests, and the live API with the demo lawyer and user | `core/tests/test_core.py::test_lawyer_override_does_not_overwrite_auto_score`; `backend/api/tests/override.test.ts` (3 tests) | pytest: PASSED. Backend: 3 passed. Live: lawyer `200 {'auto': 10, 'lawyer_override': 3}`; user `403`. The test override was removed afterwards. | Pass |
| TC-06 | An unknown party gives neutral and a warning | `POST /analyze` with `user_party: "banana"` on `The deposit is non-refundable if the Tenant leaves early.` | Every clause is `NEUTRAL`, and the report carries a warning that the party is unknown | pytest, plus a direct POST to core `/analyze` | `core/tests/test_core.py::test_unknown_party_gives_neutral_and_warning` | pytest: PASSED. Live: `NEUTRAL`, warnings: `["user_party 'banana' is missing or unknown; every clause is labelled neutral."]`. | Pass |
| TC-07 | A user cannot read another user's report | User A uploads and analyses a contract. User B asks for A's report, document and clauses. A signed-out request asks for the report. | User B gets 404 for each (not 403, so the document's existence is not revealed). Signed out gets 401. A lawyer can read; an admin cannot. | backend tests, and the live smoke test with two fresh accounts | `backend/api/tests/access.test.ts` (4 tests) | Backend: 4 passed. Live smoke test: `user B cannot read user A's report/document/clauses [HTTP 404]` (three checks), `signed-out request is refused` passed. | Pass |
| TC-08 | A normal contract produces a schema-valid report | `core/data/samples/rental_landlord_friendly.txt`, party tenant, through the live stack (and `employment_1.txt` in the pytest) | The report validates against `shared/contracts/report.schema.json`; every clause has a category and a score; top risks are `reportItem` objects with rule ids | pytest (core service), and the live smoke test (backend returns the same shape) | `core/tests/test_core.py::test_analyze_returns_schema_valid_report` | pytest: PASSED. Live smoke test: `report matches report.schema.json [20 clauses]`, `every clause has a score and category`. | Pass |

## Where the other tests are

These 8 are the submission set. The repository also has 28 core tests and 23 backend tests (see `core/tests/` and `backend/api/tests/`), and `scripts/smoke-test.py` has 13 live checks. The smoke test creates two new accounts in the database on every run.

## Not covered

The independent evaluation of the rules on real contracts is not done. See `docs/known-limitations.md` and `tests/README.md`.
