import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDocument, getReport, type ClauseView, type DocumentInfo, type ItemView, type ReportView } from "../api/client";
import { useAuth } from "../components/Auth";
import { ChevronIcon } from "../components/Icons";
import { PageHead } from "../components/Layout";
import { clauseTier, effectiveScore, RiskBadge, tierFromScore, type Tier } from "../components/RiskBadge";
import { EmptyState, ErrorState, Loading } from "../components/States";

const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const TIERS: [Tier, string][] = [["high", "High risk"], ["medium", "Medium risk"], ["low", "Low risk or favorable"], ["neutral", "Neutral"]];

function Items({ items, ordered, empty }: { items: ItemView[]; ordered?: boolean; empty: string }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  if (items.length === 0) return <p className="muted">{empty}</p>;
  const List = ordered ? "ol" : "ul";
  return (
    <List className="items">
      {items.map((it, i) => (
        <li key={i}>
          <div className="item-meta">
            <RiskBadge tier={it.label === "FAVORABLE" ? "low" : tierFromScore(it.score)} score={it.score} label={it.label} />
            <span className="muted small">{it.ruleId ? <>Rule <code>{it.ruleId}</code></> : "No rule matched"}</span>
          </div>
          <p className={open[i] ? "" : "clamp"} style={{ margin: 0 }}>{it.text}</p>
          {it.text.length > 160 && (
            <button type="button" className="link-btn" aria-expanded={!!open[i]} onClick={() => setOpen({ ...open, [i]: !open[i] })}>
              {open[i] ? "Show less" : "Show full clause"}
            </button>
          )}
        </li>
      ))}
    </List>
  );
}

function ClauseCard({ clause, docId }: { clause: ClauseView; docId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const tier = clauseTier(clause);
  const panel = `why-${clause.id}`;
  return (
    <article className={`card risk ${effectiveScore(clause)>=8?"high":""}`} aria-label={`Clause ${clause.index + 1}`}>
      <div className="clause-head">
        <strong>Clause {clause.index + 1}</strong>
        <span className="tag">{humanize(clause.category)}</span>
        <RiskBadge tier={tier} score={effectiveScore(clause)} label={clause.label} />
        {clause.ruleId && <code>{clause.ruleId}</code>}
      </div>
      <p style={{ margin: 0 }}>{clause.text}</p>
      <div className="clause-scores">
        <span>Auto score: {clause.autoScore}</span>
        {clause.override && (
          <span>Lawyer override: <strong>{clause.override.score}</strong> (auto score <span className="struck">{clause.autoScore}</span> kept on record)</span>
        )}
      </div>
      <button type="button" className="disclosure" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}>
        <ChevronIcon /> Why this was flagged
      </button>
      {open && (
        <div id={panel} className="disclosure-panel">
          <p style={{ margin: 0 }}>{clause.explanation || "Explanation not reported."}</p><p className="small">Rule: {clause.ruleId ?? "not reported"} · Matched: {clause.matchedRuleIds.join(", ") || "not reported"}</p>
          {clause.override && <p className="small muted" style={{ margin: "8px 0 0" }}>Override reason: {clause.override.reason}</p>}
          {user?.role === "LAWYER" && <p className="small" style={{ margin: "8px 0 0" }}><Link to={`/review/${docId}`}>Review this clause</Link></p>}
        </div>
      )}
    </article>
  );
}

