"""Step 3: match a clause against the rules.

No guessing: if no rule matches, the category is "other" and matched_rule_ids is empty.
"""
from typing import TypedDict


class Span(TypedDict):
    rule_id: str
    start: int
    end: int
    text: str
    severity_weight: int
    party_effect_hint: str


class Classification(TypedDict):
    category: str
    matched_rule_ids: list[str]  # strongest rule first
    matched_spans: list[Span]


def classify_clause(clause: dict, rules: list[dict]) -> Classification:
    """Return {category, matched_rule_ids, matched_spans} for clause["text"].

    The category comes from the matched rule with the highest severity_weight
    (on a tie, the rule that appears first in rules.json)."""
    text = clause["text"]
    spans: list[Span] = []
    hits: list[dict] = []  # rules that matched, in file order

    for rule in rules:
        found = False
        for regex in rule["regexes"]:
            for m in regex.finditer(text):
                found = True
                spans.append({
                    "rule_id": rule["rule_id"], "start": m.start(), "end": m.end(), "text": m.group(0),
                    "severity_weight": rule["severity_weight"], "party_effect_hint": rule["party_effect_hint"],
                })
        if found:
            hits.append(rule)

    if not hits:
        return {"category": "other", "matched_rule_ids": [], "matched_spans": []}

    hits.sort(key=lambda r: -r["severity_weight"])  # sort is stable, so ties keep file order
    return {"category": hits[0]["category"], "matched_rule_ids": [r["rule_id"] for r in hits], "matched_spans": spans}
