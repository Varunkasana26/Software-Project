"""Regex denial-of-service check for core/rules/rules.json.  Run from the repo root:  python -m core.eval.regex_stress

Runs every rule pattern against long adversarial inputs and times it. Each pattern runs in its own
process with a timeout, because Python's `re` cannot be interrupted. A pattern is flagged if it is
slow, or if doubling the input more than triples the time (a sign of quadratic or worse growth).
"""
import multiprocessing as mp
import re
import sys
import time
from pathlib import Path

from core.rules.loader import load_rules

SAMPLES = Path(__file__).resolve().parents[1] / "data" / "samples"
N = 100_000  # characters
TIMEOUT_S = 20  # per pattern, all inputs
SLOW_S = 0.5  # flag a single run slower than this
# Words the rules look for, repeated back to back so patterns keep starting and failing.
STUFF = ["tenant shall ", "seven (7) days ", "may terminate ", "deposit ", "repay ", "confidential ", "liability ",
         "renews ", "increase ", "enter the premises ", "late ", "cure ", "( ", "thirty (30) days written "]


def corpus(n: int) -> dict[str, str]:
    text = " ".join(p.read_text(encoding="utf-8") for p in sorted(SAMPLES.glob("*.txt")))
    out = {
        "a*n": "a" * n,
        "spaces": " " * n,
        "x_space": "x " * (n // 2),
        "open_paren": "(" * n,
        "digits_paren": "(1) " * (n // 4),
        "samples_no_periods": (text.replace(".", " ") * (n // len(text) + 1))[:n],
        "samples_as_is": (text * (n // len(text) + 1))[:n],
    }
    for word in STUFF:
        out[f"stuff:{word.strip()}"] = (word * (n // len(word) + 1))[:n]
    return out


def worker(pattern: str, queue) -> None:
    regex = re.compile(pattern, re.IGNORECASE)
    results = {}
    smalls, bigs = corpus(N), corpus(2 * N)
    for name, small in smalls.items():
        t = time.perf_counter()
        sum(1 for _ in regex.finditer(small))
        t1 = time.perf_counter() - t
        big = bigs[name]
        t = time.perf_counter()
        sum(1 for _ in regex.finditer(big))
        t2 = time.perf_counter() - t
        results[name] = (t1, t2)
    queue.put(results)


def main() -> int:
    rules = load_rules()
    flagged, rows = [], []
    ctx = mp.get_context("spawn")
    for rule in rules:
        for pattern in rule["patterns"]:
            q = ctx.Queue()
            proc = ctx.Process(target=worker, args=(pattern, q))
            proc.start()
            proc.join(TIMEOUT_S)
            if proc.is_alive():
                proc.kill()
                flagged.append((rule["rule_id"], pattern, f"TIMEOUT after {TIMEOUT_S}s"))
                rows.append((rule["rule_id"], float("inf"), "-", pattern))
                continue
            res = q.get()
            worst_name, (t1, t2) = max(res.items(), key=lambda kv: kv[1][1])
            rows.append((rule["rule_id"], t2, worst_name, pattern))
            for name, (a, b) in res.items():
                if b > SLOW_S:
                    flagged.append((rule["rule_id"], pattern, f"slow: {b:.2f}s on {name} ({2 * N} chars)"))
                elif a > 0.02 and b / a > 3:
                    flagged.append((rule["rule_id"], pattern, f"growth x{b / a:.1f} when input doubles on {name} ({a:.3f}s -> {b:.3f}s)"))

    rows.sort(key=lambda r: -r[1])
    print(f"Checked {len(rows)} patterns from {len(rules)} rules, {len(corpus(10))} input shapes, {N} and {2 * N} characters each.\n")
    print("Slowest 8 patterns (time at 200,000 chars, worst input):")
    for rid, t, name, pat in rows[:8]:
        print(f"  {rid}  {t:7.3f}s  {name:22s} {pat[:70]}")
    print(f"\nFlagged: {len(flagged)}")
    for rid, pat, why in flagged:
        print(f"  {rid}  {pat[:60]}  ->  {why}")
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main())
