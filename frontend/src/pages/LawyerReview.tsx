import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { clearOverride, getReport, saveOverride, type ClauseView, type ReportView } from "../api/client";
import { Alert } from "../components/Alert";
import { PageHead } from "../components/Layout";
import { clauseTier, RiskBadge } from "../components/RiskBadge";
import { EmptyState, ErrorState, Loading } from "../components/States";

function ReviewRow({ clause, onChanged }: { clause: ClauseView; onChanged: () => void }) {
  const [score, setScore] = useState(String(clause.override?.score ?? clause.autoScore));
  const [reason, setReason] = useState(clause.override?.reason ?? "");
  const [errors, setErrors] = useState<{ score?: string; reason?: string; save?: string }>({});
  const [saved, setSaved] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number(score);
    const next: typeof errors = {};
    if (score.trim() === "" || Number.isNaN(n) || n < 0 || n > 10) next.score = "Enter a score from 0 to 10.";
    if (!reason.trim()) next.reason = "A reason is required for every override.";
    setErrors(next);
    setSaved("");
    if (next.score || next.reason) return;
    try {
      await saveOverride(clause.id, n, reason.trim());
      setSaved(`Saved. The original auto score (${clause.autoScore}) is kept.`);
      onChanged();
    } catch (err) {
      setErrors({ save: err instanceof Error ? err.message : "Could not save the override." });
    }
  }

  async function onClear() {
    try {
      await clearOverride(clause.id);
      setSaved("Override removed. The automatic score applies again.");
      onChanged();
    } catch (err) {
      setErrors({ save: err instanceof Error ? err.message : "Could not remove the override." });
    }
  }

  const id = `row-${clause.id}`;
  return (
    <article className="card" aria-labelledby={`${id}-title`}>
      <div className="clause-head">
        <strong id={`${id}-title`}>Clause {clause.index + 1}</strong>
        <RiskBadge tier={clauseTier(clause)} score={clause.override ? clause.override.score : clause.autoScore} label={clause.label} />
        {clause.ruleId && <code>{clause.ruleId}</code>}
      </div>
      <p>{clause.text}</p>
      <p className="small muted">Original auto score (read-only): <strong>{clause.autoScore}</strong></p>
      <form onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${id}-score`}>Override score (0 to 10)</label>
            <input id={`${id}-score`} type="number" min={0} max={10} step={0.5} inputMode="decimal" value={score}
              onChange={(e) => { setScore(e.target.value); setSaved(""); }}
              aria-invalid={!!errors.score} aria-describedby={errors.score ? `${id}-score-err` : undefined} />
            {errors.score && <div id={`${id}-score-err`} className="field-error" role="alert">{errors.score}</div>}
          </div>
          <div className="field">
            <label htmlFor={`${id}-reason`}>Reason</label>
            <textarea id={`${id}-reason`} value={reason} onChange={(e) => { setReason(e.target.value); setSaved(""); }}
              aria-invalid={!!errors.reason} aria-describedby={errors.reason ? `${id}-reason-err` : undefined} />
            {errors.reason && <div id={`${id}-reason-err`} className="field-error" role="alert">{errors.reason}</div>}
          </div>
        </div>
        {errors.save && <div className="field"><Alert kind="error">{errors.save}</Alert></div>}
        <div className="row">
          <button type="submit" className="btn btn--small">Save override</button>
          {clause.override && <button type="button" className="btn btn--secondary btn--small" onClick={onClear}>Remove override</button>}
          {saved && <span role="status" className="small" style={{ color: "var(--risk-low-text)" }}>{saved}</span>}
        </div>
      </form>
    </article>
  );
}

export default function LawyerReview() {
  const { id = "" } = useParams();
  const [report, setReport] = useState<ReportView | null>(null);
  const [error, setError] = useState("");

  const load = useCallback((keep = false) => {
    if (!keep) setReport(null);
    setError("");
    getReport(id).then(setReport).catch((e) => setError(e instanceof Error ? e.message : "Could not load the report."));
  }, [id]);
  useEffect(() => load(), [load]);

  return (
    <>
      <PageHead title="Lawyer review" mock={report?.isDemo ? "Demo data" : undefined}>Adjust the score of any clause and record why. The original automatic score is never overwritten.</PageHead>
      <section className="section">
        <div className="container stack">
          {error ? <ErrorState message={error} onRetry={() => load()} />
            : !report ? <Loading label="Loading clauses" height={220} />
            : report.clauses.length === 0 ? <EmptyState title="No clauses to review" />
            : <div>{report.clauses.map((c) => <ReviewRow key={c.id} clause={c} onChanged={() => load(true)} />)}</div>}
        </div>
      </section>
    </>
  );
}
