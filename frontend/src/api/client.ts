// All HTTP calls live here. Base URL comes from VITE_API_URL (see .env.example).
// The session is an httpOnly cookie set by the backend, so no token is kept in the page.
//
// Endpoints (backend/api):
//   POST /api/auth/register | login | logout, GET /api/auth/me
//   POST /api/documents (multipart: file, party), GET /api/documents, GET /api/documents/:id
//   POST /api/documents/:id/process, GET /api/documents/:id/report
//   PATCH | DELETE /api/clauses/:id/override       (lawyer)
//   GET /api/rules, POST | PATCH | DELETE /api/rules (admin for writes)
import { getDemoOverrides, mockReport, saveDemoOverride, type ContractReport } from "./mock";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Development only: shows the built-in demo report without a backend. Always false in a production build. */
export const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, credentials: "include" });
  } catch {
    throw new ApiError(`Cannot reach the API at ${BASE}. Check that the backend is running (scripts/start-all), that ${BASE}/api/health opens in the browser, and that VITE_API_URL in frontend/.env points to it. If it opens but sign-in still fails, FRONTEND_URL in backend/api/.env must be exactly this page's address.`, 0, "NETWORK");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = body.details && typeof body.details === "object"
      ? Object.entries(body.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join("; ")
      : "";
    if (res.status === 401 && body.code === "UNAUTHENTICATED") window.dispatchEvent(new Event("auth-expired"));
    throw new ApiError([body.error ?? `Request failed (${res.status})`, details].filter(Boolean).join(" - "), res.status, body.code);
  }
  return body as T;
}

const json = { "Content-Type": "application/json" };

// ---- Auth ----
export type Role = "USER" | "LAWYER" | "ADMIN";
export interface User { id: string; email: string; role: Role }
export const register = (email: string, password: string) => request<{ user: User }>("/api/auth/register", { method: "POST", headers: json, body: JSON.stringify({ email, password }) });
export const login = (email: string, password: string) => request<{ user: User }>("/api/auth/login", { method: "POST", headers: json, body: JSON.stringify({ email, password }) });
export const logout = () => request<void>("/api/auth/logout", { method: "POST" });
export const me = () => request<{ user: User | null }>("/api/auth/me"); // user is null when signed out

// ---- Documents ----
export interface DocumentInfo { id: string; fileName: string; fileSize: number; status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED"; party: string; failureCode: string | null; createdAt: string }

export function uploadDocument(file: File, party: string, onProgress: (percent: number) => void): Promise<{id:string}> {
  return new Promise((resolve,reject)=>{const form=new FormData();form.append("file",file);form.append("party",party);const xhr=new XMLHttpRequest();xhr.open("POST",`${BASE}/api/documents`);xhr.withCredentials=true;xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};xhr.onerror=()=>reject(new ApiError("Network error while uploading. Check your connection and retry.",0,"NETWORK"));xhr.onload=()=>{const body=JSON.parse(xhr.responseText||"{}");if(xhr.status>=200&&xhr.status<300)resolve(body);else reject(new ApiError(body.error??`Request failed (${xhr.status})`,xhr.status,body.code));};xhr.send(form);});
}
export const explainClause = (docId: string, clauseId: string) => request<{ explanation: string }>(`/api/documents/${docId}/clauses/${clauseId}/explain`, { method: "POST" });
export const processDocument = (id: string) => request<{ document: DocumentInfo }>(`/api/documents/${id}/process`, { method: "POST" });
export const getDocument = (id: string) => request<DocumentInfo>(`/api/documents/${id}`);
export const listDocuments = (page: number) => request<{ data: DocumentInfo[]; total: number; page: number; totalPages: number }>(`/api/documents?page=${page}&limit=20`);

// ---- Report ----
export type Label = "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL";

