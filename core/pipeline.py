"""Runs the whole pipeline on plain text: segment -> classify -> score -> report."""
from typing import Optional

from core.classifier import classify_clause
from core.explainer import explain_clause, llm_explain
from core.report import build_report
from core.rules.loader import load_rules
from core.scorer import score_clause
from core.segmenter import segment_clauses


def analyze_text(text: str, user_party: Optional[str], document_id: str = "", name: str = "document",
                 use_llm: bool = False, rules: Optional[list[dict]] = None) -> dict:
    """Return a Report dict (see shared/contracts/report.schema.json).
    `rules` are already compiled rules (rules.loader.compile_rules); default: core/rules/rules.json."""
    rules = rules if rules is not None else load_rules()
    explain = llm_explain if use_llm else explain_clause
    rows = []
    for clause in segment_clauses(text, name):
        classified = classify_clause(clause, rules)
        scored = score_clause(classified, user_party)
        row = {**clause, **classified, **scored}
        row["explanation"] = explain(row, rules)
        rows.append(row)
    return build_report(rows, document_id)
