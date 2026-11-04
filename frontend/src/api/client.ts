// All HTTP calls live here. Base URL comes from VITE_API_URL (see .env.example).
//
// Real backend endpoints used (backend/api):
//   POST   /api/documents            multipart field "file"  -> { id, fileName, status }
//   POST   /api/documents/:id/process
//   GET    /api/documents/:id/report   -> { summary, topRisks[], obligations[], exitConditions[] } (strings)
//   GET    /api/documents/:id/clauses  -> [{ id, text, category, sentiment, riskLevel, explanation }]
//   GET    /api/rules, POST /api/rules, PATCH /api/rules/:id, DELETE /api/rules/:id
// Mocked (no endpoint yet): login, lawyer override, and the "demo" report.
import { getOverrides, mockLogin, mockReport, saveOverride as saveMockOverride, type ContractReport } from "./mock";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and that the API is running.", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = body.details && typeof body.details === "object"
      ? Object.entries(body.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join("; ")
      : "";
    throw new ApiError([body.error ?? body.message ?? `Request failed (${res.status})`, details].filter(Boolean).join(" - "), res.status, body.code);
  }
  return body as T;
}

// ---- Auth (mock) ----
// TODO(backend): no login endpoint exists, so this is a mock.
export async function login(email: string): Promise<void> {
  const { token } = await mockLogin(email);
  localStorage.setItem("token", token);
  localStorage.setItem("user", email);
  window.dispatchEvent(new Event("auth-change"));
}
export function logout(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth-change"));
}
export const currentUser = (): string | null => localStorage.getItem("user");

// ---- Upload and process (real) ----
export function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ id: string }>("/api/documents", { method: "POST", body: form });
}
export function processDocument(id: string) {
  return request<unknown>(`/api/documents/${id}/process`, { method: "POST" });
}

// ---- Report ----
export type Label = "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL";

export interface ClauseView {
  id: string;
  index: number;
  text: string;
  category: string;
  label: Label;
  ruleId: string | null; // TODO(backend): real clauses have no rule_id yet
  autoScore: number | null; // TODO(backend): real clauses have only riskLevel, no numeric score
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  override: { score: number; reason: string } | null;
  explanation: string;
}
export interface ItemView { clauseIndex: number; text: string; ruleId: string | null; score: number | null; label: Label }
export interface ReportView {
  documentId: string;
  isMock: boolean;
  summary: string;
  topRisks: ItemView[];
  obligations: ItemView[];
  exitConditions: ItemView[];
  clauses: ClauseView[];
  warnings: string[];
}

interface BackendReport { summary: string; topRisks: string[]; obligations: string[]; exitConditions: string[] }
interface BackendClause { id: string; text: string; category: string; sentiment: Label; riskLevel: "LOW" | "MEDIUM" | "HIGH"; explanation: string }

function fromContract(r: ContractReport): ReportView {
  const item = (i: ContractReport["top_risks"][number]): ItemView => ({ clauseIndex: i.clause_index, text: i.text, ruleId: i.rule_id, score: i.score, label: i.label });
  return {
    documentId: r.document_id, isMock: true, summary: r.summary, warnings: [],
    topRisks: r.top_risks.map(item), obligations: r.obligations.map(item), exitConditions: r.exit_conditions.map(item),
    clauses: r.clauses.map((c, index) => ({
      id: c.id, index, text: c.text, category: c.category, label: c.sentiment, ruleId: c.rule_id,
      autoScore: c.score.auto, riskLevel: null, override: null, explanation: c.explanation,
    })),
  };
}

// The id "demo" returns mock data. Any other id calls the real backend.
export async function getReport(id: string): Promise<ReportView> {
  let view: ReportView;
  if (id === "demo") {
    view = fromContract(mockReport);
  } else {
    const [report, clauses] = await Promise.all([
      request<BackendReport>(`/api/documents/${id}/report`),
      request<BackendClause[]>(`/api/documents/${id}/clauses`),
    ]);
    // TODO(backend): lists are still strings. They must become reportItem objects (see shared/contracts/report.schema.json).
    const asItems = (list: string[], label: Label): ItemView[] => list.map((text, i) => ({ clauseIndex: i, text, ruleId: null, score: null, label }));
    view = {
      documentId: id, isMock: false, summary: report.summary, warnings: [],
      topRisks: asItems(report.topRisks, "UNFAVORABLE"),
      obligations: asItems(report.obligations, "NEUTRAL"),
      exitConditions: asItems(report.exitConditions, "NEUTRAL"),
      clauses: clauses.map((c, index) => ({
        id: c.id, index, text: c.text, category: c.category, label: c.sentiment, ruleId: null,
        autoScore: null, riskLevel: c.riskLevel, override: null, explanation: c.explanation,
      })),
    };
  }
  // Lawyer overrides are mock-only for now (see saveOverride), so they apply to every report.
  const overrides = getOverrides(view.documentId);
  view.clauses = view.clauses.map((c) => ({ ...c, override: overrides[c.id] ?? null }));
  return view;
}

// TODO(backend): needs an endpoint such as PATCH /api/clauses/:id/override {score, reason}. Stored in this browser only.
export async function saveOverride(docId: string, clauseId: string, score: number, reason: string): Promise<void> {
  saveMockOverride(docId, clauseId, { score, reason });
}

// ---- Rules (real) ----
export type Category = "OBLIGATION" | "RIGHT" | "PENALTY" | "TERMINATION" | "PAYMENT_TERM" | "OTHER";
export interface Rule {
  id: string;
  name: string;
  category: Category;
  pattern: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  sentiment: Label;
  explanation: string;
  isActive: boolean;
}
export type RuleInput = Omit<Rule, "id">;
export interface RulePage { data: Rule[]; total: number; page: number; limit: number; totalPages: number }

const json = { "Content-Type": "application/json" };
export const listRules = (page: number, limit = 20) => request<RulePage>(`/api/rules?page=${page}&limit=${limit}`);
export const createRule = (rule: RuleInput) => request<Rule>("/api/rules", { method: "POST", headers: json, body: JSON.stringify(rule) });
export const updateRule = (id: string, patch: Partial<RuleInput>) => request<Rule>(`/api/rules/${id}`, { method: "PATCH", headers: json, body: JSON.stringify(patch) });
export const deleteRule = (id: string) => request<void>(`/api/rules/${id}`, { method: "DELETE" });
