// Mock data. Shapes follow shared/contracts/report.schema.json and clause.schema.json.
export interface ContractClause {
  id: string;
  document_id: string;
  text: string;
  category: string;
  sentiment: "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL";
  rule_id: string | null;
  score: { auto: number; lawyer_override: number | null };
  explanation: string;
}

export interface ReportItem {
  clause_index: number;
  text: string;
  rule_id: string | null;
  score: number;
  label: "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL";
}

export interface ContractReport {
  id: string;
  document_id: string;
  summary: string;
  top_risks: ReportItem[];
  obligations: ReportItem[];
  exit_conditions: ReportItem[];
  clauses: ContractClause[];
}

const c = (
  i: number, text: string, category: string, sentiment: ContractClause["sentiment"],
  rule_id: string | null, auto: number, explanation: string,
): ContractClause => ({
  id: `demo-c${i}`, document_id: "demo", text, category, sentiment, rule_id,
  score: { auto, lawyer_override: null }, explanation,
});

const clauses: ContractClause[] = [
  c(0, "The deposit is non-refundable if the Tenant vacates before the end of the fixed term, and the Landlord may retain the entire deposit as liquidated damages.", "PENALTY", "UNFAVORABLE", "PEN-004", 10, "Liquidated damages: a fixed sum payable on breach, whatever the real loss. The deposit can be kept or is not refundable."),
  c(1, "The Landlord may terminate this Agreement at any time, for any reason, by giving the Tenant seven (7) days written notice.", "TERMINATION", "UNFAVORABLE", "TRM-004", 10, "The landlord can end the agreement at any time or for any reason. Very short notice period (10 days or less)."),
  c(2, "The Tenant is responsible for all repairs and maintenance of the Premises, including structural, plumbing and electrical repairs, regardless of cause.", "OBLIGATION", "UNFAVORABLE", "OBL-005", 8, "The tenant pays for all repairs."),
  c(3, "The Landlord may increase the rent by up to 15% at any time upon fourteen (14) days written notice, including during the fixed term.", "RIGHT", "UNFAVORABLE", "RGT-001", 4, "The other side may raise the rent or fees."),
  c(4, "If rent is not received within three (3) days of the due date, the Tenant shall pay a late fee of 8% of the monthly rent.", "PENALTY", "UNFAVORABLE", "PEN-001", 4, "A late fee or interest is charged if a payment is late."),
  c(5, "The Tenant shall pay monthly rent of INR 32,000 on or before the first day of each month.", "PAYMENT_TERM", "NEUTRAL", "PAY-001", 0, "States when rent or salary is due."),
  c(6, "At the end of the initial term, the Tenant may renew this lease for a further twelve (12) months by giving thirty (30) days written notice.", "TERMINATION", "FAVORABLE", "TRM-012", 0, "Renewal only happens if the tenant or employee chooses it."),
  c(7, "This Agreement may be amended only in writing signed by both parties.", "OTHER", "NEUTRAL", null, 0, "No rule matched this clause, so it was not classified."),
];

const item = (k: ContractClause, i: number): ReportItem => ({
  clause_index: i, text: k.text, rule_id: k.rule_id, score: k.score.auto, label: k.sentiment,
});

export const mockReport: ContractReport = {
  id: "demo-report",
  document_id: "demo",
  summary: "8 clauses (7 matched a rule): 1 obligation, 1 other, 1 payment_term, 2 penalty, 1 right, 2 termination.",
  top_risks: clauses.filter((k) => k.sentiment === "UNFAVORABLE").sort((a, b) => b.score.auto - a.score.auto).slice(0, 5).map((k) => item(k, clauses.indexOf(k))),
  obligations: clauses.filter((k) => k.category === "OBLIGATION" || k.category === "PAYMENT_TERM").map((k) => item(k, clauses.indexOf(k))),
  exit_conditions: clauses.filter((k) => k.category === "TERMINATION").map((k) => item(k, clauses.indexOf(k))),
  clauses,
};

// TODO(backend): no login/auth endpoint exists. Replace with POST /api/auth/login when it is added.
export async function mockLogin(email: string): Promise<{ token: string }> {
  return { token: `mock-token-for-${email}` };
}

// TODO(backend): no lawyer-override endpoint exists. Until then overrides live in this browser only.
export interface Override { score: number; reason: string }
const key = (docId: string) => `overrides:${docId}`;

export function getOverrides(docId: string): Record<string, Override> {
  try {
    return JSON.parse(localStorage.getItem(key(docId)) ?? "{}");
  } catch {
    return {};
  }
}

export function saveOverride(docId: string, clauseId: string, override: Override): void {
  try {
    localStorage.setItem(key(docId), JSON.stringify({ ...getOverrides(docId), [clauseId]: override }));
  } catch {
    throw new Error("This browser blocked local storage, so the override could not be saved.");
  }
}
