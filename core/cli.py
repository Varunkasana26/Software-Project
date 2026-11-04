"""Demo without the API:  python -m core.cli path/to/file.txt --party tenant [--json] [--llm]"""
import argparse
import json
import logging
import sys

from core.parser import ParseError, parse_document
from core.pipeline import analyze_text


def main() -> int:
    ap = argparse.ArgumentParser(description="Analyze a contract (.txt or text-based .pdf).")
    ap.add_argument("path")
    ap.add_argument("--party", default="", help="tenant, landlord, employee, employer, recipient, discloser, client, provider")
    ap.add_argument("--json", action="store_true", help="print the raw Report JSON")
    ap.add_argument("--llm", action="store_true", help="use Claude for explanations if ANTHROPIC_API_KEY is set")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    try:
        doc = parse_document(args.path, args.path)
    except ParseError as exc:
        print(f"ERROR {exc.code}: {exc.message}", file=sys.stderr)
        return 1
    report = analyze_text(doc["text"], args.party, name=args.path, use_llm=args.llm)

    if args.json:
        print(json.dumps(report, indent=2))
        return 0
    print(f"\nSUMMARY: {report['summary']}")
    for w in report["warnings"]:
        print(f"WARNING: {w}")
    for title, key in (("TOP RISKS", "top_risks"), ("OBLIGATIONS", "obligations"), ("EXIT CONDITIONS", "exit_conditions")):
        print(f"\n{title}")
        for item in report[key]:
            print(f"  - [{item['rule_id']}] (score {item['score']:g}) {item['text']}")
        if not report[key]:
            print("  - (none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
