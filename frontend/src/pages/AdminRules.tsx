import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createRule, deleteRule, listRules, updateRule, type Category, type Label, type Rule, type RuleInput, type RulePage } from "../api/client";
import { Alert } from "../components/Alert";
import { PageHead } from "../components/Layout";
import { EmptyState, ErrorState, Loading } from "../components/States";

const CATEGORIES: Category[] = ["OBLIGATION", "RIGHT", "PENALTY", "TERMINATION", "PAYMENT_TERM", "OTHER"];
const EFFECTS: Label[] = ["FAVORABLE", "UNFAVORABLE", "NEUTRAL"];
const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const BLANK: RuleInput = { ruleId: "", name: "", category: "OBLIGATION", patterns: [], severityWeight: 1, partyEffectHint: "NEUTRAL", explanation: "", justification: "", isActive: true };

function RuleForm({ initial, onSaved, onCancel }: { initial: Rule | null; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<RuleInput>(initial ?? BLANK);
  const [patternText, setPatternText] = useState((initial?.patterns ?? []).join("\n")); // one pattern per line
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const set = <K extends keyof RuleInput>(k: K, v: RuleInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const patterns = patternText.split("\n").map((p) => p.trim()).filter(Boolean);
    const next: Record<string, string> = {};
    if (!initial && !/^[A-Za-z0-9_-]{2,40}$/.test(form.ruleId)) next.ruleId = "Use 2 to 40 letters, digits, - or _ (for example PEN-052).";
    if (!form.name.trim()) next.name = "Enter a name.";
    if (patterns.length === 0) next.patterns = "Enter at least one pattern.";
    if (!form.explanation.trim()) next.explanation = "Enter an explanation shown to users.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setServerError("");
    try {
      // The server asks the analysis service to check the patterns, so a bad regex is refused here with a clear message.
      if (initial) {
        const { ruleId: _id, ...patch } = { ...form, patterns };
        await updateRule(initial.id, patch);
      } else {
        await createRule({ ...form, patterns });
      }
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
      <h2 ref={title} tabIndex={-1} style={{ fontSize: "var(--text-h3)" }}>{initial ? `Edit rule ${initial.ruleId}` : "Add rule"}</h2>
      <div className="form-grid">
        <div className="field"><label htmlFor="rule-ruleId">Rule id</label>
          <input id="rule-ruleId" className="mono" type="text" value={form.ruleId} disabled={!!initial} onChange={(e) => set("ruleId", e.target.value)} {...inv("ruleId")} />{err("ruleId")}</div>
        <div className="field"><label htmlFor="rule-name">Name</label><input id="rule-name" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} {...inv("name")} />{err("name")}</div>
        <div className="field"><label htmlFor="rule-category">Category</label>
          <select id="rule-category" value={form.category} onChange={(e) => set("category", e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select></div>
        <div className="field"><label htmlFor="rule-weight">Severity weight (1 to 5)</label>
          <select id="rule-weight" value={form.severityWeight} onChange={(e) => set("severityWeight", Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        <div className="field"><label htmlFor="rule-effect">Effect for the tenant, employee, recipient or client</label>
          <select id="rule-effect" value={form.partyEffectHint} onChange={(e) => set("partyEffectHint", e.target.value as Label)}>{EFFECTS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>
        <div className="field span-2"><label htmlFor="rule-patterns">Patterns (regular expressions, one per line)</label>
          <textarea id="rule-patterns" className="mono" value={patternText} onChange={(e) => setPatternText(e.target.value)} {...inv("patterns")} />
          <p className="help">Matched case-insensitively against each clause. Avoid nested repeats such as (a+)+; the analysis service rejects them.</p>{err("patterns")}</div>
        <div className="field span-2"><label htmlFor="rule-explanation">Explanation</label>
          <textarea id="rule-explanation" value={form.explanation} onChange={(e) => set("explanation", e.target.value)} {...inv("explanation")} />{err("explanation")}</div>
        <div className="field span-2"><label htmlFor="rule-justification">Justification (optional)</label>
          <input id="rule-justification" type="text" value={form.justification} onChange={(e) => set("justification", e.target.value)} />
          <p className="help">Why this rule is a general drafting convention.</p></div>
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
      setNotice({ kind: "success", text: `${rule.ruleId} is now ${rule.isActive ? "disabled" : "enabled"}. The next analysis uses this change.` });
      load();
    } catch (e) { setNotice({ kind: "error", text: e instanceof Error ? e.message : "Could not update the rule." }); }
  }
  async function remove(rule: Rule) {
    try {
      await deleteRule(rule.id);
      setConfirming(null);
      setNotice({ kind: "success", text: `${rule.ruleId} was deleted.` });
      load();
    } catch (e) { setNotice({ kind: "error", text: e instanceof Error ? e.message : "Could not delete the rule." }); }
  }

  return (
    <>
      <PageHead title="Classification rules">These rules decide how every clause is classified and scored. A change applies to the next analysis.</PageHead>
      <section className="section">
        <div className="container stack">
          {notice && <Alert kind={notice.kind}>{notice.text}</Alert>}
          {editing ? (
            <RuleForm initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)}
              onSaved={() => { setEditing(null); setNotice({ kind: "success", text: "Rule saved. The next analysis uses it." }); load(); }} />
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
                    <thead><tr><th scope="col">Rule</th><th scope="col">Category</th><th scope="col">Weight</th><th scope="col">Effect</th><th scope="col">Pattern</th><th scope="col">Active</th><th scope="col">Actions</th></tr></thead>
                    <tbody>
                      {data.data.map((r) => (
                        <tr key={r.id}>
                          <td data-label="Rule"><strong className="mono">{r.ruleId}</strong><div className="muted small">{r.name}</div></td>
                          <td data-label="Category">{humanize(r.category)}</td>
                          <td data-label="Weight">{r.severityWeight}</td>
                          <td data-label="Effect">{humanize(r.partyEffectHint)}</td>
                          <td data-label="Pattern"><code className="pattern" title={r.patterns.join("\n")}>{r.patterns[0]}</code>{r.patterns.length > 1 && <span className="muted small"> +{r.patterns.length - 1} more</span>}</td>
                          <td data-label="Active">
                            <button type="button" role="switch" aria-checked={r.isActive} aria-label={`${r.ruleId} active`} className="switch" onClick={() => toggle(r)}>
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
                                <button type="button" className="btn btn--secondary btn--small" aria-label={`Edit ${r.ruleId}`} onClick={() => { setNotice(null); setEditing(r); }}>Edit</button>
                                <button type="button" className="btn btn--secondary btn--small" aria-label={`Delete ${r.ruleId}`} onClick={() => setConfirming(r.id)}>Delete</button>
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