export default function Report() {
  const { id = "" } = useParams();
  const [report, setReport] = useState<ReportView | null>(null);
  const [info, setInfo] = useState<DocumentInfo | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("ALL");
  const [tier, setTier] = useState<Tier | "ALL">("ALL");

  const load = useCallback(() => {
    setReport(null);
    setError("");
    getDocument(id).then(setInfo).catch(() => setInfo(null)); // file name and chosen side, shown in the header
    getReport(id).then(setReport).catch((e) => setError(e instanceof Error ? e.message : "Could not load the report."));
  }, [id]);
  useEffect(load, [load]);

  const categories = useMemo(() => [...new Set(report?.clauses.map((c) => c.category) ?? [])], [report]);
  const shown = useMemo(
    () => (report?.clauses ?? []).filter((c) => (category === "ALL" || c.category === category) && (tier === "ALL" || clauseTier(c) === tier)),
    [report, category, tier],
  );

  if (error) return <><PageHead title="Report" /><section className="section"><div className="container"><ErrorState message={error} onRetry={load} /></div></section></>;
  if (!report) return <><PageHead title="Report" /><section className="section"><div className="container"><Loading label="Loading report" /></div></section></>;

  const high = report.clauses.filter((c) => effectiveScore(c) >= 8).length;
  const overall = report.clauses.length ? report.clauses.map(effectiveScore).sort((a,b)=>b-a).slice(0,5).reduce((a,b)=>a+b,0)/Math.min(5,report.clauses.length) : 0;
  const medium = report.clauses.filter((c) => clauseTier(c) === "medium").length;
  const party = info?.party;

  return (
    <>
      <PageHead title={info?.fileName ?? "Contract report"} mock={report.isDemo ? "Demo data" : undefined}>{report.summary}</PageHead>
      <section className="band" style={{ paddingBottom: 32 }}>
        <div className="container grid-3"><div className="card gauge"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/><circle className="gauge-value" cx="60" cy="60" r="54" style={{strokeDashoffset:339.3*(1-overall/10)}}/></svg><strong>{overall.toFixed(1)}<small>/10</small></strong><p>Mean of the five highest effective clause scores</p></div>
          <div><div className="stat">{report.clauses.length}</div><div className="muted">clauses read</div></div>
          <div><div className="stat">{high}</div><div className="muted">high risk</div></div>
          <div><div className="stat">{medium}</div><div className="muted">medium risk</div></div>
        </div>
      </section>

      <section className="section">
        <div className="container stack">
          {high>0&&<div className="alert risk-alert" role="alert"><span className="dot"/><strong>{high} high-risk clauses need attention before you sign</strong></div>}
          {party ? <p className="muted small">Judged from the {party}'s side.</p> : <p className="muted small">No side was chosen in this document.</p>}
          {report.warnings.map((w) => <p key={w} className="muted small">Note: {w}</p>)}
          <div className="layout-2">
            <div>
              <h2>Top 5 risks</h2>
              <Items items={report.topRisks.slice(0, 5)} ordered empty="No risks were found." />
            </div>
            <aside className="stack">
              <div className="card"><h3>Obligations</h3><Items items={report.obligations} empty="No obligations were found." /></div>
              <div className="card"><h3>Exit conditions</h3><Items items={report.exitConditions} empty="No exit conditions were found." /></div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <h2>All clauses</h2>
          <div className="stack">
            <div role="group" aria-label="Filter by category" className="options">
              <button type="button" className="chip" aria-pressed={category === "ALL"} onClick={() => setCategory("ALL")}>All categories</button>
              {categories.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{humanize(c)}</button>
              ))}
            </div>
            <div role="group" aria-label="Filter by risk" className="options">
              <button type="button" className="chip" aria-pressed={tier === "ALL"} onClick={() => setTier("ALL")}>All risk levels</button>
              {TIERS.map(([t, label]) => (
                <button key={t} type="button" className="chip" aria-pressed={tier === t} onClick={() => setTier(t)}>{label}</button>
              ))}
            </div>
            <div className="row row--between">
              <p role="status" aria-live="polite" style={{ margin: 0 }}>Showing {shown.length} of {report.clauses.length} clauses</p>
              {(category !== "ALL" || tier !== "ALL") && (
                <button type="button" className="btn btn--secondary btn--small" onClick={() => { setCategory("ALL"); setTier("ALL"); }}>Clear filters</button>
              )}
            </div>
            {report.clauses.length === 0 ? (
              <EmptyState title="No clauses were found">The document may be empty or in an unexpected format.</EmptyState>
            ) : shown.length === 0 ? (
              <EmptyState title="No clauses match these filters" action={<button type="button" className="btn" onClick={() => { setCategory("ALL"); setTier("ALL"); }}>Clear filters</button>} />
            ) : (
              <div>{shown.map((c) => <ClauseCard key={c.id} clause={c} docId={report.documentId} />)}</div>
            )}
          </div>
        </div>
      <p className="muted small">Not legal advice. First-pass aid only. <a href="/limitations">Read known limitations</a>.</p></section>
    </>
  );
}
