import { useState } from "react";
import { useParams } from "react-router-dom";
import { requestAdvice } from "../api/client";
import { useAuth } from "./Auth";

// The user asks a lawyer for advice on one clause. Only requested clauses appear on the lawyer side.
export function AdviceButton({ clauseId, requested }: { clauseId: string; requested: boolean }) {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState<{ busy: boolean; done: boolean; error: string }>({ busy: false, done: requested, error: "" });
  if (user?.role === "LAWYER" || user?.role === "ADMIN") return null; // only the document owner asks

  async function ask() {
    setState({ busy: true, done: false, error: "" });
    try { await requestAdvice(id, clauseId); setState({ busy: false, done: true, error: "" }); }
    catch (e) { setState({ busy: false, done: false, error: e instanceof Error ? e.message : "Could not send the request." }); }
  }

  return (
    <div className="advice">
      {state.done
        ? <span className="tag" role="status">Advice requested. A lawyer can now see this clause.</span>
        : <button type="button" className="btn btn--secondary btn--small" onClick={ask} disabled={state.busy}>{state.busy ? "Sending…" : "Get advice from a lawyer"}</button>}
      {state.error && <p className="small muted" role="alert">{state.error}</p>}
    </div>
  );
}
