# Known limitations

This page says what the project does not do, and what the numbers do not prove. Each item has one line of future work.

## Rules are frozen

`core/rules/rules.json` is frozen until the evaluation on real contracts. Do not change it before then.

- SHA-256 (line endings normalised to LF): `29e3d1f586b6b4287a78fd755131518d6c5c6bc5d95fcee8e3d8861d835a4425`
- Git blob: `e185a854a938f3802d1f9da51d65d41935e01f4d` (check with `git hash-object core/rules/rules.json`)
- The file has not changed since the hold-out run (commit `68ad423`).
- `core/tests/test_rules_frozen.py` fails if the file changes. If a change is deliberate, update `core/rules/rules.sha256` in the same commit and say why.
- The backend copies these rules into its database once, when the table is empty. Edits made in the admin screen change the database, not this file, so they do not trip the guard and are not frozen.

## What the system is

| Limitation | Future work |
|---|---|
| It is rule-based, not machine learning. It finds keywords and patterns with regular expressions. It does not understand a sentence. | Train or fine-tune a classifier once there are enough independently labelled clauses, and keep the rules as an explainable fallback. |
| It does not give legal advice and has no lawyer-reviewed knowledge. Its output is a first-pass aid. | Add a reviewer workflow where a lawyer signs off a report. |
| Bare cues decide the category when nothing more specific matches: a plain "may" makes a clause a right, a plain "shall" makes it an obligation. A topic word in the same clause can lose to a cue, for example a payment clause that also contains "may". | Weight topic rules above cues in the classifier, or read the main verb of the clause. |
| The scorer cannot see who benefits from one-sided wording. It adds up fixed per-rule hints. A clause that no rule matches is always neutral, even if a person would call it one-sided. Example: a clause that lets the landlord keep a deposit for 90 days while deducting "any amounts the Landlord considers necessary" scores neutral. | Add rules for open-ended discretion and for asymmetric wording. |
| A rule cannot tell which party is acting. Rule hints assume the tenant, employee, recipient or client side and are flipped for the other side, which only works when the pattern names the actor. Example: "Client may leave in 30 days, provider needs 90" is scored neutral. | Parse the subject of the clause. |
| Three contract families are judged from one party's side (tenant, employee, client or freelancer). There is no support for other contract types or for a neutral summary. | Add contract-type detection and per-type rule packs. |
| English only. Dates, amounts and names are not understood, only matched as text. | Add language detection and a translation step. |
| Scanned PDFs are rejected (no OCR). Files over 10 MB, over 300 pages or over 2,000,000 characters are rejected. | Add OCR (for example Tesseract) with a page and time limit. |
| The optional Claude explanation (`ANTHROPIC_API_KEY`, `core.cli --llm`) was never run, because no key was available. The system works fully without it. | Test it with a key and add a test with a mocked client. |

## What the numbers do and do not show

| Limitation | Future work |
|---|---|
| The evaluation data is small and synthetic. The 40-clause synthetic set (`core/data/labeled/contract_clause_synthetic_dataset_40_revised.xlsx`) was written and labelled by one LLM, so it is not independent evidence. | Evaluate on real contracts labelled by people (Phase 5). |
| The 40-clause set from the 8 sample contracts (`core/data/labeled/gold.json`) was labelled by an AI assistant, never reviewed by a person, and the rules were written while looking at the same contracts. Its 40/40 and 39/40 scores show fit, not skill. | Have the team review every label by hand. |
| The 30 DEV clauses (29/30 category, 30/30 party_effect) were read while writing the rules. They show fit, not skill. | Report only independent results in the final write-up. |
| **The hold-out (H01-H10) was seen and is not clean.** Its text and labels were printed in a console run before the rules were written, so they were in the author's context. The 7/10 category and 7/10 party_effect score on 10 clauses carries heavy uncertainty. | Use clauses nobody has seen, labelled before anyone looks at the rules. |
| Label inconsistency exists in the synthetic set. E05 ("The Employer may terminate employment for ... misconduct ...") is labelled `right`, while the same wording in two other clauses is labelled `termination`. No rule can fix an inconsistent label. | Write a labelling guide and have two people label each clause. |
| Both baselines are beaten only on the data the rules saw. On the hold-out the margin is 0.70 against 0.30 (category) and 0.70 against 0.50 (party_effect) on 10 clauses. | Re-measure on the independent set. |

## Platform and security

| Limitation | Future work |
|---|---|
| Re-analysing a document replaces its clauses, so lawyer overrides on that document are lost. | Carry overrides over by matching clause text. |
| `LAWYER` and `ADMIN` accounts can only be created by an operator (`npm run seed:users`). There is no password reset, no email check and no user management screen. | Add an admin screen for users and a reset flow. |
| The demo accounts and their passwords are public (in `README.md`). They are for a local demo only. | Remove them in any shared deployment. |
| Offline demo mode (`start-all --offline`) stores everything in memory and has public demo accounts. It exists so teammates can run the app without the database password, and the backend refuses to start with it in production. It does not exercise the real database. | Deploy a hosted demo (frontend, backend and core) with its own database instead of sharing credentials. |
| The database connection accepts the Supabase certificate without pinning it (`rejectUnauthorized: false`). | Pin the CA certificate. |
| The cookie is not `Secure` by default (`COOKIE_SECURE=false`), because the demo runs over http. | Set it to `true` behind HTTPS. |
| Rate limiting is in-memory per process, and is off in tests. | Use a shared store when running more than one process. |
| The backend still has 8 `npm audit` advisories (5 moderate, 1 high, 2 critical) after the non-breaking fixes. The remaining production one is `zod` (needs a major upgrade); the critical ones are in the test tool `vitest`/`tinypool`, which is not installed in production. | Upgrade `zod` and `vitest` and re-run the tests. |
| Rule patterns are checked for compile errors, length and nested repeats. A catastrophic pattern that avoids a nested repeat, such as `(a|a)*b`, would still pass. | Run each new pattern against a time-limited stress input before saving it. |
| The smoke test creates two new accounts in the database on every run. | Add a cleanup step. |
| A PDF built to expand when decompressed was not tested. | Measure memory and time on a hostile PDF. |
| Not every audit finding is closed. See `docs/security/audit.md` and `backend-issues.md` for the status. | Close the remaining items. |

## Phase 5 (independent contracts) is not done

Left as documented TODOs, not filled in by the AI assistant: three independent contracts in `core/data/samples_independent/`, a labelling template, and human labels. See `tests/README.md`.
