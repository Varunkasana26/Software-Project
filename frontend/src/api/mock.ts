// Demo-mode data. Used ONLY in development when VITE_DEMO_MODE=true (see client.ts); production builds never use it.
// Shapes follow shared/contracts/report.schema.json and clause.schema.json.
export interface ContractClause {
  id: string;
  document_id: string;
  index: number;
  heading?: string;
  text: string;
  category: string;
  sentiment: "FAVORABLE" | "UNFAVORABLE" | "NEUTRAL";
  rule_id: string | null;
  matched_rule_ids?: string[];
  score: { auto: number; lawyer_override: number | null };
  lawyer_override_reason?: string | null;
  warning?: string | null;
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
  warnings?: string[];
}

const c = (
  index: number, text: string, category: string, sentiment: ContractClause["sentiment"],
  rule_id: string | null, auto: number, explanation: string,
): ContractClause => ({
  id: `demo-c${index}`, document_id: "demo", index, text, category, sentiment, rule_id,
  score: { auto, lawyer_override: null }, explanation,
});

const clauses: ContractClause[] = [
  c(0, "The deposit is non-refundable if the Tenant vacates before the end of the fixed term, and the Landlord may retain the entire deposit as liquidated damages.", "PENALTY", "UNFAVORABLE", "PEN-004", 10, "Liquidated damages: a fixed sum payable on breach, whatever the real loss. The deposit can be kept or is not refundable."),
  c(1, "The Landlord may terminate this Agreement at any time, for any reason, by giving the Tenant seven (7) days written notice.", "TERMINATION", "UNFAVORABLE", "TRM-004", 10, "The landlord can end the agreement at any time or for any reason. Very short notice period (10 days or less)."),
  c(2, "The Tenant is responsible for all repairs and maintenance of the Premises, including structural, plumbing and electrical repairs, regardless of cause.", "OBLIGATION", "UNFAVORABLE", "OBL-005", 8, "The tenant pays for all repairs."),
  c(3, "The Landlord may increase the rent by up to 15% at any time upon fourteen (14) days written notice, including during the fixed term.", "RIGHT", "UNFAVORABLE", "RGT-001", 4, "The other side may raise the rent or fees."),
  c(4, "The Tenant shall pay monthly rent of INR 32,000 on or before the first day of each month.", "PAYMENT_TERM", "NEUTRAL", "PAY-001", 0, "States when rent or salary is due."),
  c(5, "This Agreement may be amended only in writing signed by both parties.", "OTHER", "NEUTRAL", null, 0, "No rule matched this clause, so it was not classified."),
];

const item = (k: ContractClause): ReportItem => ({ clause_index: k.index, text: k.text, rule_id: k.rule_id, score: k.score.auto, label: k.sentiment });

export const mockReport: ContractReport = {
  id: "demo-report",
  document_id: "demo",
  summary: "6 clauses (5 matched a rule): 1 obligation, 1 other, 1 payment_term, 1 penalty, 1 right, 1 termination.",
  top_risks: clauses.filter((k) => k.sentiment === "UNFAVORABLE").sort((a, b) => b.score.auto - a.score.auto).slice(0, 5).map(item),
  obligations: clauses.filter((k) => k.category === "OBLIGATION" || k.category === "PAYMENT_TERM").map(item),
  exit_conditions: clauses.filter((k) => k.category === "TERMINATION").map(item),
  clauses,
  warnings: [],
};

// Demo-only override store (browser). Real overrides go to PATCH /api/clauses/:id/override.
export interface Override { score: number; reason: string }
const key = "demo-overrides";

export function getDemoOverrides(): Record<string, Override> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

export function saveDemoOverride(clauseId: string, override: Override | null): void {
  const all = getDemoOverrides();
  if (override) all[clauseId] = override;
  else delete all[clauseId];
  localStorage.setItem(key, JSON.stringify(all));
}
