# tests

- **Owner:** Shaurya
- **Purpose:** Project-level tests.
- **Belongs here:** unit/, integration/ and samples/ (sample legal documents).
- **Must not be edited by others:** everything in this folder. Open a pull request or ask Shaurya.

## Rule

The final submitted test-case set is 5 to 10 cases, documented in `tests/test-cases.md`.

## Status of the submission set

`tests/test-cases.md` has the 8 submission cases with real run results. They are mapped to automated tests in `core/tests/` and `backend/api/tests/`, and to `scripts/smoke-test.py` for the live stack.

## TODO (Phase 5, not done): evaluation on independent contracts

Everything measured so far uses a small synthetic set written and labelled by one LLM, plus the 8 sample contracts the rules were written against. A real evaluation still needs:

- [ ] 3 real or public-style contracts dropped by the team into `core/data/samples_independent/` (the folder does not exist yet).
- [ ] `core/data/labeled/independent_template.csv` pre-filled with their segmented clauses (columns: `sample_file, clause_text, category, party_effect, labeller, notes`).
- [ ] Labels filled in **by people, without opening `core/rules/rules.json`**. Nobody, including the AI assistant, fills these in on their behalf.
- [ ] Score with `python -m core.eval.evaluate --gold <file>` and report every miss.

Do not change the rules before this evaluation (see `docs/known-limitations.md`).
