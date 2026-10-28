import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getReport, type ReportView } from "../api/client";

export default function Report() {
  const { id = "" } = useParams();
  const [report, setReport] = useState<ReportView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setReport(null);
    setError("");
    getReport(id)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load report"));
  }, [id]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!report) return <p>Loading...</p>;

  return (
    <div>
      <h1>Report</h1>
      <p>{report.summary}</p>
      <h2>Top 5 risks</h2>
      <ol>{report.topRisks.slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}</ol>
      <h2>Obligations</h2>
      <ul>{report.obligations.map((o, i) => <li key={i}>{o}</li>)}</ul>
      <h2>Exit conditions</h2>
      <ul>{report.exitConditions.map((x, i) => <li key={i}>{x}</li>)}</ul>
      <h2>Clauses</h2>
      {report.clauses.map((c) => (
        <div className="clause" key={c.id}>
          <p>{c.text}</p>
          <p>Category: {c.category} | Risk: {c.risk} | Rule: {c.ruleId ?? "n/a"}</p>
        </div>
      ))}
    </div>
  );
}
