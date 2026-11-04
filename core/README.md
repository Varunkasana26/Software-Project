# core

- **Owner:** Varun
- **Purpose:** Python 3.11+ rule-based contract analyzer (no machine learning), exposed over HTTP for the Node backend.
- **Belongs here:** `parser/`, `segmenter/`, `classifier/`, `scorer/`, `report/`, `rules/`, `service/`, `data/`, `eval/`, `tests/`.
- **Must not be edited by others:** everything in this folder. Open a pull request or ask Varun.

## Pipeline

`parse_document` -> `segment_clauses` -> `classify_clause` -> `score_clause` -> `build_report`

| Step | File | What it does |
|---|---|---|
| parse | `parser/parser.py` | `.txt` and text-based `.pdf` to text. Rejects scans, files over 10 MB and other types (`ParseError` codes `SCANNED_PDF_UNSUPPORTED`, `FILE_TOO_LARGE`, `UNSUPPORTED_TYPE`) |
| segment | `segmenter/segmenter.py` | Splits on numbered headings, ALL-CAPS headings and blank lines |
| rules | `rules/rules.json`, `rules/loader.py` | Rules are data (regex patterns). The loader fails on a bad regex or duplicate `rule_id` |
| classify | `classifier/classifier.py` | Matches rules; stores every matched `rule_id`; no match means category `other` |
| score | `scorer/scorer.py` | `auto_score` 0-10 and a label for the user's side. A `lawyer_override` never replaces `auto_score` |
| report | `report/report.py` | Top 5 risks, obligations, exit conditions, counts |
| explain | `explainer.py` | Stored rule text. Optional Claude text only if `ANTHROPIC_API_KEY` is set |

`pipeline.py` chains the steps.

## Run

From the repo root (or from `core/` for the service):

```bash
pip install -r core/requirements.txt

# API
cd core && uvicorn service.main:app --port 8001

# CLI demo, no API needed
python -m core.cli core/data/samples/rental_landlord_friendly.txt --party tenant

# Evaluation on the hand-labelled set
python -m core.eval.evaluate

# Tests
pytest core/tests
```

- `GET /health` returns `{"status": "ok"}`.
- `POST /analyze` accepts JSON `{document_text, user_party}` or a multipart form with `file` and `user_party`. It returns a Report, or `{error, code}` (413 file too large, 415 unsupported type, 422 scanned PDF or invalid body).
- `user_party`: `tenant`, `landlord`, `employee`, `employer`, `recipient`, `discloser`, `client`, `provider`, `contractor`, `freelancer`. An unknown value labels every clause `neutral` and adds a warning.

## Fields beyond the shared schemas

`shared/contracts` allows extra properties, so the Report adds: `warnings` (report), and `matched_rule_ids`, `heading`, `warning` (clause). The schema's `rule_id` holds the strongest matched rule; `matched_rule_ids` holds all of them. Category and sentiment are upper-case as in the schema (`PAYMENT_TERM`, `UNFAVORABLE`).

## Scoring

Each rule has a `severity_weight` (1-5) and a `party_effect_hint` written from the tenant / employee / recipient / client side. For landlord / employer / discloser / provider the hint is flipped.
`risk` = sum of weights of rules that hurt the user, `benefit` = sum that help. Label is `unfavorable` if risk > benefit, `favorable` if benefit > risk, else `neutral`. `auto_score = min(10, 2 * risk)`.

### What the three labels mean

**For the scorer** (what the code does, per clause):
- `unfavorable`: the matched rules that hurt the user's side outweigh the ones that help it.
- `favorable`: the matched rules that help the user's side outweigh the ones that hurt it.
- `neutral`: nothing that matters matched, or the two sides cancel out, or only neutral rules matched. Ordinary duty and permission cues ("shall", "may", a notice period, a payment date, a governing law) carry a `neutral` hint, so they never change the label or the score.
- The label comes only from the `party_effect_hint` of the matched rules and the side the user is on. The scorer cannot read who benefits from a sentence on its own, so a clause is only `favorable` or `unfavorable` if some rule says so.

**For the labelling convention** (the synthetic dataset in `data/labeled/`, written by people or an LLM):
- Ordinary, standard duties and rights are `neutral`.
- `favorable` is reserved for clear protection of the perspective party.
- `unfavorable` is reserved for unusually burdensome, one-sided terms or penalties.

