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
MAX_PAGES = 300  # a PDF with more pages is rejected
MAX_CHARS = 2_000_000  # extracted text above this is rejected (analysis takes about 2-4 s per million characters)


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
        raise ParseError("UNSUPPORTED_TYPE", f"Only .txt and .pdf files are supported, got '{ext[:16] or 'no extension'}'.")

    data = path_or_bytes if isinstance(path_or_bytes, bytes) else Path(path_or_bytes).read_bytes()
    if len(data) > MAX_BYTES:
        raise ParseError("FILE_TOO_LARGE", "File is larger than the 10 MB limit.")

    parsed = {"text": data.decode("utf-8", errors="replace"), "page_count": 1} if ext == ".txt" else _parse_pdf(data)
    check_text_size(parsed["text"])
    return parsed


def check_text_size(text: str) -> None:
    """Reject very long text so one request cannot occupy the service for minutes."""
    if len(text) > MAX_CHARS:
        raise ParseError("DOCUMENT_TOO_LARGE", f"The document text is longer than {MAX_CHARS:,} characters.")


def _parse_pdf(data: bytes) -> ParsedDocument:
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            if len(pdf.pages) > MAX_PAGES:
                raise ParseError("TOO_MANY_PAGES", f"The PDF has more than {MAX_PAGES} pages.")
            pages = [page.extract_text() or "" for page in pdf.pages]
    except ParseError:
        raise
    except Exception as exc:  # corrupt or encrypted file; the library message is not shown to the client
        raise ParseError("PARSE_FAILED", "Could not read the PDF. It may be corrupt or password-protected.") from exc

    text = "\n".join(pages)
    page_count = max(len(pages), 1)
    if len(text.strip()) / page_count < MIN_CHARS_PER_PAGE:
        raise ParseError("SCANNED_PDF_UNSUPPORTED", "This PDF has no readable text (it looks scanned). OCR is not supported.")
    return {"text": text, "page_count": page_count}
