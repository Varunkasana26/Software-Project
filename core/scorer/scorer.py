"""Step 4: score a classified clause for the user's side.

Each matched rule has a severity_weight (1-5) and a party_effect_hint written
from the tenant/employee/recipient/client side. For the other side the hint is flipped.

    risk    = sum of weights of rules that hurt the user
    benefit = sum of weights of rules that help the user
    label   = unfavorable if risk > benefit, favorable if benefit > risk, else neutral
    auto_score = min(10, 2 * risk)           (0 = no risk found, 10 = very risky)
"""
from typing import Optional, TypedDict

SIDE_A = {"tenant", "employee", "recipient", "client"}  # hints are stored from this side
SIDE_B = {"landlord", "employer", "discloser", "provider", "contractor", "freelancer"}
FLIP = {"favorable": "unfavorable", "unfavorable": "favorable", "neutral": "neutral"}


class Score(TypedDict):
    auto_score: float
    label: str
    lawyer_override: Optional[float]
    warning: Optional[str]


def _rules_once(spans: list[dict]) -> list[dict]:
    """One entry per rule (a rule can match several times in one clause)."""
    return list({s["rule_id"]: s for s in spans}.values())


def score_clause(clause_result: dict, user_party: Optional[str]) -> Score:
    """Return {auto_score, label, lawyer_override, warning}.

    If clause_result already holds an auto_score, it is kept as is, and an existing
    lawyer_override is carried over: a lawyer's change never overwrites the original score."""
    rules = _rules_once(clause_result.get("matched_spans", []))
    party = (user_party or "").strip().lower()
    override = clause_result.get("lawyer_override")

    if party in SIDE_A or party in SIDE_B:
        flip = party in SIDE_B
        effects = [(FLIP[r["party_effect_hint"]] if flip else r["party_effect_hint"], r["severity_weight"]) for r in rules]
        risk = sum(w for e, w in effects if e == "unfavorable")
        benefit = sum(w for e, w in effects if e == "favorable")
        label = "unfavorable" if risk > benefit else "favorable" if benefit > risk else "neutral"
        auto = float(min(10, 2 * risk))
        warning = None
    else:
        # Unknown side: we cannot say who is helped, so everything is neutral.
        # The score only shows how severe the strongest non-neutral rule is.
        weights = [r["severity_weight"] for r in rules if r["party_effect_hint"] != "neutral"]
        label = "neutral"
        auto = float(min(10, 2 * max(weights, default=0)))
        warning = f"user_party {user_party!r} is missing or unknown; every clause is labelled neutral."

    if clause_result.get("auto_score") is not None:
        auto = clause_result["auto_score"]  # never recompute over an existing score
    return {"auto_score": auto, "label": label, "lawyer_override": override, "warning": warning}