**Where they differ:**
- The labeller judges the whole clause. The scorer adds up fixed per-rule hints, so a clause with no matching rule is always `neutral`, even if a person would call it one-sided.
- A rule hint is the same for every contract. A labeller can call the same wording neutral in one contract and favorable in another.
- Labels are written from one side (tenant, employee, freelancer, ...). The scorer flips the hints for the opposite side, which only works if the rule patterns name the acting party (for example employer vs. client).
- `auto_score` is a risk number from unfavorable rules only. A `favorable` or `neutral` clause scores 0 unless an unfavorable rule also matched.
- `severity_weight` on a neutral rule only decides which category wins when several rules match (higher weight wins, then the order of the file: penalty, right, termination, payment_term, obligation, other). It does not change the risk score.

### Rule coverage

Rules added in phase 7 carry a one-line `justification` in `rules/rules.json` (a general drafting convention, or vocabulary from `data/cuad_keyword_notes.md`). Duty and permission cues have weight 1, topic rules (notice, payment schedule, governing law, confidentiality, deposit, repairs) weight 2, and only deductions and a few clearly one-sided terms are weighted 3.

## Data

- `data/samples/`: 8 fictional contracts (`.txt`), 2 text PDFs and 1 scanned-style PDF. Rebuild PDFs with `python core/data/make_pdfs.py`.
- `data/labeled/gold.json`: 40 labelled clauses. **First draft, not reviewed by a human.**
- `data/cuad_keyword_notes.md`: keyword ideas from CUAD for review. **Not used in `rules.json`.**
- `data/cuad/`: the downloaded CUAD dataset (git-ignored, 97 MB).

## Merging two labelling passes (`eval/merge_labels.py`)

Turns two label files (for example from two LLM passes) into one gold set, with a human settling every disagreement. Standard library only; `import-xlsx` also needs `openpyxl`.

```bash
# 1. Workbook (sheets Clauses and Labels) to clauses.csv and pass1.csv
python -m core.eval.merge_labels import-xlsx core/data/labeled/FILE.xlsx --out-dir core/data/labeled/out

# 2. Compare two passes (same columns: id,category,party_effect,confidence,split_ok,notes).
#    Prints agreement and Cohen's kappa; writes merged_draft.csv, disagreements.csv, spotcheck.csv
python -m core.eval.merge_labels compare pass1.csv pass2.csv --clauses clauses.csv --out-dir OUT [--spotcheck-size 10] [--seed 42]

# 3. After a person fills final_category, final_party_effect and resolved_by for every blank row of merged_draft.csv
python -m core.eval.merge_labels finalize OUT/merged_draft.csv --out-dir OUT [--spotcheck OUT/spotcheck.csv]
```

- `compare` exits 1 if it finds invalid values, duplicate ids, ids in only one pass, or ids missing from the clauses file, and lists them. Agreed rows are pre-filled with `resolved_by = agreement`; any row where the passes differ is left blank.
- `spotcheck.csv` is a seeded sample of the agreed rows. A person fills `human_ok` (y or n); `finalize --spotcheck` reports how many were y.
- `finalize` refuses (exit 1, ids listed, nothing written) if any final label is blank or invalid or `resolved_by` is empty. It writes `gold.csv` and `gold.json` (a JSON list; each item also keeps `perspective` when the clauses file has one, so `party_effect` is judged for the right side).
- Score a result with `python -m core.eval.evaluate --gold OUT/gold.json`.
- Generated files in `data/labeled/out/` are git-ignored.
- `gold.json` records `label_source`: "single LLM pass (not independent)" when the two pass files were identical, otherwise "two independent passes; disagreements resolved by <the resolved_by names>".

## Used by the backend

- `POST /analyze` takes JSON `{document_text, user_party, rules?}` or a multipart form with `file`, `user_party` and an optional `rules` field (JSON text). With `rules`, core uses those rules instead of `rules/rules.json` (the backend sends the active rules from its database). Rules are validated by `rules/loader.py` (fields, regex, length, no nested repeats); a bad rule gives `422 INVALID_RULES`.
- `POST /validate-rules` takes `{rules: [...]}` and returns the problems, so the backend can refuse a bad rule when an admin saves it.
- Schemas: `shared/contracts/analyze.request.schema.json`, `analyze.response.schema.json`, `rule.schema.json`.
- `python -m core.cli FILE --party tenant --trace [--clause N]` prints every stage for one clause (see `docs/viva-notes.md`).
- `requirements-dev.txt` has optional tools (`openpyxl` for `merge_labels import-xlsx`, `playwright` for `scripts/real-screenshots.py`).
- Rules are frozen until the real-contract evaluation: `tests/test_rules_frozen.py` and `docs/known-limitations.md`.

## Known limits

- Rules are keyword patterns. A rule cannot tell which party is acting, so asymmetric clauses (for example "Client can leave in 30 days, Provider needs 90") can be scored wrong.
- Only English, text-based PDFs. No OCR.
- Evaluation numbers come from a 40-clause set that the rules were tuned on, so they are optimistic.
