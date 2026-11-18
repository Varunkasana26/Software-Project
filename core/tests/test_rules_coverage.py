"""Tests for the general-purpose rules added in phase 7. The sentences are fresh examples, not taken from any dataset."""
from core.classifier import classify_clause
from core.rules.loader import load_rules
from core.scorer import score_clause

RULES = load_rules()


def run(text: str, party: str = "tenant") -> tuple[str, list[str], str]:
    c = classify_clause({"text": text}, RULES)
    return c["category"], c["matched_rule_ids"], score_clause(c, party)["label"]


def test_duty_and_permission_cues_are_neutral_and_may_not_is_a_duty():
    assert run("The Supplier shall deliver the goods to the Buyer's warehouse.") == ("obligation", ["OBL-013"], "neutral")
    category, ids, label = run("The Licensee may sublicense the software to its affiliates.")
    assert (category, ids, label) == ("right", ["RGT-008"], "neutral")
    assert run("The Licensee may not copy the software.")[0] == "obligation"  # a prohibition, not a right


def test_notice_periods_in_digits_or_words_are_found_and_short_ones_are_a_risk():
    category, ids, _ = run("Either side may leave the arrangement by giving 45 days' notice.")
    assert category == "termination" and "TRM-002" in ids
    category, ids, label = run("The owner may require the occupant to leave on 3 days' written notice.")
    assert category == "termination" and "TRM-001" in ids and label == "unfavorable"


def test_payment_schedule_governing_law_and_jurisdiction():
    assert run("Fees are payable in two instalments, one per quarter.")[0] == "payment_term"
    assert run("This contract is governed by the laws of Kenya.")[:2] == ("other", ["OTH-006"])
    assert run("Disputes will be heard by the courts of Nairobi.")[0] == "other"


def test_confidentiality_deposit_and_repairs():
    assert run("Each party shall protect the other's confidential information.")[0] == "obligation"
    assert "OBL-015" not in run("The artist may show non-confidential excerpts online.")[1]  # 'non-' is not a confidentiality duty
    assert "OBL-018" in run("The deposit will be refunded when the lease ends.")[1]
    category, ids, label = run("The owner shall be responsible for repairing the roof and the drains.")
    assert category == "obligation" and "OBL-006" in ids and label == "favorable"


def test_party_flip_for_a_deduction_rule():
    text = "The employer may deduct unpaid advances from the employee's salary."
    assert run(text, "employee")[2] == "unfavorable"
    assert run(text, "employer")[2] == "favorable"


def test_new_rules_carry_a_justification_and_no_rule_needs_one_to_load():
    justified = [r for r in RULES if r.get("justification")]
    assert len(justified) >= 29
    assert all(isinstance(r["justification"], str) and r["justification"].strip() and "\n" not in r["justification"] for r in justified)


def test_non_compete_wording_without_the_word_is_found():
    text = "A shall not, after he ceases to be the employee of Mr. B, carry on any business similar to the business of B."
    category, ids, label = run(text, "employee")
    assert "OBL-009" in ids and label == "unfavorable"
