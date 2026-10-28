// All HTTP calls live here. Base URL comes from VITE_API_URL (see .env.example).
import { mockLogin, mockReport, type ContractReport } from "./mock";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// TODO(backend): no login endpoint exists, so this is a mock.
export async function login(email: string) {
  const { token } = await mockLogin(email);
  localStorage.setItem("token", token);
}

// Real: POST /api/documents (multipart field "file") returns { id, fileName, status, message }.
export function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ id: string }>("/api/documents", { method: "POST", body: form });
}

// Real: POST /api/documents/:id/process
export function processDocument(id: string) {
  return request<unknown>(`/api/documents/${id}/process`, { method: "POST" });
}

// What the Report page shows. rule_id and score come from the contract; the real backend does not return them yet.
export interface ReportView {
  summary: string;
  topRisks: string[];
  obligations: string[];
  exitConditions: string[];
  clauses: { id: string; text: string; category: string; risk: string; ruleId: string | null }[];
}

interface BackendReport {
  summary: string;
  topRisks: string[];
  obligations: string[];
  exitConditions: string[];
}

interface BackendClause {
  id: string;
  text: string;
  category: string;
  riskLevel: string;
}

function fromContract(r: ContractReport): ReportView {
  return {
    summary: r.summary,
    topRisks: r.top_risks,
    obligations: r.obligations,
    exitConditions: r.exit_conditions,
    clauses: r.clauses.map((c) => ({
      id: c.id,
      text: c.text,
      category: c.category,
      risk: String(c.score.lawyer_override ?? c.score.auto),
      ruleId: c.rule_id,
    })),
  };
}

// Real: GET /api/documents/:id/report and GET /api/documents/:id/clauses. The id "demo" uses mock data.
export async function getReport(id: string): Promise<ReportView> {
  if (id === "demo") return fromContract(mockReport);
  const [report, clauses] = await Promise.all([
    request<BackendReport>(`/api/documents/${id}/report`),
    request<BackendClause[]>(`/api/documents/${id}/clauses`),
  ]);
  return {
    summary: report.summary,
    topRisks: report.topRisks,
    obligations: report.obligations,
    exitConditions: report.exitConditions,
    // TODO(backend): clauses have no rule_id and no numeric risk score yet (only riskLevel).
    // Add them to match shared/contracts/clause.schema.json.
    clauses: clauses.map((c) => ({
      id: c.id,
      text: c.text,
      category: c.category,
      risk: c.riskLevel,
      ruleId: null,
    })),
  };
}
