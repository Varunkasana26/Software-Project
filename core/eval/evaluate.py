"""Evaluate the classifier on a labelled set.  Run from the repo root:

    python -m core.eval.evaluate                      # the 40-clause set in data/labeled/gold.json
    python -m core.eval.evaluate --gold FILE.json     # another gold file, e.g. the gold.json written by merge_labels

A gold file is either {"clauses": [...]} or a plain JSON list. Each item needs clause_text, category and
party_effect, and either `perspective` (tenant, employee, ...) or a `sample` name that starts with
rental, employment, nda, service or freelance.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from core.classifier import classify_clause
from core.rules.loader import load_rules
from core.scorer import score_clause
from core.segmenter import segment_clauses

GOLD = Path(__file__).resolve().parents[1] / "data" / "labeled" / "gold.json"
SAMPLES = GOLD.parents[1] / "samples"
# The gold labels are written from this side. Service and freelance contracts use the client.
SIDE = {"rental": "tenant", "employment": "employee", "nda": "recipient", "service": "client", "freelance": "client"}


def party_for(item: dict) -> str:
    """Whose side the party_effect label is written from."""
    if item.get("perspective"):
        return item["perspective"]
    sample = item.get("sample", "")
    match = next((p for k, p in SIDE.items() if sample.startswith(k)), None)
    if match is None:
        sys.exit(f"error: cannot tell the perspective of {item.get('id', sample)!r}: add a perspective field "
                 f"or use a sample name that starts with {', '.join(SIDE)}")
    return match


def load_gold(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["clauses"] if isinstance(data, dict) else data


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):  # Windows consoles default to a legacy encoding
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Evaluate the classifier on a labelled set.")
    ap.add_argument("--gold", type=Path, default=GOLD, help="gold file (default: data/labeled/gold.json)")
    args = ap.parse_args()
    default_gold = args.gold.resolve() == GOLD.resolve()

    rules = load_rules()
    gold = load_gold(args.gold)
    rows, wrong = [], []
    for g in gold:
        c = classify_clause({"text": g["clause_text"]}, rules)
        s = score_clause(c, party_for(g))
        rows.append((g["category"], c["category"], g["party_effect"], s["label"]))
        if (g["category"], g["party_effect"]) != (c["category"], s["label"]):
            wrong.append((g, c, s))

    if default_gold:
        print("NOTE: the gold set has only %d hand-labelled clauses, first-draft labels, and the rules were written" % len(gold))
        print("while looking at the same sample contracts. These numbers are optimistic and do not show how")
        print("the system performs on new contracts.\n")
        print("Segmentation (clauses per sample):")
        for f in sorted(SAMPLES.glob("*.txt")):
            print(f"  {f.name:32s} {len(segment_clauses(f.read_text(encoding='utf-8'), f.name))}")
    else:
        sources = sorted({g.get("label_source", "not stated") for g in gold})
        print(f"Gold file: {args.gold} ({len(gold)} clauses). Label source: {'; '.join(sources)}.")
        print("Numbers apply only to this small set. Check who wrote the clauses and who labelled them before reading them as independent evidence.")

    print("\nCategory results (precision, recall, counts):")
    print(f"  {'category':14s}{'precision':>10s}{'recall':>8s}{'gold':>6s}{'predicted':>10s}{'correct':>8s}")
    for cat in sorted({r[0] for r in rows} | {r[1] for r in rows}):
        gold_n = sum(r[0] == cat for r in rows)
        pred_n = sum(r[1] == cat for r in rows)
        ok = sum(r[0] == cat == r[1] for r in rows)
        prec = f"{ok / pred_n:.2f}" if pred_n else "n/a"
        rec = f"{ok / gold_n:.2f}" if gold_n else "n/a"
        print(f"  {cat:14s}{prec:>10s}{rec:>8s}{gold_n:>6d}{pred_n:>10d}{ok:>8d}")
    cat_acc = sum(r[0] == r[1] for r in rows)
    eff_acc = sum(r[2] == r[3] for r in rows)
    print(f"\nCategory accuracy:     {cat_acc}/{len(rows)} = {cat_acc / len(rows):.2f}")
    print(f"party_effect accuracy: {eff_acc}/{len(rows)} = {eff_acc / len(rows):.2f}")
    print("party_effect confusion (gold -> predicted):", dict(Counter((r[2], r[3]) for r in rows)))

    print(f"\nMisclassified clauses: {len(wrong)}")
    for g, c, s in wrong:
        print(f"- [{g.get('id', '')} {g.get('sample', '')}] {g['clause_text'][:160]}")
        print(f"    gold: {g['category']} / {g['party_effect']}    predicted: {c['category']} / {s['label']}")
        print(f"    matched rules: {c['matched_rule_ids'] or 'none'}  spans: {[sp['text'] for sp in c['matched_spans']][:4]}")


if __name__ == "__main__":
    main()