export interface ClauseView {
  id: string;
  index: number;
  heading: string;
  text: string;
  category: string;
  label: Label;
  ruleId: string | null;
  matchedRuleIds: string[];
  autoScore: number;
  override: { score: number; reason: string } | null;
  explanation: string;
  warning: string | null;
}
export interface ItemView { clauseIndex: number; text: string; ruleId: string | null; score: number; label: Label }
export interface ReportView {
  documentId: string;
  isDemo: boolean;
  summary: string;
  topRisks: ItemView[];
  obligations: ItemView[];
  exitConditions: ItemView[];
  clauses: ClauseView[];
  warnings: string[];
}

function fromContract(r: ContractReport, isDemo: boolean): ReportView {
  const item = (i: ContractReport["top_risks"][number]): ItemView => ({ clauseIndex: i.clause_index, text: i.text, ruleId: i.rule_id, score: i.score, label: i.label });
  return {
    documentId: r.document_id, isDemo, summary: r.summary, warnings: r.warnings ?? [],
    topRisks: r.top_risks.map(item), obligations: r.obligations.map(item), exitConditions: r.exit_conditions.map(item),
    clauses: r.clauses.map((c) => ({
      id: c.id, index: c.index, heading: c.heading ?? "", text: c.text, category: c.category, label: c.sentiment,
      ruleId: c.rule_id, matchedRuleIds: c.matched_rule_ids ?? (c.rule_id ? [c.rule_id] : []), autoScore: c.score.auto,
      override: c.score.lawyer_override === null ? null : { score: c.score.lawyer_override, reason: c.lawyer_override_reason ?? "" },
      explanation: c.explanation, warning: c.warning ?? null,
    })),
  };
}

export async function getReport(id: string): Promise<ReportView> {
  if (DEMO_MODE && id === "demo") {
    const view = fromContract(mockReport, true);
    const saved = getDemoOverrides();
    view.clauses = view.clauses.map((c) => ({ ...c, override: saved[c.id] ?? null }));
    return view;
  }
  return fromContract(await request<ContractReport>(`/api/documents/${id}/report`), false);
}

// ---- Lawyer override ----
export async function saveOverride(clauseId: string, score: number, reason: string): Promise<void> {
  if (clauseId.startsWith("demo-")) return saveDemoOverride(clauseId, { score, reason }); // demo mode only
  await request(`/api/clauses/${clauseId}/override`, { method: "PATCH", headers: json, body: JSON.stringify({ score, reason }) });
}
export async function clearOverride(clauseId: string): Promise<void> {
  if (clauseId.startsWith("demo-")) return saveDemoOverride(clauseId, null);
  await request(`/api/clauses/${clauseId}/override`, { method: "DELETE" });
}

// ---- Rules ----
export type Category = "OBLIGATION" | "RIGHT" | "PENALTY" | "TERMINATION" | "PAYMENT_TERM" | "OTHER";
export interface Rule {
  id: string;
  ruleId: string;
  name: string;
  category: Category;
  patterns: string[];
  severityWeight: number;
  partyEffectHint: Label;
  explanation: string;
  justification: string;
  isActive: boolean;
}
export type RuleInput = Omit<Rule, "id">;
export interface RulePage { data: Rule[]; total: number; page: number; limit: number; totalPages: number }

export const listRules = (page: number, limit = 20) => request<RulePage>(`/api/rules?page=${page}&limit=${limit}`);
export const createRule = (rule: RuleInput) => request<Rule>("/api/rules", { method: "POST", headers: json, body: JSON.stringify(rule) });
export const updateRule = (id: string, patch: Partial<RuleInput>) => request<Rule>(`/api/rules/${id}`, { method: "PATCH", headers: json, body: JSON.stringify(patch) });
export const deleteRule = (id: string) => request<void>(`/api/rules/${id}`, { method: "DELETE" });

// ---- Server mode ----
// The backend reports "offline-demo" when it runs without a database (OFFLINE_DEMO=true). Used only to show the demo accounts.
export async function getServerMode(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return ((await res.json()) as { mode?: string }).mode ?? null;
  } catch {
    return null;
  }
}
