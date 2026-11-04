"""Merge two labelling passes into one gold set.  Run from the repo root.

    python -m core.eval.merge_labels import-xlsx FILE.xlsx --out-dir DIR
    python -m core.eval.merge_labels compare PASS1.csv PASS2.csv --clauses CLAUSES.csv --out-dir DIR
    python -m core.eval.merge_labels finalize DIR/merged_draft.csv --out-dir DIR [--spotcheck DIR/spotcheck.csv]

Standard library only (openpyxl is imported lazily, and only by import-xlsx).
CSV files are written as UTF-8 with a byte-order mark so Excel shows characters such as the rupee sign correctly;
they are read back with or without the mark.
"""
import argparse
import csv
import json
import random
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Optional

CATEGORIES = ("obligation", "right", "penalty", "termination", "payment_term", "other")
EFFECTS = ("favorable", "unfavorable", "neutral")
LABEL_COLS = ["id", "category", "party_effect", "confidence", "split_ok", "notes"]
DRAFT_COLS = ["id", "sample_file", "perspective", "clause_text",
              "pass1_category", "pass1_party_effect", "pass1_notes",
              "pass2_category", "pass2_party_effect", "pass2_notes",
              "split_ok", "final_category", "final_party_effect", "resolved_by", "passes_identical"]
SPOT_COLS = ["id", "clause_text", "label_category", "label_party_effect", "human_ok", "human_comment"]
GOLD_COLS = ["id", "sample", "perspective", "clause_text", "category", "party_effect", "expected_rule_ids", "split_ok", "label_source"]


def label_source(rows: list[dict]) -> str:
    """Describe where the labels came from, without claiming more than is known."""
    flags = {norm(r.get("passes_identical")) for r in rows}
    if flags == {"y"}:
        return "single LLM pass (not independent)"  # compare saw two identical files
    if flags == {"n"}:
        people = sorted({(r.get("resolved_by") or "").strip() for r in rows} - {"agreement", ""})
        return "two independent passes; disagreements resolved by " + (", ".join(people) if people else "nobody (the passes never disagreed)")
    return "label source not recorded (merged_draft.csv has no passes_identical column)"


# ---------- small helpers ----------

def norm(value) -> str:
    """Trim, collapse inner whitespace and lower-case. None becomes an empty string."""
    return " ".join(str(value if value is not None else "").split()).lower()


def natural_key(text: str) -> list:
    """Sort key so that R02 comes before R10."""
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", text)]


def read_csv(path) -> tuple[list[str], list[dict]]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        return [c.strip() for c in (reader.fieldnames or [])], rows


