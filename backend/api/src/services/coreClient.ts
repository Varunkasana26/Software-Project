// The only place that talks to the Python core service (POST /analyze, POST /validate-rules).
// Contract: shared/contracts/analyze.request.schema.json and analyze.response.schema.json.
import fs from "fs";
import { getConfig } from "../config/env";
import { AppError } from "../middleware/errorHandler";

export interface CoreRule {
  rule_id: string;
  category: string;
  patterns: string[];
  severity_weight: number;
  party_effect_hint: string;
  explanation: string;
  justification?: string;
}

export interface CoreItem { clause_index: number; text: string; rule_id: string | null; score: number; label: string }
export interface CoreClause {
  id: string;
  index?: number;
  heading?: string;
  text: string;
  category: string;
  sentiment: string;
  rule_id: string | null;
  matched_rule_ids?: string[];
  score: { auto: number; lawyer_override: number | null };
  warning?: string | null;
  explanation: string;
}
export interface CoreReport {
  summary: string;
  top_risks: CoreItem[];
  obligations: CoreItem[];
  exit_conditions: CoreItem[];
  clauses: CoreClause[];
  warnings?: string[];
}

async function call(path: string, init: RequestInit): Promise<Response> {
  const { CORE_URL, CORE_TIMEOUT_MS } = getConfig();
  try {
    return await fetch(`${CORE_URL}${path}`, { ...init, signal: AbortSignal.timeout(CORE_TIMEOUT_MS) });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new AppError(504, "The analysis service took too long to answer.", "CORE_TIMEOUT");
    }
    // No fake results: if core is down the caller gets an error.
    throw new AppError(502, "The analysis service is not reachable. Start it (core, port 8001) and try again.", "CORE_UNREACHABLE");
  }
}

/** Sends the stored file, the user's party and the active rules to core, and returns its Report. */
export async function analyzeFile(opts: { filePath: string; party: string; rules: CoreRule[] }): Promise<CoreReport> {
  const form = new FormData();
  const name = `document${opts.filePath.slice(opts.filePath.lastIndexOf("."))}`; // core decides the type from the extension
  form.append("file", new Blob([fs.readFileSync(opts.filePath)]), name);
  form.append("user_party", opts.party);
  form.append("rules", JSON.stringify(opts.rules));

  const res = await call("/analyze", { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (res.ok) return body as unknown as CoreReport;
  // 4xx from core (scanned PDF, too large, bad rules ...) is passed on with its code; anything else is a core failure.
  if (res.status >= 400 && res.status < 500) throw new AppError(res.status, body.error ?? "The document was rejected.", body.code);
  throw new AppError(502, "The analysis service failed.", "CORE_ERROR");
}

/** Asks core whether candidate rules would load (same loader as the analysis). Returns the problems. */
export async function validateRules(rules: CoreRule[]): Promise<{ rule_id: string; message: string }[]> {
  const res = await call("/validate-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules }) });
  if (!res.ok) throw new AppError(502, "The analysis service could not check the rule.", "CORE_ERROR");
  const body = (await res.json()) as { problems: { rule_id: string; message: string }[] };
  return body.problems;
}
