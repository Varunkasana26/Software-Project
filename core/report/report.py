"""Step 5: assemble the Report (shape: shared/contracts/report.schema.json)."""
import uuid
from collections import Counter
from typing import Optional

def _effective(c: dict) -> float:
    """A lawyer's override wins when shown; the original auto_score is always kept."""
    return c["lawyer_override"] if c.get("lawyer_override") is not None else c["auto_score"]


def _item(c: dict) -> dict:
    """One entry of top_risks / obligations / exit_conditions (reportItem in report.schema.json)."""
    return {
        "clause_index": c["index"],
        "text": c["text"],
        "rule_id": c["matched_rule_ids"][0] if c["matched_rule_ids"] else None,
        "score": _effective(c),
        "label": c["label"].upper(),
    }


def build_report(scored_clauses: list[dict], document_id: str = "") -> dict:
    """scored_clauses: dicts with index, heading, text, category, matched_rule_ids,
    auto_score, label, lawyer_override, warning, explanation."""
    prefix = document_id or "doc"
    clauses = []
    for c in scored_clauses:
        clauses.append({
            "id": f"{prefix}-c{c['index']}",
            "document_id": document_id,
            "text": c["text"],
            "category": c["category"].upper(),
            "sentiment": c["label"].upper(),
            "rule_id": c["matched_rule_ids"][0] if c["matched_rule_ids"] else None,
            "score": {"auto": c["auto_score"], "lawyer_override": c.get("lawyer_override")},
            "explanation": c.get("explanation", ""),
            # extra fields (the schema allows them)
            "matched_rule_ids": c["matched_rule_ids"],
            "heading": c.get("heading", ""),
            "warning": c.get("warning"),
        })

    matched = [c for c in scored_clauses if c["matched_rule_ids"]]
    risky = [c for c in matched if c["label"] != "favorable" and _effective(c) > 0]
    risky.sort(key=lambda c: (-_effective(c), c["index"]))  # highest severity first
    top_risks = [_item(c) for c in risky[:5]]

    obligations = [_item(c) for c in matched if c["category"] in ("obligation", "payment_term")]
    exit_conditions = [_item(c) for c in matched if c["category"] == "termination"]

    counts = Counter(c["category"] for c in scored_clauses)
    summary = (
        f"{len(scored_clauses)} clauses ({len(matched)} matched a rule): "
        + ", ".join(f"{n} {cat}" for cat, n in sorted(counts.items()))
        + "."
    )
    warnings = sorted({c["warning"] for c in scored_clauses if c.get("warning")})

    return {
        "id": str(uuid.uuid4()),
        "document_id": document_id,
        "summary": summary,
        "top_risks": top_risks,
        "obligations": obligations,
        "exit_conditions": exit_conditions,
        "clauses": clauses,
        "warnings": warnings,
    }
