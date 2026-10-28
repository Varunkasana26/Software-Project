"""Explanations for a classified clause.

explain_clause: the stored explanation text of the matched rule(s). Always works, no network.
llm_explain: OPTIONAL. Runs only if ANTHROPIC_API_KEY is set; on any problem it falls back
to explain_clause, so the system works fully without a key.
"""
import os
from functools import lru_cache
from typing import Optional

from core.rules.loader import load_rules

NO_MATCH = "No rule matched this clause, so it was not classified."


@lru_cache(maxsize=1)
def _default_rules() -> dict[str, str]:
    return {r["rule_id"]: r["explanation"] for r in load_rules()}


def explain_clause(clause_result: dict, rules: Optional[list[dict]] = None) -> str:
    """Return the stored explanation(s) of the matched rule(s)."""
    texts = {r["rule_id"]: r["explanation"] for r in rules} if rules else _default_rules()
    parts = [texts[rid] for rid in clause_result.get("matched_rule_ids", []) if rid in texts]
    return " ".join(parts) if parts else NO_MATCH


def llm_explain(clause_result: dict, rules: Optional[list[dict]] = None) -> str:
    """Plain-English explanation from Claude; falls back to the stored text."""
    stored = explain_clause(clause_result, rules)
    if not os.environ.get("ANTHROPIC_API_KEY") or not clause_result.get("matched_rule_ids"):
        return stored
    try:
        import anthropic  # optional dependency, not in requirements.txt

        reply = anthropic.Anthropic().messages.create(
            model="claude-haiku-5-5",
            max_tokens=200,
            messages=[{"role": "user", "content": (
                "Explain this contract clause in two plain sentences for a non-lawyer.\n"
                f"Clause: {clause_result['text']}\nWhy it was flagged: {stored}")}],
        )
        return reply.content[0].text.strip() or stored
    except Exception:  # any failure: missing package, network, bad key
        return stored
