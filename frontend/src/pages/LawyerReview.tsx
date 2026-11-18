import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { clearOverride, getReport, saveOverride, type ClauseView, type ReportView } from "../api/client";
import { Alert } from "../components/Alert";
import { PageHead } from "../components/Layout";
import { RiskBadge, effectiveScore, tierFromScore } from "../components/RiskBadge";
import { EmptyState, ErrorState, Loading } from "../components/States";
import { DissolveText } from "../components/DissolveText";
import { useFlipList } from "../hooks/useFlipList";
import { useCountUp } from "../hooks/useMotion";

function ReviewClause({clause,onSaved}:{clause:ClauseView;onSaved:(clause:ClauseView)=>void}){const [score,setScore]=useState(String(clause.override?.score??clause.autoScore));const [reason,setReason]=useState(clause.override?.reason??"");const [error,setError]=useState("");const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);const [flash,setFlash]=useState(false);const current=Number(score);const dirty=score!==String(clause.override?.score??clause.autoScore)||reason!==(clause.override?.reason??"");const id=`review-${clause.id}`;async function submit(e:FormEvent){e.preventDefault();const n=Number(score);if(!score.trim()||!Number.isFinite(n)||n<0||n>10){setError("Enter a score from 0 to 10.");return}if(!reason.trim()){setError("A reason is required for every override.");return}setError("");setSaving(true);setSaved(false);try{await saveOverride(clause.id,n,reason.trim());const next={...clause,override:{score:n,reason:reason.trim()}};setScore(String(n));setReason(reason.trim());onSaved(next);setSaved(true);setFlash(true);setTimeout(()=>setSaved(false),1200);setTimeout(()=>setFlash(false),850)}catch(e){setError(e instanceof Error?e.message:"Could not save the override.")}finally{setSaving(false)}}async function clear(){try{await clearOverride(clause.id);const next={...clause,override:null};setScore(String(clause.autoScore));setReason("");onSaved(next)}catch(e){setError(e instanceof Error?e.message:"Could not remove override.")}}return <article data-flip-id={clause.id} className={`card review-clause ${effectiveScore(clause)>=8?"high":""} ${dirty?"dirty":""} ${flash?"saved-flash":""}`}><header className="clause-head"><strong>Clause {clause.index+1}</strong><RiskBadge tier={tierFromScore(effectiveScore(clause))} score={effectiveScore(clause)} label={clause.label}/>{clause.ruleId&&<code>{clause.ruleId}</code>}{dirty&&<span className="tag unsaved">Unsaved changes</span>}</header><p>{clause.text}</p><p className="small muted">Original auto score (read-only): <strong>{clause.autoScore}</strong>{clause.override?<> → Lawyer {clause.override.score}</>:" · no lawyer override"}</p><form onSubmit={submit} noValidate><div className="review-edit-grid"><div className="field"><label htmlFor={`${id}-score`}>Override score (0 to 10)</label><div className={`score-control ${error.includes("score")?"score-error":""}`}><button type="button" aria-label="Decrease score" onClick={()=>setScore(String(Math.max(0,(current||0)-.5)))}>−</button><input id={`${id}-score`} type="number" min={0} max={10} step={.5} value={score} onChange={e=>{setScore(e.target.value);setError("")}}/><button type="button" aria-label="Increase score" onClick={()=>setScore(String(Math.min(10,(current||0)+.5)))}>+</button><RiskBadge tier={Number.isFinite(current)?tierFromScore(current):"neutral"} score={Number.isFinite(current)?current:null}/></div><input aria-label="Override score slider" type="range" min={0} max={10} step={.5} value={Number.isFinite(current)?Math.min(10,Math.max(0,current)):0} onChange={e=>setScore(e.target.value)}/>{error.includes("score")&&<div className="field-error" role="alert">{error}</div>}</div><div className="field reason-field"><label htmlFor={`${id}-reason`}>Reason</label><textarea id={`${id}-reason`} maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);setError("")}} aria-invalid={!!error&&error.includes("reason")}/><span className="reason-count">{reason.length}/1000</span>{error.includes("reason")&&<div className="field-error" role="alert">{error}</div>}</div></div>{error&&!error.includes("score")&&!error.includes("reason")&&<div role="alert"><Alert kind="error">{error}</Alert></div>}<div className="row"><button type="submit" className="btn btn--small" disabled={!dirty||saving} aria-busy={saving}><DissolveText trigger={saving?1:saved?2:0}>{saving?"Saving…":saved?"✓ Saved":error?"Failed. Try again":"Save override"}</DissolveText></button>{clause.override&&<button type="button" className="btn btn--secondary btn--small" disabled={saving} onClick={clear}>Remove override</button>}<span className="visually-hidden" role="status" aria-live="polite">{saving?"Saving":saved?"Saved":error?`Save failed: ${error}`:""}</span></div></form></article>}

