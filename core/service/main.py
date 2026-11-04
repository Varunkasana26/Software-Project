"""HTTP service. Run from the repo root or from core/:  uvicorn service.main:app --port 8001

This service has no authentication. It is meant to be called only by backend/api on the same machine,
so keep it bound to 127.0.0.1 (the uvicorn default) and never expose port 8001 publicly.
"""
import logging
import sys
from pathlib import Path

# Make `import core...` work when uvicorn is started from inside core/.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from pydantic import BaseModel, ValidationError  # noqa: E402

from core.parser import MAX_BYTES, ParseError, check_text_size, parse_document  # noqa: E402
from core.pipeline import analyze_text  # noqa: E402

log = logging.getLogger(__name__)
app = FastAPI(title="Legal Document Summarizer - core")

# HTTP status for each ParseError code.
STATUS = {"FILE_TOO_LARGE": 413, "DOCUMENT_TOO_LARGE": 413, "UNSUPPORTED_TYPE": 415,
          "SCANNED_PDF_UNSUPPORTED": 422, "TOO_MANY_PAGES": 422, "PARSE_FAILED": 422}
BODY_LIMIT = MAX_BYTES + 1024 * 1024  # file limit plus room for form fields and multipart framing


class AnalyzeRequest(BaseModel):
    document_text: str
    user_party: str


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message, "code": code})


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    """Refuse an oversized request from its Content-Length header before the body is read.
    A client that sends no Content-Length (chunked) is still stopped by the checks in /analyze."""
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > 2 * BODY_LIMIT:  # JSON text may be larger than a file, up to the character cap
        return _error(413, "REQUEST_TOO_LARGE", "The request body is too large.")
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "ok"}


async def _read_limited(upload) -> bytes:
    """Read an upload in 1 MB chunks and stop as soon as it passes the size limit."""
    data = bytearray()
    while chunk := await upload.read(1024 * 1024):
        data += chunk
        if len(data) > MAX_BYTES:
            raise ParseError("FILE_TOO_LARGE", "File is larger than the 10 MB limit.")
    return bytes(data)


@app.post("/analyze")
async def analyze(request: Request):
    """Two input styles:
    - JSON  {document_text, user_party}                  (shared/contracts/analyze.request.schema.json)
    - multipart form: file=<.txt or .pdf>, user_party=<text>
    Returns a Report, or {error, code} on failure."""
    try:
        if request.headers.get("content-type", "").startswith("multipart/form-data"):
            form = await request.form()
            upload = form.get("file")
            if upload is None or not hasattr(upload, "read"):
                return _error(400, "MISSING_FILE", "Send the document in the 'file' form field.")
            name = upload.filename or ""
            if not name.lower().endswith((".txt", ".pdf")):
                raise ParseError("UNSUPPORTED_TYPE", "Only .txt and .pdf files are supported.")
            parsed = parse_document(await _read_limited(upload), name)
            text, party = parsed["text"], str(form.get("user_party") or "")
        else:
            body = AnalyzeRequest(**(await request.json()))
            check_text_size(body.document_text)
            text, party, name = body.document_text, body.user_party, "request"
    except ParseError as exc:
        return _error(STATUS.get(exc.code, 400), exc.code, exc.message)
    except ValidationError as exc:
        # Name the bad fields only. Do not echo the submitted values back.
        fields = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
        return _error(422, "INVALID_REQUEST", f"Invalid request: {fields}")
    except (ValueError, TypeError):
        return _error(422, "INVALID_REQUEST", "The request body must be valid JSON with document_text and user_party.")

    return analyze_text(text, party, name=name)
