"""Loads and validates rules.json.

Rules are data: the Python code never contains a clause pattern. This loader
fails with a clear message on a bad regex, a duplicate rule_id or a missing field.
"""
import json
import re
from pathlib import Path
from typing import Optional, TypedDict, Union

DEFAULT_PATH = Path(__file__).with_name("rules.json")
CATEGORIES = {"obligation", "right", "penalty", "termination", "payment_term", "other"}
EFFECTS = {"favorable", "unfavorable", "neutral"}


class RuleError(ValueError):
    """The rules file is invalid."""


class Rule(TypedDict):
    rule_id: str
    category: str
    patterns: list[str]
    severity_weight: int  # 1 (minor) to 5 (severe)
    party_effect_hint: str  # effect on the tenant/employee/recipient/client side
    explanation: str


def load_rules(path: Optional[Union[str, Path]] = None) -> list[Rule]:
    """Read, validate and return the rules. Each returned rule also has a
    "regexes" key holding its compiled patterns."""
    data = json.loads(Path(path or DEFAULT_PATH).read_text(encoding="utf-8"))
    rules = data["rules"]
    seen: set[str] = set()
    for rule in rules:
        rid = rule.get("rule_id", "<missing rule_id>")
        for key in ("rule_id", "category", "patterns", "severity_weight", "party_effect_hint", "explanation"):
            if key not in rule:
                raise RuleError(f"Rule {rid}: missing field '{key}'")
        if rid in seen:
            raise RuleError(f"Duplicate rule_id: {rid}")
        seen.add(rid)
        if rule["category"] not in CATEGORIES:
            raise RuleError(f"Rule {rid}: bad category '{rule['category']}'")
        if rule["party_effect_hint"] not in EFFECTS:
            raise RuleError(f"Rule {rid}: bad party_effect_hint '{rule['party_effect_hint']}'")
        if not (isinstance(rule["severity_weight"], int) and 1 <= rule["severity_weight"] <= 5):
            raise RuleError(f"Rule {rid}: severity_weight must be an integer from 1 to 5")
        if not rule["patterns"]:
            raise RuleError(f"Rule {rid}: needs at least one pattern")
        compiled = []
        for pattern in rule["patterns"]:
            try:
                compiled.append(re.compile(pattern, re.IGNORECASE))
            except re.error as exc:
                raise RuleError(f"Rule {rid}: bad regex {pattern!r}: {exc}") from exc
        rule["regexes"] = compiled
    return rules
