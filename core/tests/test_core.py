"""8 focused tests. Run from the repo root:  pytest core/tests"""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from core.classifier import classify_clause
from core.parser import ParseError, parse_document
from core.report import build_report
from core.rules.loader import load_rules
from core.scorer import score_clause
from core.service.main import app

ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ROOT / "core" / "data" / "samples"
CONTRACTS = ROOT / "shared" / "contracts"
RULES = load_rules()


def test_scanned_pdf_is_rejected():
    with pytest.raises(ParseError) as exc:
        parse_document(SAMPLES / "scanned_sample.pdf", "scanned_sample.pdf")
    assert exc.value.code == "SCANNED_PDF_UNSUPPORTED"


def test_oversized_file_is_rejected():
    with pytest.raises(ParseError) as exc:
        parse_document(b"a" * (10 * 1024 * 1024 + 1), "big.txt")
    assert exc.value.code == "FILE_TOO_LARGE"


def test_no_matching_rule_gives_other_and_no_rule_ids():
    result = classify_clause({"text": "The sky is blue and the grass is green."}, RULES)
    assert result["category"] == "other"
    assert result["matched_rule_ids"] == []


def test_matched_rule_id_is_stored():
    result = classify_clause({"text": "The deposit is non-refundable if the Tenant leaves early."}, RULES)
    assert "PEN-008" in result["matched_rule_ids"]
    assert result["category"] == "penalty"


def test_lawyer_override_does_not_overwrite_auto_score():
    result = score_clause({"matched_spans": [], "auto_score": 7.0, "lawyer_override": 2.0}, "tenant")
    assert result["auto_score"] == 7.0
    assert result["lawyer_override"] == 2.0


def test_unknown_party_gives_neutral_and_warning():
    classified = classify_clause({"text": "The Tenant shall indemnify the Landlord."}, RULES)
    result = score_clause(classified, "banana")
    assert result["label"] == "neutral"
    assert result["warning"]


def test_report_has_at_most_5_top_risks_ordered_by_severity():
    text = (SAMPLES / "rental_landlord_friendly.txt").read_text(encoding="utf-8")
    from core.pipeline import analyze_text

    report = analyze_text(text, "tenant")
    scores = [r["score"] for r in report["top_risks"]]
    assert 0 < len(scores) <= 5
    assert scores == sorted(scores, reverse=True)


def test_analyze_returns_schema_valid_report():
    # Load both schemas so report.schema.json can resolve its $ref to clause.schema.json.
    registry = Registry()
    for name in ("clause.schema.json", "report.schema.json"):
        registry = registry.with_resource(name, Resource.from_contents(json.loads((CONTRACTS / name).read_text())))
    validator = Draft202012Validator(json.loads((CONTRACTS / "report.schema.json").read_text()), registry=registry)

    text = (SAMPLES / "employment_1.txt").read_text(encoding="utf-8")
    response = TestClient(app).post("/analyze", json={"document_text": text, "user_party": "employee"})
    assert response.status_code == 200
    validator.validate(response.json())
