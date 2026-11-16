import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { listDocuments, processDocument, type DocumentInfo } from "../api/client";
import { Alert } from "../components/Alert";
import { useAuth } from "../components/Auth";
import { PageHead } from "../components/Layout";
import { EmptyState, ErrorState, Loading } from "../components/States";

const STATUS: Record<DocumentInfo["status"], string> = { UPLOADED: "Not analyzed", PROCESSING: "Analyzing", COMPLETED: "Analyzed", FAILED: "Failed" };

export default function Documents() {
  const { user } = useAuth();
  const review = useLocation().pathname === "/review";
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof listDocuments>> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const load = useCallback(() => {
    setError("");
    listDocuments(page).then(setData).catch(e => setError(e instanceof Error ? e.message : "Could not load documents."));
  }, [page]);
  useEffect(load, [load]);
  async function reanalyze(id: string) {
    setBusy(id); setNotice("");
    try { await processDocument(id); setNotice("Analyzed again with the current rules."); load(); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not analyze the document."); }
    finally { setBusy(null); }
  }
  return <>
    <PageHead title={review ? "Review" : "Documents"}>{review ? "Choose a document to review its clauses and scores." : "Your uploaded documents."}</PageHead>
    <section className="section"><div className="container stack document-list">
      {notice && <Alert kind="info">{notice}</Alert>}
      {error ? <ErrorState message={error} onRetry={load} /> : !data ? <Loading label="Loading documents" height={72} blocks={4} />
        : data.data.length === 0 ? <EmptyState title="No documents yet" action={<Link to="/upload" className="btn">Analyze a contract</Link>}>Upload a contract to see its risks here.</EmptyState>
        : <>
          {data.data.map(d => <article key={d.id} className="card document-row">
            <div className="document-info"><strong><Link to={`/report/${d.id}`}>{d.fileName}</Link></strong><p className="small muted">{d.party || "party not chosen"} · {new Date(d.createdAt).toLocaleDateString()} · {STATUS[d.status]}{d.failureCode ? ` (${d.failureCode})` : ""}</p></div>
            <div className="document-actions"><Link to={`/report/${d.id}`} className="btn btn--secondary btn--small">Open report</Link>
              {user?.role === "LAWYER" && <Link to={`/review/${d.id}`} className="btn btn--secondary btn--small">Review</Link>}
              {d.status !== "PROCESSING" && <button className="btn btn--secondary btn--small" disabled={busy === d.id} onClick={() => reanalyze(d.id)}>{busy === d.id ? "Analyzing…" : d.status === "COMPLETED" ? "Analyze again" : "Analyze"}</button>}
            </div>
          </article>)}
          <div className="row row--between"><span className="muted" role="status">Page {data.page} of {Math.max(data.totalPages, 1)} ({data.total} documents)</span><button className="btn btn--secondary btn--small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn btn--secondary btn--small" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button></div>
        </>}
    </div></section>
  </>;
}
