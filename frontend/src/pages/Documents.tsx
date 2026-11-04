import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDocuments, type DocumentInfo } from "../api/client";
import { useAuth } from "../components/Auth";
import { PageHead } from "../components/Layout";
import { EmptyState, ErrorState, Loading } from "../components/States";

const STATUS: Record<DocumentInfo["status"], string> = { UPLOADED: "Not analyzed", PROCESSING: "Analyzing", COMPLETED: "Analyzed", FAILED: "Failed" };

export default function Documents() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof listDocuments>> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    listDocuments(page).then(setData).catch((e) => setError(e instanceof Error ? e.message : "Could not load documents."));
  }, [page]);
  useEffect(load, [load]);

  return (
    <>
      <PageHead title="Documents">{user?.role === "LAWYER" ? "All uploaded documents, for review." : "Your uploaded documents."}</PageHead>
      <section className="section">
        <div className="container stack">
          {error ? <ErrorState message={error} onRetry={load} />
            : !data ? <Loading label="Loading documents" height={72} blocks={4} />
            : data.data.length === 0 ? <EmptyState title="No documents yet" action={<Link to="/upload" className="btn">Analyze a contract</Link>}>Upload a contract to see its risks here.</EmptyState>
            : (
              <>
                {data.data.map((d) => (
                  <article className="card" key={d.id}>
                    <div className="row row--between">
                      <div>
                        <strong>{d.fileName}</strong>
                        <div className="muted small">{new Date(d.createdAt).toLocaleString()} | side: {d.party || "not chosen"} | {STATUS[d.status]}{d.failureCode ? ` (${d.failureCode})` : ""}</div>
                      </div>
                      <div className="row">
                        {d.status === "COMPLETED" && <Link to={`/report/${d.id}`} className="btn btn--secondary btn--small">Open report</Link>}
                        {d.status === "COMPLETED" && user?.role === "LAWYER" && <Link to={`/review/${d.id}`} className="btn btn--secondary btn--small">Review</Link>}
                      </div>
                    </div>
                  </article>
                ))}
                <div className="row row--between">
                  <span className="muted" role="status">Page {data.page} of {Math.max(data.totalPages, 1)} ({data.total} documents)</span>
                  <div className="row">
                    <button type="button" className="btn btn--secondary btn--small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                    <button type="button" className="btn btn--secondary btn--small" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                  </div>
                </div>
              </>
            )}
        </div>
      </section>
    </>
  );
}
