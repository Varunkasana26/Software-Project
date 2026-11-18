import { useState } from "react";
import { useParams } from "react-router-dom";
import { explainClause } from "../api/client";

// Optional plain-English explanation from Gemini. The risk score above it always comes from the rules, never from the AI.
export function AiExplain({ clauseId }: { clauseId: string }) {
  const { id = "" } = useParams();
  const [state, setState] = useState<{ busy: boolean; text: string; error: string }>({ busy: false, text: "", error: "" });

  async function run() {
    setState({ busy: true, text: "", error: "" });
    try {
      const r = await explainClause(id, clauseId);
      setState({ busy: false, text: r.explanation, error: "" });
    } catch (e) {
      setState({ busy: false, text: "", error: e instanceof Error ? e.message : "Could not get an explanation." });
    }
  }

  return (
    <div className="ai-explain">
      <button type="button" className="btn btn--secondary btn--small" onClick={run} disabled={state.busy}>
        {state.busy ? "Explaining…" : "Explain in plain English (AI)"}
      </button>
      {state.text && (
        <p className="small" role="status">
          <strong>AI explanation:</strong> {state.text}
          <br />
          <span className="muted">AI-generated, may be wrong, not legal advice. The clause text was sent to Google Gemini. The score above comes from the rules.</span>
        </p>
      )}
      {state.error && <p className="small muted" role="alert">{state.error}</p>}
    </div>
  );
}
