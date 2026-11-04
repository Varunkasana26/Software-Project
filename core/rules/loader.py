"""Loads and validates rules.

Rules are data: the Python code never contains a clause pattern. Rules come from rules.json (the default and the
seed for the backend's rules table) or, per request, from the backend (see shared/contracts/rule.schema.json).
Both paths go through compile_rules, which fails with a clear message on a bad regex, a duplicate rule_id, a
missing field, a pattern that is too long, or a pattern with a nested quantifier such as (a+)+ (a known cause
of catastrophic backtracking).
"""
import json
import re
from pathlib import Path
from typing import Optional, TypedDict, Union

DEFAULT_PATH = Path(__file__).with_name("rules.json")
CATEGORIES = {"obligation", "right", "penalty", "termination", "payment_term", "other"}
EFFECTS = {"favorable", "unfavorable", "neutral"}
MAX_PATTERN_LEN = 500
MAX_RULES = 500
# A group that contains a repeat and is itself repeated: (x+)+  (x*)*  (\s*\w+){2,}
NESTED_QUANTIFIER = re.compile(r"\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)[+*{]")


class RuleError(ValueError):
    """The rules are invalid."""


class Rule(TypedDict):
    rule_id: str
    category: str
    patterns: list[str]
    severity_weight: int  # 1 (minor) to 5 (severe)
    party_effect_hint: str  # effect on the tenant/employee/recipient/client side
    explanation: str


def check_pattern(rule_id: str, pattern: str) -> re.Pattern:
    """Compile one pattern, or raise RuleError that names the rule."""
    if not isinstance(pattern, str) or not pattern:
        raise RuleError(f"Rule {rule_id}: a pattern must be a non-empty string")
    if len(pattern) > MAX_PATTERN_LEN:
        raise RuleError(f"Rule {rule_id}: pattern is longer than {MAX_PATTERN_LEN} characters")
    if NESTED_QUANTIFIER.search(pattern):
        raise RuleError(f"Rule {rule_id}: pattern {pattern[:40]!r} repeats a group that already repeats (risk of catastrophic backtracking)")
    try:
        return re.compile(pattern, re.IGNORECASE)
    except re.error as exc:
        raise RuleError(f"Rule {rule_id}: bad regex {pattern[:60]!r}: {exc}") from exc


def compile_rule(rule: dict) -> dict:
    """Validate one rule dict and return a copy with a compiled "regexes" list."""
    rid = rule.get("rule_id", "<missing rule_id>")
    for key in ("rule_id", "category", "patterns", "severity_weight", "party_effect_hint", "explanation"):
        if key not in rule:
            raise RuleError(f"Rule {rid}: missing field '{key}'")
    if rule["category"] not in CATEGORIES:
        raise RuleError(f"Rule {rid}: bad category '{rule['category']}'")
    if rule["party_effect_hint"] not in EFFECTS:
        raise RuleError(f"Rule {rid}: bad party_effect_hint '{rule['party_effect_hint']}'")
    weight = rule["severity_weight"]
    if not (isinstance(weight, int) and not isinstance(weight, bool) and 1 <= weight <= 5):
        raise RuleError(f"Rule {rid}: severity_weight must be an integer from 1 to 5")
    if not isinstance(rule["patterns"], list) or not rule["patterns"]:
        raise RuleError(f"Rule {rid}: needs at least one pattern")
    compiled = dict(rule)
    compiled["regexes"] = [check_pattern(rid, p) for p in rule["patterns"]]
    return compiled


def compile_rules(raw_rules: list[dict]) -> list[dict]:
    """Validate and compile a list of rules. Raises RuleError on the first problem."""
    if len(raw_rules) > MAX_RULES:
        raise RuleError(f"Too many rules ({len(raw_rules)}); the limit is {MAX_RULES}")
    seen: set[str] = set()
    out = []
    for rule in raw_rules:
        compiled = compile_rule(rule)
        if compiled["rule_id"] in seen:
            raise RuleError(f"Duplicate rule_id: {compiled['rule_id']}")
        seen.add(compiled["rule_id"])
        out.append(compiled)
    return out


def load_rules(path: Optional[Union[str, Path]] = None) -> list[Rule]:
    """Read, validate and return the rules from a rules.json file."""
    data = json.loads(Path(path or DEFAULT_PATH).read_text(encoding="utf-8"))
    return compile_rules(data["rules"])  # type: ignore[return-value]
