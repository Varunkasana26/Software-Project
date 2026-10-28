"""Step 1: turn an uploaded file into plain text.

Supports .txt and text-based .pdf. Scanned PDFs (images only) are rejected,
because reading them would need OCR, which this project does not do.
"""
import io
from pathlib import Path
from typing import TypedDict, Union

import pdfplumber

MAX_BYTES = 10 * 1024 * 1024  # 10 MB upload limit
MIN_CHARS_PER_PAGE = 50  # below this average, a PDF is treated as a scan


class ParseError(Exception):
    """Raised for files we cannot read. `code` is a stable machine-readable string."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class ParsedDocument(TypedDict):
    text: str
    page_count: int


def parse_document(path_or_bytes: Union[str, Path, bytes], filename: str) -> ParsedDocument:
    """Return {text, page_count}. Raises ParseError with code
    UNSUPPORTED_TYPE, FILE_TOO_LARGE, SCANNED_PDF_UNSUPPORTED or PARSE_FAILED."""
    ext = Path(filename).suffix.lower()
    if ext not in (".txt", ".pdf"):
        raise ParseError("UNSUPPORTED_TYPE", f"Only .txt and .pdf files are supported, got '{ext or 'no extension'}'.")

    data = path_or_bytes if isinstance(path_or_bytes, bytes) else Path(path_or_bytes).read_bytes()
    if len(data) > MAX_BYTES:
        raise ParseError("FILE_TOO_LARGE", "File is larger than the 10 MB limit.")

    if ext == ".txt":
        return {"text": data.decode("utf-8", errors="replace"), "page_count": 1}
    return _parse_pdf(data)


def _parse_pdf(data: bytes) -> ParsedDocument:
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
    except Exception as exc:  # corrupt or encrypted file
        raise ParseError("PARSE_FAILED", f"Could not read the PDF: {exc}") from exc

    text = "\n".join(pages)
    page_count = max(len(pages), 1)
    if len(text.strip()) / page_count < MIN_CHARS_PER_PAGE:
        raise ParseError("SCANNED_PDF_UNSUPPORTED", "This PDF has no readable text (it looks scanned). OCR is not supported.")
    return {"text": text, "page_count": page_count}
