"""The rules are frozen until the real-contract evaluation (see docs/known-limitations.md).
If you change core/rules/rules.json on purpose, update core/rules/rules.sha256 in the same commit and say why."""
import hashlib
from pathlib import Path

RULES = Path(__file__).resolve().parents[1] / "rules"


def test_rules_json_matches_the_recorded_hash():
    actual = hashlib.sha256((RULES / "rules.json").read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    assert actual == (RULES / "rules.sha256").read_text().strip()