export default function LawyerReview() {
  const { id = "" } = useParams();
  const [report, setReport] = useState<ReportView | null>(null);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<"risk" | "document">("risk");
  const [category, setCategory] = useState("ALL");
  const [risk, setRisk] = useState("ALL");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setReport(null); setError(""); setCategory("ALL"); setRisk("ALL");
    getReport(id).then(data => { if (alive) setReport(data); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "Could not load the report."); });
    return () => { alive = false; };
  }, [id, retry]);
  const clauses = useMemo(() => [...(report?.clauses ?? [])]
    .filter(c => (category === "ALL" || c.category === category) && (risk === "ALL" || tierFromScore(effectiveScore(c)) === risk))
    .sort((a, b) => sort === "risk" ? effectiveScore(b) - effectiveScore(a) || a.index - b.index : a.index - b.index),
    [report, category, risk, sort]);
  const flip = useFlipList<HTMLDivElement>(clauses.map(c => `${c.id}:${effectiveScore(c)}`).join(","));
  const updateClause = useCallback((updated: ClauseView) => {
    setReport(current => current ? { ...current, clauses: current.clauses.map(c => c.id === updated.id ? updated : c) } : current);
  }, []);
  return <>
    <PageHead title="Lawyer review" mock={report?.isDemo ? "Demo data" : undefined}>Adjust the score of any clause and record why. The original automatic score is never overwritten.</PageHead>
    <section className="section"><div className="container stack lawyer-review">
      <div className="row"><Link className="btn btn--secondary btn--small" to="/documents">Documents</Link><Link className="btn btn--secondary btn--small" to={`/report/${id}`}>Open report</Link></div>
      {error ? <ErrorState message={error} onRetry={() => setRetry(n => n + 1)} />
        : !report ? <Loading label="Loading clauses" height={220} />
        : <>
          <div className="review-summary" aria-label="Review summary"><div>Clauses <Count value={report.clauses.length} /></div><div>High risk <Count value={report.clauses.filter(c => effectiveScore(c) >= 8).length} /></div><div>Overridden <Count value={report.clauses.filter(c => !!c.override).length} /></div></div>
          {report.clauses.length === 0 ? <EmptyState title="No clauses to review" /> : <>
            <label className="row">Sort by <select value={sort} onChange={e => setSort(e.target.value as "risk" | "document")}><option value="risk">Highest risk first</option><option value="document">Document order</option></select></label>
            <FilterChips values={["ALL", ...new Set(report.clauses.map(c => c.category))]} value={category} onChange={setCategory} label="Category" />
            <FilterChips values={["ALL", "high", "medium", "low", "neutral"]} value={risk} onChange={setRisk} label="Risk" />
            {report.clauses.every(c => effectiveScore(c) === 0) && <div className="empty-risk">✓ No risky clauses found for the selected side. Check that the document was analysed from the right party.</div>}
            <div ref={flip} className="review-clauses">{clauses.length === 0 ? <EmptyState title="No clauses match these filters" /> : clauses.map(c => <ReviewClause key={`${id}:${c.id}`} clause={c} onSaved={updateClause} />)}</div>
          </>}
        </>}
    </div></section>
  </>;
}
function Count({value}:{value:number}){const n=useCountUp(value);return <span>{Math.round(n)}</span>}
function FilterChips({values,value,onChange,label}:{values:string[];value:string;onChange:(v:string)=>void;label:string}){const [clicked,setClicked]=useState<Record<string,number>>({});const refs=useRef(new Map<string,HTMLButtonElement>());const [pos,setPos]=useState({x:0,w:0});useEffect(()=>{const el=refs.current.get(value);if(el)setPos({x:el.offsetLeft-6,w:el.offsetWidth})},[value,values.join("|")]);return <div className="review-filters" role="group" aria-label={`${label} filter`}><span aria-hidden="true" className="review-filter-indicator" style={{width:pos.w,transform:`translateX(${pos.x}px)`}}/>{values.map(v=><button key={v} ref={el=>{if(el)refs.current.set(v,el)}} className="chip" type="button" aria-label={v==="ALL"?`All ${label}`:v.replace(/_/g," ")} aria-pressed={v===value} onClick={()=>{setClicked(c=>({...c,[v]:(c[v]??0)+1}));onChange(v)}}><DissolveText trigger={clicked[v]??0}>{v==="ALL"?`All ${label}`:v.replace(/_/g," ")}</DissolveText></button>)}</div>}
