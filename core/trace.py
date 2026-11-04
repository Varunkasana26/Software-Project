"""Shows every stage the pipeline goes through for ONE clause. Used by:  python -m core.cli FILE --party tenant --trace [--clause N]

Meant for a demo or a viva: it prints the same calls the service makes, one stage at a time.
"""
import json
from typing import Optional

from core.classifier import classify_clause
from core.explainer import explain_clause
from core.pipeline import analyze_text
from core.rules.loader import load_rules
from core.scorer import score_clause
from core.scorer.scorer import FLIP, SIDE_A, SIDE_B
from core.segmenter import segment_clauses


def _step(title: str) -> None:
    print(f"\n{'=' * 78}\n{title}\n{'=' * 78}")


def trace_clause(text: str, party: Optional[str], index: Optional[int] = None, name: str = "document", rules: Optional[list] = None) -> None:
    rules = rules if rules is not None else load_rules()
    clauses = segment_clauses(text, name)

    # Pick the clause: the one asked for, else the riskiest, else the first one a rule matched.
    scored = []
    for c in clauses:
        cls = classify_clause(c, rules)
        scored.append((c, cls, score_clause(cls, party)))
    if index is None:
        with_rule = [s for s in scored if s[1]["matched_rule_ids"]]
        index = max(with_rule, key=lambda s: (s[2]["auto_score"], -s[0]["index"]))[0]["index"] if with_rule else 0
    if not 0 <= index < len(clauses):
        raise SystemExit(f"--clause must be between 0 and {len(clauses) - 1}")
    clause, cls, score = scored[index]

    _step("STAGE 1  Parse: the whole document as plain text")
    print(f"{len(text):,} characters. First 160: {text[:160]!r}")

    _step(f"STAGE 2  Segment: the document became {len(clauses)} clauses; this is clause {index}")
    print(f"index   : {clause['index']}")
    print(f"heading : {clause['heading']!r}   (the last heading line above it)")
    print(f"text    : {clause['text']}")

    _step("STAGE 3  Classify: every rule is tried against the clause text (regular expressions, case-insensitive)")
    by_id = {r["rule_id"]: r for r in rules}
    print(f"{len(rules)} rules loaded. Matched: {len(cls['matched_rule_ids'])}")
    for rid in cls["matched_rule_ids"]:
        r = by_id[rid]
        spans = [s for s in cls["matched_spans"] if s["rule_id"] == rid]
        print(f"\n  {rid}  category={r['category']}  weight={r['severity_weight']}  hint={r['party_effect_hint']}")
        print(f"    explanation : {r['explanation']}")
        for pattern in r["patterns"]:
            print(f"    pattern     : {pattern}")
        print(f"    matched text: {sorted({s['text'] for s in spans})}")
    if cls["matched_rule_ids"]:
        top = by_id[cls["matched_rule_ids"][0]]
        print(f"\n  Category = {cls['category']!r}: taken from the strongest rule ({top['rule_id']}, weight {top['severity_weight']}). "
              "A tie is broken by the order of the rules in the file.")
    else:
        print("\n  No rule matched, so the category is 'other' and matched_rule_ids is []. The engine does not guess.")

    _step(f"STAGE 4  Score for the user's side: party = {party!r}")
    p = (party or "").strip().lower()
    if p in SIDE_A | SIDE_B:
        flip = p in SIDE_B
        print(f"Rule hints are written from the tenant/employee/recipient/client side. For {p!r} they are {'FLIPPED' if flip else 'used as written'}.")
        risk = benefit = 0
        for rid in dict.fromkeys(cls["matched_rule_ids"]):
            r = by_id[rid]
            effect = FLIP[r["party_effect_hint"]] if flip else r["party_effect_hint"]
            risk += r["severity_weight"] if effect == "unfavorable" else 0
            benefit += r["severity_weight"] if effect == "favorable" else 0
            print(f"  {rid}: hint {r['party_effect_hint']} -> effect for you: {effect} (weight {r['severity_weight']})")
        print(f"risk (sum of weights that hurt you) = {risk}, benefit (sum that help you) = {benefit}")
        print(f"label = {score['label']}  (unfavorable if risk > benefit, favorable if benefit > risk, else neutral)")
        print(f"auto_score = min(10, 2 * risk) = {score['auto_score']:g}")
    else:
        print(f"The party is missing or unknown, so every clause is labelled neutral. Warning: {score['warning']}")
        print(f"auto_score = {score['auto_score']:g} (severity of the strongest non-neutral rule)")
    print(f"lawyer_override = {score['lawyer_override']} (a lawyer's change is stored separately; auto_score is never overwritten)")

    _step("STAGE 5  Explain: the stored text of the matched rule(s)")
    print(explain_clause({**cls}, rules))

    _step("STAGE 6  Report: the entry for this clause in the final Report JSON")
    report = analyze_text(text, party, name=name, rules=rules)
    entry = report["clauses"][index]
    print(json.dumps({k: entry[k] for k in ("id", "category", "sentiment", "rule_id", "matched_rule_ids", "score", "heading", "text")}, indent=2, ensure_ascii=False))
    lists = [k for k in ("top_risks", "obligations", "exit_conditions") if any(i["clause_index"] == index for i in report[k])]
    print(f"\nAlso appears in report lists: {lists or 'none'}")
    print(f"Report summary: {report['summary']}")
