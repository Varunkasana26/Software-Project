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
- `gold.json` always carries `label_source = "two independent LLM passes; disagreements resolved by a team member"`. That text is only true if the passes really were independent.

## Known limits

- Rules are keyword patterns. A rule cannot tell which party is acting, so asymmetric clauses (for example "Client can leave in 30 days, Provider needs 90") can be scored wrong.
- Only English, text-based PDFs. No OCR.
- Evaluation numbers come from a 40-clause set that the rules were tuned on, so they are optimistic.
