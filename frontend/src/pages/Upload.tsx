import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, processDocument, uploadDocument } from "../api/client";
import { Alert } from "../components/Alert";
import { CheckIcon } from "../components/Icons";
import UploadRig from "../components/UploadRig";
import { PageHead } from "../components/Layout";

const MAX_MB = 10;
const PARTIES = [
  ["tenant", "Tenant"], ["landlord", "Landlord"], ["employee", "Employee"], ["employer", "Employer"],
  ["recipient", "Recipient"], ["discloser", "Discloser"], ["client", "Client"], ["provider", "Provider"],
] as const;

// Check the file in the browser first so the user gets a clear message before any upload.
function checkFile(file: File): string {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") && !name.endsWith(".txt")) return "This file type is not supported. Upload a PDF (.pdf) or a plain text file (.txt).";
  if (file.size === 0) return "This file is empty. Choose a different file.";
  if (file.size > MAX_MB * 1024 * 1024) return `This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_MB} MB.`;
  return "";
}

// Turn a server rejection into a plain sentence.
function explain(err: unknown): string {
  if (!(err instanceof ApiError)) return "Upload failed. Try again.";
  if (err.code === "CORE_UNREACHABLE" || err.code === "CORE_TIMEOUT") return "The analysis service is not running or did not answer. Start it (core, port 8001) and try again.";
  if (err.code === "DOCUMENT_TOO_LARGE" || err.code === "TOO_MANY_PAGES") return err.message;
  if (err.code === "SCANNED_PDF_UNSUPPORTED") return "This PDF looks scanned (it contains only images). Scanned documents are not supported. Upload a text-based PDF or a .txt file.";
  if (err.code === "FILE_TOO_LARGE" || err.status === 413) return `The server rejected this file as too large. The limit is ${MAX_MB} MB.`;
  if (err.code === "UNSUPPORTED_TYPE" || err.message.includes("Only PDF and plain text")) return "The server only accepts PDF (.pdf) and plain text (.txt) files.";
  return err.message;
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [party, setParty] = useState(sessionStorage.getItem("party") ?? ""); // remembered between visits only
  const [fileError, setFileError] = useState("");
  const [partyError, setPartyError] = useState("");
  const [serverError, setServerError] = useState("");
  const [step, setStep] = useState<"" | "Uploading" | "Analyzing">("");
  const [over, setOver] = useState(false);
  const [progress,setProgress]=useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function choose(f: File | undefined) {
    setServerError("");
    if (!f) return;
    const problem = checkFile(f);
    setFileError(problem);
    setFile(problem ? null : f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    choose(e.dataTransfer.files[0]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!file) return setFileError("Choose a file to analyze.");
    if (!party) return setPartyError("Choose which party you are.");
    sessionStorage.setItem("party", party);
    try {
      setStep("Uploading");
      const { id } = await uploadDocument(file, party, setProgress);setProgress(100);
      setStep("Analyzing");
      await processDocument(id);
      navigate(`/report/${id}`);
    } catch (err) {
      setServerError(explain(err));
      setStep("");setProgress(0);
    }
  }

  return (
    <>
      <PageHead title="Analyze a contract">Upload a contract, say which side you are on, and get its risks, obligations and exit conditions.</PageHead>
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <span className="label" id="file-label">Document</span>
              <div className={`dropzone${over ? " dropzone--over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
                <div role="button" tabIndex={0} aria-label="Choose a contract file" className="rig-action" onClick={()=>input.current?.click()} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();input.current?.click()}}}><UploadRig state={step||"Idle"} progress={progress}/><span>{step||"Choose or drop a document"}</span></div>
                {file ? (
                  <p><CheckIcon /> <strong>{file.name}</strong> <span className="muted">({file.size < 1024 ? `${file.size} bytes` : `${(file.size / 1024).toFixed(0)} KB`})</span></p>
                ) : (
                  <p>Drag a file here, or choose one.</p>
                )}
                <input ref={input} id="file" className="visually-hidden file-input" type="file" accept=".pdf,.txt,application/pdf,text/plain"
                  aria-describedby="file-help file-error" onChange={(e) => choose(e.target.files?.[0])} />
                <label htmlFor="file" className="btn btn--secondary">{file ? "Choose a different file" : "Choose file"}</label>
              </div>
              <p id="file-help" className="help">PDF or plain text, up to {MAX_MB} MB. Scanned PDFs (images only) are not supported.</p>
              {fileError && <div id="file-error" className="field-error" role="alert">{fileError}</div>}
            </div>

            <fieldset className="field" aria-describedby="party-help party-error">
              <legend>Which party are you?</legend>
              <div className="options" role="radiogroup">
                {PARTIES.map(([value, label]) => (
                  <label className="option" key={value}>
                    <input type="radio" name="party" value={value} checked={party === value}
                      onChange={() => { setParty(value); setPartyError(""); }} />
                    <span><span className="check"><CheckIcon /></span>{label}</span>
                  </label>
                ))}
              </div>
              <p id="party-help" className="help">Risks are judged from your side. Pick the side that matches your role in the contract.</p>
              {partyError && <div id="party-error" className="field-error" role="alert">{partyError}</div>}
            </fieldset>

            {serverError && <div className="field"><Alert kind="error">{serverError}</Alert></div>}
            <div className="row">
              <button type="submit" className="btn" disabled={!!step} style={{ minWidth: 200 }}>{step ? `${step}...` : "Upload and analyze"}</button>
              {step && <span role="status" className="muted">{step === "Uploading" ? "Sending your file" : "Reading clauses, this can take a moment"}</span>}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
