# Viva notes

## Architecture in one paragraph

A user signs in to the React frontend and uploads a contract and says which side they are on (tenant, employee, ...). The Node/Express backend checks the file content, stores it for that user, and sends the file, the party and the **active rules from its database** to the Python core service (`POST /analyze`). Core reads the text (plain text or text-based PDF), splits it into clauses, matches each clause against the rules with regular expressions, scores it from the user's side, and builds a Report (top 5 risks, obligations, exit conditions, every clause with its rule id and score). The backend stores that report; the frontend shows it. A lawyer can override a clause's score with a reason (the automatic score is kept), and an admin can edit the rules, which changes the next analysis. There is no machine learning: every result can be traced to a rule id. The folders are separate lanes that talk only through the JSON schemas in `shared/contracts/`.

## The pipeline for one real clause

Command: `python -m core.cli core/data/samples/rental_landlord_friendly.txt --party tenant --trace --clause 7`

1. **Parse.** The file is read as plain text (3,314 characters).
2. **Segment.** The text became 20 clauses. Clause 7 has heading `SECURITY DEPOSIT` and text: *2.2 The deposit is non-refundable if the Tenant vacates before the end of the fixed term, and the Landlord may retain the entire deposit as liquidated damages.*
3. **Classify.** Four rules matched. The category comes from the strongest one (weight 4, and the earlier rule wins a tie):

   | Rule | Category | Weight | Hint (tenant side) | Matched text |
   |---|---|---|---|---|
   | PEN-004 | penalty | 4 | unfavorable | `liquidated damages` |
   | PEN-008 | penalty | 4 | unfavorable | `non-refundable`, `retain the entire deposit` |
   | OBL-018 | obligation | 2 | neutral | `deposit is non-refundable` |
   | RGT-008 | right | 1 | neutral | `may` |

   Category = `penalty`.
4. **Score for the tenant.** Hints are used as written for a tenant. risk = 4 + 4 = 8, benefit = 0, so the label is `unfavorable` and `auto_score = min(10, 2 x 8) = 10`. `lawyer_override` is `null`.
5. **Explain.** The stored texts of the matched rules are joined: "Liquidated damages: a fixed sum payable on breach, whatever the real loss. The deposit can be kept or is not refundable. ..."
6. **Report entry.** `category: PENALTY`, `sentiment: UNFAVORABLE`, `rule_id: PEN-004`, `matched_rule_ids: [PEN-004, PEN-008, OBL-018, RGT-008]`, `score: {auto: 10, lawyer_override: null}`. This clause is the first item in `top_risks`.

Run it again with `--party landlord`: the same rules match, but the hints are flipped, so the label becomes `favorable` and the score drops to 0.

## Add a rule live and re-run

**In the app (this changes real results):**

1. Sign in as `demo.admin@example.com` (see the README) and open **Rules**.
2. Click **Add rule**. Example: Rule id `DEMO-001`, category `Right`, severity weight `2`, effect `Unfavorable`, pattern `\bsublet(?:ting)?\b`, explanation "Subletting is restricted."
3. Save. The server asks core to check the pattern; a bad pattern such as `(a+)+$` is refused with a clear message.
4. Sign in as the demo user, open **Documents**, click **Analyze again** on a contract that mentions subletting, and open the report. The clause now shows `DEMO-001`.
5. To undo, switch the rule off with its toggle (or delete it) and analyze again.

**From the command line (the file, not the database):**

1. Edit `core/rules/rules.json` and add a rule with `rule_id`, `category`, `patterns`, `severity_weight`, `party_effect_hint`, `explanation`.
2. Run `python -m core.cli core/data/samples/rental_landlord_friendly.txt --party tenant --trace` to see it match.
3. `pytest core/tests` will fail on `test_rules_frozen.py` until you update `core/rules/rules.sha256`. That is intentional: the rules are frozen (see `docs/known-limitations.md`).
4. The backend copies `rules.json` into its database only when the table is empty, so a file edit does not change a running system. Use the admin screen for that.

## Three likely questions, with honest answers

**1. "How accurate is it?"**
I can only give you the numbers I measured, and none of them show how it performs on new contracts. On the 8 contracts I wrote the rules against it scores 40/40 on category, which just shows the rules fit that data. On a separate synthetic set of 40 clauses (written and labelled by one LLM), I split it: on 30 clauses I used to write the rules it scores 29/30 on category and 30/30 on party effect (also fit, not skill), and on the 10 left out it scored 7/10 and 7/10. Those 10 were not fully clean, because I had seen them before writing the rules, and 10 clauses is far too few to trust. For comparison, always guessing the most common answer scores 0.30 on category and 0.50 on party effect on those 10. The real test, on contracts labelled by people, is not done yet, and it is listed in `docs/known-limitations.md`.

**2. "Why rules and not machine learning or an LLM?"**
We had no labelled legal data to train on, and a classifier trained on a few dozen clauses would just memorise them. Rules give three things a marker can check: every result names the rule that produced it (`rule_id`), the behaviour is deterministic and the same input gives the same output, and an admin can fix a mistake by editing a rule. The cost is coverage: the rules only see wording they were written for, and they cannot tell who benefits from a sentence. The design keeps the rules as data, so a classifier could be added later and compared on the same independent set. The optional LLM explanation exists but was never run without a key; the system does not need it.

**3. "What if it is wrong? Can I rely on it?"**
No, and the system is built not to pretend. A clause that matches nothing is reported as `other` with no rule ids rather than guessed. Scanned or oversized files are rejected with a clear code instead of producing a weak result. If the analysis service is down, the backend returns an error and never shows made-up results. A lawyer can override any score with a recorded reason, and the original automatic score is always kept. The report is a first-pass aid, not legal advice, and the limitations page says where it is known to be weak: wording that is one-sided without using a known phrase, ordinary cues like "may" deciding a category, and clauses it labels neutral that a person would call unfavorable.

## Other things worth knowing before the viva

- Where each requirement lives: security audit in `docs/security/`, tests in `tests/test-cases.md`, design in `frontend/DESIGN.md`, contracts in `shared/contracts/`.
- The frontend never talks to core; only the backend does.
- The first time the rules table is empty, the backend seeds it from `core/rules/rules.json` (71 rules). After that the database is the source of truth.
- `python scripts/smoke-test.py` proves the whole stack in about 15 seconds.
