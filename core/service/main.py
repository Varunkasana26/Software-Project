import uuid
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Legal Document Summarizer - core")


class AnalyzeRequest(BaseModel):
    document_text: str
    user_party: str


class Report(BaseModel):
    id: str
    document_id: str
    summary: str
    top_risks: list[str] = []
    obligations: list[str] = []
    exit_conditions: list[str] = []
    clauses: list[dict] = []


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=Report)
def analyze(req: AnalyzeRequest):
    # Stub: no real logic yet. Returns a valid empty Report.
    return Report(id=str(uuid.uuid4()), document_id="", summary="")
