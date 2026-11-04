"""The backend sends its active rules with each /analyze request; core validates them with the same loader."""
from fastapi.testclient import TestClient

from core.service.main import app

client = TestClient(app)
RULE = {"rule_id": "T-1", "category": "penalty", "patterns": ["zebra clause"], "severity_weight": 3,
        "party_effect_hint": "unfavorable", "explanation": "custom rule"}


def test_rules_in_the_request_replace_the_default_rules():
    body = {"document_text": "1.1 The zebra clause applies.", "user_party": "tenant", "rules": [RULE]}
    clause = client.post("/analyze", json=body).json()["clauses"][0]
    assert (clause["category"], clause["rule_id"]) == ("PENALTY", "T-1")
    assert client.post("/analyze", json={**body, "rules": []}).json()["clauses"][0]["rule_id"] is None  # no rules, no match


def test_invalid_rules_are_rejected_with_a_code():
    bad = {**RULE, "patterns": ["(a+)+$"]}
    response = client.post("/analyze", json={"document_text": "x", "user_party": "tenant", "rules": [bad]})
    assert response.status_code == 422 and response.json()["code"] == "INVALID_RULES"
    checked = client.post("/validate-rules", json={"rules": [RULE, bad, {**RULE, "rule_id": "T-3", "patterns": ["(oops"]}]}).json()
    assert checked["valid"] is False and [p["rule_id"] for p in checked["problems"]] == ["T-1", "T-3"]
