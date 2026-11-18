"""Tests for the limits and error handling added in the phase 4 security review. Run: pytest core/tests"""
import time

from fastapi.testclient import TestClient

from core.parser import MAX_BYTES, ParseError, parse_document
from core.parser.parser import MAX_CHARS
from core.segmenter import segment_clauses
from core.service.main import app

client = TestClient(app)


def test_text_over_character_limit_is_rejected():
    try:
        parse_document(b"a" * (MAX_CHARS + 1), "big.txt")
    except ParseError as exc:
        assert exc.code == "DOCUMENT_TOO_LARGE"
    else:
        raise AssertionError("expected ParseError")
    response = client.post("/analyze", json={"document_text": "a" * (MAX_CHARS + 1), "user_party": "tenant"})
    assert response.status_code == 413 and response.json()["code"] == "DOCUMENT_TOO_LARGE"


def test_oversized_upload_is_rejected_with_413():
    big = b"a" * (MAX_BYTES + 1)
    response = client.post("/analyze", files={"file": ("big.txt", big, "text/plain")}, data={"user_party": "tenant"})
    assert response.status_code == 413 and response.json()["code"] == "FILE_TOO_LARGE"


def test_error_messages_do_not_echo_input_or_library_text():
    secret = "SECRET-CONTRACT-TEXT"
    bad = client.post("/analyze", json={"document_text": secret})  # user_party missing
    assert bad.status_code == 422 and secret not in bad.text
    corrupt = client.post("/analyze", files={"file": ("x.pdf", b"not a pdf", "application/pdf")}, data={"user_party": "tenant"})
    assert corrupt.json()["code"] == "PARSE_FAILED" and "Traceback" not in corrupt.text and "pdfminer" not in corrupt.text


def test_many_tiny_fragments_segment_in_linear_time():
    # Before the fix, a 1 MB input of this kind took about 24 seconds (quadratic string joins).
    start = time.perf_counter()
    segment_clauses("word\n\n" * 100_000)
    assert time.perf_counter() - start < 2.0


def test_pdf_style_bond_without_blank_lines_splits_into_clauses():
    """PDF text has single newlines between paragraphs; recital words and short last lines must still split clauses."""
    bond = "\n".join([
        "DRAFT OF EMPLOYEE BOND FOR NON-COMPETE",
        "By this Bond Mr. A residing at ... binds himself to pay to Mr. B the sum of Rs... as liquidated damages.",
        "WHEREAS A is a qualified chemist employed by B in his factory manufacturing some goods viz. and in the",
        "course of employment Mr. B may come to know the secret adopted by B in the manufacture of such products.",
        "AND WHEREAS as per the terms of employment A has promised to B not to misuse his position by disclosing",
        "to any person the knowledge acquired by him in the manufacture of the said products and has agreed to execute this Bond.",
        "NOW the condition of this bond is that A shall not, after he ceases to be the employee of B, carry on any",
        "business similar to the business of manufacturing the said products within the city of Delhi for two years.",
        "In WITNESS, WEREOF the said Mr. A has put his hand this day.",
    ])
    clauses = segment_clauses(bond)
    assert len(clauses) >= 5
    assert clauses[0]["text"].startswith("By this Bond") and clauses[0]["text"].endswith("liquidated damages.")
    assert any(c["text"].startswith("NOW the condition") for c in clauses)
