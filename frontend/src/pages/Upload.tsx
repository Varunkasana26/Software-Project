import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { processDocument, uploadDocument } from "../api/client";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  // TODO(backend): the API does not accept a role yet; it is collected but not sent.
  const [role, setRole] = useState("tenant");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const { id } = await uploadDocument(file);
      await processDocument(id);
      navigate(`/report/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Upload a document</h1>
      <label htmlFor="file">Document (.pdf or .txt)</label>
      <input id="file" type="file" accept=".pdf,.txt" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label htmlFor="role">My role</label>
      <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="tenant">Tenant</option>
        <option value="landlord">Landlord</option>
      </select>
      <p>
        <button type="submit" disabled={busy || !file}>{busy ? "Analyzing..." : "Upload and analyze"}</button>
      </p>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
