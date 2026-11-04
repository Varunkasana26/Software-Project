import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createRule, deleteRule, listRules, updateRule, type Category, type Label, type Rule, type RuleInput, type RulePage } from "../api/client";
import { Alert } from "../components/Alert";
import { PageHead } from "../components/Layout";
import { EmptyState, ErrorState, Loading } from "../components/States";

const CATEGORIES: Category[] = ["OBLIGATION", "RIGHT", "PENALTY", "TERMINATION", "PAYMENT_TERM", "OTHER"];
const RISKS = ["LOW", "MEDIUM", "HIGH"] as const;
const SENTIMENTS: Label[] = ["FAVORABLE", "UNFAVORABLE", "NEUTRAL"];
const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const BLANK: RuleInput = { name: "", category: "OBLIGATION", pattern: "", riskLevel: "MEDIUM", sentiment: "NEUTRAL", explanation: "", isActive: true };

function RuleForm({ initial, onSaved, onCancel }: { initial: Rule | null; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<RuleInput>(initial ?? BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const set = <K extends keyof RuleInput>(k: K, v: RuleInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter a name.";
    if (!form.pattern.trim()) next.pattern = "Enter a pattern.";
    else {
      try { new RegExp(form.pattern, "i"); } catch { next.pattern = "This is not a valid regular expression."; }
    }
    if (!form.explanation.trim()) next.explanation = "Enter an explanation shown to users.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setServerError("");
    try {
      if (initial) await updateRule(initial.id, form);
      else await createRule(form);
      onSaved();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save the rule.");
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k] && <div id={`rule-${k}-err`} className="field-error" role="alert">{errors[k]}</div>;
  const inv = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `rule-${k}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="card">
      <h2 ref={title} tabIndex={-1} style={{ fontSize: "var(--text-h3)" }}>{initial ? "Edit rule" : "Add rule"}</h2>
      <div className="form-grid">
        <div className="field"><label htmlFor="rule-name">Name</label><input id="rule-name" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} {...inv("name")} />{err("name")}</div>
        <div className="field"><label htmlFor="rule-category">Category</label>
          <select id="rule-category" value={form.category} onChange={(e) => set("category", e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select></div>
        <div className="field span-2"><label htmlFor="rule-pattern">Pattern (regular expression)</label>
          <input id="rule-pattern" className="mono" type="text" value={form.pattern} onChange={(e) => set("pattern", e.target.value)} {...inv("pattern")} />
          <p className="help">Matched case-insensitively against each clause. Keep it simple: avoid nested repeats such as (a+)+.</p>{err("pattern")}</div>
        <div className="field"><label htmlFor="rule-risk">Risk level</label>
          <select id="rule-risk" value={form.riskLevel} onChange={(e) => set("riskLevel", e.target.value as RuleInput["riskLevel"])}>{RISKS.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}</select></div>
        <div className="field"><label htmlFor="rule-sentiment">Effect</label>
          <select id="rule-sentiment" value={form.sentiment} onChange={(e) => set("sentiment", e.target.value as Label)}>{SENTIMENTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>
        <div className="field span-2"><label htmlFor="rule-explanation">Explanation</label>
          <textarea id="rule-explanation" value={form.explanation} onChange={(e) => set("explanation", e.target.value)} {...inv("explanation")} />{err("explanation")}</div>
      </div>
      {serverError && <div className="field"><Alert kind="error">{serverError}</Alert></div>}
      <div className="row">
        <button type="submit" className="btn" disabled={busy}>{busy ? "Saving..." : "Save rule"}</button>
        <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminRules() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RulePage | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Rule | "new" | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = useCallback(() => {
    setError("");
    listRules(page).then(setData).catch((e) => setError(e instanceof Error ? e.message : "Could not load rules."));
  }, [page]);
  useEffect(load, [load]);

  async function toggle(rule: Rule) {
    try {
      await updateRule(rule.id, { isActive: !rule.isActive });
      setNotice({ kind: "success", text: `"${rule.name}" is now ${rule.isActive ? "disabled" : "enabled"}.` });
      load();
    } catch (e) { setNotice({ kind: "error", text: e instanceof Error ? e.message : "Could not update the rule." }); }
  }
  async function remove(rule: Rule) {
    try {
      await deleteRule(rule.id);
      setConfirming(null);
      setNotice({ kind: "success", text: `"${rule.name}" was deleted.` });
      load();
    } catch (e) { setNotice({ kind: "error", text: e instanceof Error ? e.message : "Could not delete the rule." }); }
  }

  return (
    <>
      <PageHead title="Classification rules">Add, edit, enable or disable the rules used to classify clauses.</PageHead>
      <section className="section">
        <div className="container stack">
          {notice && <Alert kind={notice.kind}>{notice.text}</Alert>}
          {editing ? (
            <RuleForm initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)}
              onSaved={() => { setEditing(null); setNotice({ kind: "success", text: "Rule saved." }); load(); }} />
          ) : (
            <div><button type="button" className="btn" onClick={() => { setNotice(null); setEditing("new"); }}>Add rule</button></div>
          )}
          {error ? <ErrorState message={error} onRetry={load} />
            : !data ? <Loading label="Loading rules" height={56} blocks={5} />
            : data.data.length === 0 ? <EmptyState title="No rules yet" action={<button type="button" className="btn" onClick={() => setEditing("new")}>Add the first rule</button>}>Rules decide how each clause is classified and scored.</EmptyState>
            : (
              <>
                <div className="table-wrap">
                  <table>
                    <caption className="visually-hidden">Classification rules</caption>
                    <thead><tr><th scope="col">Name</th><th scope="col">Category</th><th scope="col">Risk</th><th scope="col">Effect</th><th scope="col">Pattern</th><th scope="col">Active</th><th scope="col">Actions</th></tr></thead>
                    <tbody>
                      {data.data.map((r) => (
                        <tr key={r.id}>
                          <td data-label="Name"><strong>{r.name}</strong></td>
                          <td data-label="Category">{humanize(r.category)}</td>
                          <td data-label="Risk">{humanize(r.riskLevel)}</td>
                          <td data-label="Effect">{humanize(r.sentiment)}</td>
                          <td data-label="Pattern"><code className="pattern" title={r.pattern}>{r.pattern}</code></td>
                          <td data-label="Active">
                            <button type="button" role="switch" aria-checked={r.isActive} aria-label={`${r.name} active`} className="switch" onClick={() => toggle(r)}>
                              <span className="track"><span className="thumb" /></span>{r.isActive ? "On" : "Off"}
                            </button>
                          </td>
                          <td data-label="Actions">
                            {confirming === r.id ? (
                              <div className="row">
                                <span className="small">Delete this rule?</span>
                                <button type="button" className="btn btn--danger btn--small" onClick={() => remove(r)}>Delete</button>
                                <button type="button" className="btn btn--secondary btn--small" onClick={() => setConfirming(null)}>Cancel</button>
                              </div>
                            ) : (
                              <div className="row">
                                <button type="button" className="btn btn--secondary btn--small" aria-label={`Edit ${r.name}`} onClick={() => { setNotice(null); setEditing(r); }}>Edit</button>
                                <button type="button" className="btn btn--secondary btn--small" aria-label={`Delete ${r.name}`} onClick={() => setConfirming(r.id)}>Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row row--between">
                  <span className="muted" role="status">Page {data.page} of {Math.max(data.totalPages, 1)} ({data.total} rules)</span>
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
