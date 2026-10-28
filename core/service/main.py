"""HTTP service. Run from the repo root or from core/:  uvicorn service.main:app --port 8001"""
import sys
from pathlib import Path

# Make `import core...` work when uvicorn is started from inside core/.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from pydantic import BaseModel, ValidationError  # noqa: E402

from core.parser import ParseError, parse_document  # noqa: E402
from core.pipeline import analyze_text  # noqa: E402

app = FastAPI(title="Legal Document Summarizer - core")

# HTTP status for each ParseError code.
STATUS = {"FILE_TOO_LARGE": 413, "UNSUPPORTED_TYPE": 415, "SCANNED_PDF_UNSUPPORTED": 422, "PARSE_FAILED": 422}


class AnalyzeRequest(BaseModel):
    document_text: str
    user_party: str


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message, "code": code})


@app.get("/health")
def health():
    return {"status": "ok"}


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
            parsed = parse_document(await upload.read(), upload.filename or "")
            text, party, name = parsed["text"], str(form.get("user_party") or ""), upload.filename
        else:
            body = AnalyzeRequest(**(await request.json()))
            text, party, name = body.document_text, body.user_party, "request"
    except ParseError as exc:
        return _error(STATUS.get(exc.code, 400), exc.code, exc.message)
    except (ValidationError, ValueError, TypeError) as exc:
        return _error(422, "INVALID_REQUEST", f"Invalid request body: {exc}")

    return analyze_text(text, party, name=name)