def write_csv(path: Path, columns: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def cohen_kappa(a: list[str], b: list[str]) -> Optional[float]:
    """Agreement corrected for chance. None when it is undefined (both raters used a single label)."""
    n = len(a)
    observed = sum(x == y for x, y in zip(a, b)) / n
    count_a, count_b = Counter(a), Counter(b)
    expected = sum(count_a[k] * count_b[k] for k in count_a) / (n * n)
    return None if expected == 1 else (observed - expected) / (1 - expected)


# ---------- reading and validating ----------

def load_labels(path, name: str, issues: list[str]) -> dict[str, dict]:
    """Read one label file into {id: normalised row}. Problems are appended to `issues`."""
    columns, rows = read_csv(path)
    missing = [c for c in LABEL_COLS if c not in columns]
    if missing:
        sys.exit(f"error: {path} is missing columns: {', '.join(missing)}")
    labels: dict[str, dict] = {}
    for line, row in enumerate(rows, start=2):  # line 1 is the header
        cid = (row.get("id") or "").strip()
        if not cid:
            issues.append(f"{name} line {line}: empty id")
            continue
        if cid in labels:
            issues.append(f"{name}: duplicate id {cid}")
            continue
        entry = {c: norm(row.get(c)) for c in LABEL_COLS if c != "id"}
        entry["notes"] = (row.get("notes") or "").strip()  # notes keep their original case
        for col, allowed in (("category", CATEGORIES), ("party_effect", EFFECTS)):
            if entry[col] not in allowed:
                issues.append(f"{name}: {cid}: invalid {col} {row.get(col)!r} (allowed: {', '.join(allowed)})")
        if entry["split_ok"] not in ("y", "n", ""):
            issues.append(f"{name}: {cid}: invalid split_ok {row.get('split_ok')!r} (allowed: y, n)")
        labels[cid] = entry
    return labels


def load_clauses(path, issues: list[str]) -> dict[str, dict]:
    """Read the clauses file into {id: row}. Uses the id column if there is one, else the 1-based row number."""
    columns, rows = read_csv(path)
    id_col = next((c for c in columns if c.lower() == "id"), None)
    clauses: dict[str, dict] = {}
    for number, row in enumerate(rows, start=1):
        cid = (row.get(id_col) or "").strip() if id_col else str(number)
        if not cid:
            issues.append(f"clauses: row {number}: empty id")
        elif cid in clauses:
            issues.append(f"clauses: duplicate id {cid}")
        else:
            clauses[cid] = row
    return clauses


def valid(entry: Optional[dict], col: str) -> bool:
    allowed = CATEGORIES if col == "category" else EFFECTS
    return entry is not None and entry[col] in allowed


# ---------- compare ----------

def cmd_compare(args) -> int:
    issues: list[str] = []
    p1 = load_labels(args.pass1, "pass1", issues)
    p2 = load_labels(args.pass2, "pass2", issues)
    clauses = load_clauses(args.clauses, issues)

    for cid in sorted(set(p1) - set(p2), key=natural_key):
        issues.append(f"{cid}: only in pass1")
    for cid in sorted(set(p2) - set(p1), key=natural_key):
        issues.append(f"{cid}: only in pass2")
    for cid in sorted((set(p1) | set(p2)) - set(clauses), key=natural_key):
        issues.append(f"{cid}: has labels but is missing from the clauses file")
    for cid in sorted(set(clauses) - set(p1) - set(p2), key=natural_key):
        issues.append(f"{cid}: is in the clauses file but has no labels in either pass")

    both = sorted(set(p1) & set(p2) & set(clauses), key=natural_key)  # ids that can be compared
    out_dir = Path(args.out_dir)

    # Build the merged draft for every clause in the clauses file.
    draft = []
    for cid in sorted(clauses, key=natural_key):
        c, a, b = clauses[cid], p1.get(cid), p2.get(cid)
        row = {
            "id": cid,
            "sample_file": (c.get("sample_file") or c.get("contract_type") or "").strip(),
            "perspective": (c.get("perspective") or "").strip(),
            "clause_text": c.get("clause_text", ""),
            "pass1_category": a["category"] if a else "", "pass1_party_effect": a["party_effect"] if a else "", "pass1_notes": a["notes"] if a else "",
            "pass2_category": b["category"] if b else "", "pass2_party_effect": b["party_effect"] if b else "", "pass2_notes": b["notes"] if b else "",
            "split_ok": "n" if "n" in (a and a["split_ok"], b and b["split_ok"]) else ("y" if (a and a["split_ok"] == "y") or (b and b["split_ok"] == "y") else ""),
            "final_category": "", "final_party_effect": "", "resolved_by": "", "passes_identical": "y" if p1 == p2 else "n",
        }
        # Pre-fill only when both passes are valid and agree on both labels.
        agree = (a and b and all(valid(a, k) and valid(b, k) and a[k] == b[k] for k in ("category", "party_effect")))
        if agree:
            row["final_category"], row["final_party_effect"], row["resolved_by"] = a["category"], a["party_effect"], "agreement"
        draft.append(row)

    # Statistics over ids present in both passes (invalid values are left out of that column's numbers).
    print(f"Clauses in clauses file: {len(clauses)}")
    print(f"Clauses compared (in both passes and in the clauses file): {len(both)}")
    if both and p1 == p2:
        print("WARNING: the two label files are identical, so agreement is 100% by construction and says nothing about label quality.")
    for col in ("category", "party_effect"):
        ids = [i for i in both if valid(p1[i], col) and valid(p2[i], col)]
        if not ids:
            print(f"{col}: no valid pairs to compare")
            continue
        a_vals, b_vals = [p1[i][col] for i in ids], [p2[i][col] for i in ids]
        agree_n = sum(x == y for x, y in zip(a_vals, b_vals))
        kappa = cohen_kappa(a_vals, b_vals)
        kappa_text = f"{kappa:.3f}" if kappa is not None else "n/a (only one label used)"
        print(f"{col}: agreement {agree_n}/{len(ids)} = {100 * agree_n / len(ids):.1f}%, Cohen's kappa = {kappa_text}")
    both_ok = [i for i in both if all(valid(p1[i], k) and valid(p2[i], k) and p1[i][k] == p2[i][k] for k in ("category", "party_effect"))]
    if both:
        print(f"Both labels agree: {len(both_ok)}/{len(both)} = {100 * len(both_ok) / len(both):.1f}%")
    counts = Counter(p[i]["category"] for p in (p1, p2) for i in both if valid(p[i], "category"))
    print("Category counts across both passes: " + ", ".join(f"{k}={counts[k]}" for k in CATEGORIES))
    low = [i for i in both if "low" in (p1[i]["confidence"], p2[i]["confidence"])]
    split_no = [i for i in both if "n" in (p1[i]["split_ok"], p2[i]["split_ok"])]
    print(f"Low-confidence clauses (either pass): {len(low)}" + (f"  [{', '.join(low)}]" if low else ""))
    print(f"Flagged split_ok = n (either pass): {len(split_no)}" + (f"  [{', '.join(split_no)}]" if split_no else ""))

    # Output files.
    unresolved = [r for r in draft if not r["resolved_by"]]
    agreed = [r for r in draft if r["resolved_by"] == "agreement"]
    write_csv(out_dir / "merged_draft.csv", DRAFT_COLS, draft)
    write_csv(out_dir / "disagreements.csv", DRAFT_COLS, unresolved)
    sample = random.Random(args.seed).sample(agreed, min(args.spotcheck_size, len(agreed)))
    sample.sort(key=lambda r: natural_key(r["id"]))
    write_csv(out_dir / "spotcheck.csv", SPOT_COLS, [
        {"id": r["id"], "clause_text": r["clause_text"], "label_category": r["final_category"],
         "label_party_effect": r["final_party_effect"], "human_ok": "", "human_comment": ""} for r in sample])
    print(f"\nWrote to {out_dir}: merged_draft.csv ({len(draft)} rows, {len(agreed)} pre-filled), "
          f"disagreements.csv ({len(unresolved)} to resolve), spotcheck.csv ({len(sample)} of {len(agreed)} agreed rows, seed {args.seed})")

    if issues:
        print(f"\nProblems found: {len(issues)}")
        for line in issues:
            print(f"  - {line}")
        return 1
    print("\nNo problems found in the label files.")
    return 0


# ---------- finalize ----------

def cmd_finalize(args) -> int:
    columns, rows = read_csv(args.draft)
    missing = [c for c in ("id", "clause_text", "final_category", "final_party_effect", "resolved_by") if c not in columns]
    if missing:
        sys.exit(f"error: {args.draft} is missing columns: {', '.join(missing)}")
    rows.sort(key=lambda r: natural_key((r.get("id") or "").strip()))

    problems = []
    for r in rows:
        cid, reasons = (r.get("id") or "").strip(), []
        if norm(r["final_category"]) not in CATEGORIES:
            reasons.append("final_category " + ("is blank" if not norm(r["final_category"]) else f"invalid {r['final_category']!r}"))
        if norm(r["final_party_effect"]) not in EFFECTS:
            reasons.append("final_party_effect " + ("is blank" if not norm(r["final_party_effect"]) else f"invalid {r['final_party_effect']!r}"))
        if not (r.get("resolved_by") or "").strip():
            reasons.append("resolved_by is empty")
        if reasons:
            problems.append((cid, reasons))
    if problems:
        print(f"Cannot finalize: {len(problems)} of {len(rows)} rows are not finished. Nothing was written.", file=sys.stderr)
        for cid, reasons in problems:
            print(f"  {cid}: {'; '.join(reasons)}", file=sys.stderr)
        return 1

    source = label_source(rows)
    gold = []
    for r in rows:
        item = {
            "id": r["id"].strip(),
            "sample": (r.get("sample_file") or "").strip(),
            "clause_text": r["clause_text"],
            "category": norm(r["final_category"]),
            "party_effect": norm(r["final_party_effect"]),
            "expected_rule_ids": [],
            "split_ok": norm(r.get("split_ok")),
            "label_source": source,
        }
        if (r.get("perspective") or "").strip():
            item["perspective"] = r["perspective"].strip()  # who the party_effect is judged for
        gold.append(item)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_csv(out_dir / "gold.csv", GOLD_COLS, [{**g, "perspective": g.get("perspective", ""), "expected_rule_ids": ""} for g in gold])
    (out_dir / "gold.json").write_text(json.dumps(gold, indent=2, ensure_ascii=False), encoding="utf-8")
    by_how = Counter((r.get("resolved_by") or "").strip() for r in rows)
    print(f"Wrote gold.csv and gold.json with {len(gold)} clauses to {out_dir} (resolved_by: {dict(by_how)})")

    if args.spotcheck:
        _, spot = read_csv(args.spotcheck)
        answered = [r for r in spot if norm(r.get("human_ok"))]
        yes = [r for r in answered if norm(r["human_ok"]) in ("y", "yes")]
        print(f"Spot-check: human_ok = y for {len(yes)} of {len(answered)} answered rows ({len(spot)} rows in the file)")
        if len(answered) < len(spot):
            print(f"WARNING: {len(spot) - len(answered)} spot-check rows are unanswered: "
                  + ", ".join(r["id"] for r in spot if not norm(r.get("human_ok"))))
    return 0


# ---------- import-xlsx ----------

def cmd_import_xlsx(args) -> int:
    try:
        import openpyxl  # lazy: only this command needs it
    except ImportError:
        sys.exit("error: import-xlsx needs openpyxl (pip install openpyxl)")
    workbook = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)
    out_dir = Path(args.out_dir)
    for sheet, filename in (("Clauses", "clauses.csv"), ("Labels", "pass1.csv")):
        if sheet not in workbook.sheetnames:
            sys.exit(f"error: sheet {sheet!r} not found in {args.xlsx} (sheets: {', '.join(workbook.sheetnames)})")
        rows = list(workbook[sheet].iter_rows(values_only=True))
        header = [str(c).strip() for c in rows[0]]
        body = [{h: ("" if v is None else str(v)) for h, v in zip(header, r)} for r in rows[1:] if any(v is not None for v in r)]
        write_csv(out_dir / filename, header, body)
        print(f"Wrote {out_dir / filename}: {len(body)} rows, columns: {', '.join(header)}")
    return 0


def main(argv: Optional[list[str]] = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):  # Windows consoles default to a legacy encoding
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="command", required=True)

    imp = sub.add_parser("import-xlsx", help="write clauses.csv and pass1.csv from a workbook")
    imp.add_argument("xlsx")
    imp.add_argument("--out-dir", required=True)
    imp.set_defaults(func=cmd_import_xlsx)

    cmp_ = sub.add_parser("compare", help="compare two label passes and write the merged draft")
    cmp_.add_argument("pass1")
    cmp_.add_argument("pass2")
    cmp_.add_argument("--clauses", required=True)
    cmp_.add_argument("--out-dir", required=True)
    cmp_.add_argument("--spotcheck-size", type=int, default=10)
    cmp_.add_argument("--seed", type=int, default=42)
    cmp_.set_defaults(func=cmd_compare)

    fin = sub.add_parser("finalize", help="turn a fully resolved merged draft into gold.csv and gold.json")
    fin.add_argument("draft")
    fin.add_argument("--out-dir", required=True)
    fin.add_argument("--spotcheck")
    fin.set_defaults(func=cmd_finalize)

    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
