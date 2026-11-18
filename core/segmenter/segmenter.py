"""Step 2: split contract text into clauses.

A new clause starts at: a numbered line (1. / 1.1 / (a) / Article 3 / Section 2 /
Clause 4), an ALL-CAPS heading line, or after a blank line. Heading-only lines
(for example "3. MAINTENANCE AND REPAIRS") do not become clauses; they are
attached as the `heading` of the clauses that follow. Fragments shorter than
30 characters are merged into the previous clause.

PDF text usually has no blank lines between paragraphs, so two more starts are used: a line that begins
with a legal recital word (WHEREAS / AND WHEREAS / NOW / IN WITNESS), and a short line that ends a
sentence in a document whose other lines are long (the last line of a wrapped paragraph).
"""
import logging
import re
from typing import TypedDict

log = logging.getLogger(__name__)

MIN_CLAUSE_CHARS = 30

# "1." "1.1" "1.1.2" "(a)" "(iv)" "Article 3" "Section 2.1" "Clause 4:"
NUMBER_RE = re.compile(
    r"^\s*(?P<num>(?:Article|Section|Clause)\s+\d+(?:\.\d+)*[.:]?|\d+(?:\.\d+)*\.?|\([a-z]{1,4}\))\s+(?P<rest>\S.*)$",
    re.IGNORECASE,
)


# A recital or witness line always starts a new clause, even with no number or blank line before it.
RECITAL_RE = re.compile(r"^(?:AND\s+)?WHEREAS\b|^NOW\b|^IN\s+WITNESS\b", re.IGNORECASE)
SHORT_LINE_RATIO = 0.6  # a line shorter than this share of the usual line width, ending in a full stop, ends a paragraph


class Clause(TypedDict):
    index: int
    heading: str
    text: str


def _is_heading_text(s: str) -> bool:
    """ALL-CAPS line with letters, or a short line without a sentence end."""
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return False
    return s.isupper() or (len(s.split()) <= 6 and not s.rstrip().endswith((".", ";", ":")))


def segment_clauses(text: str, name: str = "document") -> list[Clause]:
    """Return clauses as [{index, heading, text}] in document order."""
    raw: list[tuple[str, str]] = []  # (heading, text)
    heading = ""
    current: list[str] = []

    def flush() -> None:
        if current:
            raw.append((heading, " ".join(current).strip()))
            current.clear()

    lines = [ln.strip() for ln in text.splitlines()]
    widths = sorted(len(ln) for ln in lines if ln)
    usual = widths[int(len(widths) * 0.9)] if widths else 0  # 90th percentile line width; wrapped text has many long lines
    prev_ended_paragraph = False

    for line in lines:
        if not line:  # blank line ends the current clause
            flush()
            prev_ended_paragraph = False
            continue
        if prev_ended_paragraph or (current and RECITAL_RE.match(line)):  # no blank line, but a paragraph clearly ended
            flush()
        prev_ended_paragraph = usual >= 60 and len(line) < usual * SHORT_LINE_RATIO and line.endswith((".", ";"))
        m = NUMBER_RE.match(line)
        if m and _is_heading_text(m.group("rest")):  # "3. MAINTENANCE" -> heading only
            flush()
            heading = m.group("rest").strip()
        elif m:  # "3.1 The Tenant shall ..." -> new clause
            flush()
            current.append(line)
        elif line.isupper() and len(line.split()) <= 10:  # ALL-CAPS heading
            flush()
            heading = line
        else:  # wrapped line: continues the current clause
            current.append(line)
    flush()

    # Merge tiny fragments into the previous clause. Parts are collected in a list and joined once,
    # because repeated string concatenation is quadratic on a document made of many tiny fragments.
    merged: list[tuple[str, list[str]]] = []
    for head, body in raw:
        if merged and len(body) < MIN_CLAUSE_CHARS:
            merged[-1][1].append(body)
        else:
            merged.append((head, [body]))

    clauses: list[Clause] = [{"index": i, "heading": h, "text": " ".join(parts)} for i, (h, parts) in enumerate(merged)]
    log.info("segmented %s into %d clauses", name, len(clauses))
    return clauses
