// Mock data shaped like shared/contracts/report.schema.json.
export interface ContractClause {
  id: string;
  document_id: string;
  text: string;
  category: string;
  sentiment: string;
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

export const mockReport: ContractReport = {
  id: "demo-report",
  document_id: "demo",
  summary: "Demo report (mock data).",
  top_risks: [
    { clause_index: 0, text: "Tenant is liable for all repairs.", rule_id: "OBL-005", score: 8, label: "UNFAVORABLE" },
    { clause_index: 3, text: "Deposit is non-refundable.", rule_id: "PEN-008", score: 8, label: "UNFAVORABLE" },
    { clause_index: 2, text: "Rent may increase with 7 days notice.", rule_id: "RGT-001", score: 4, label: "UNFAVORABLE" },
  ],
  obligations: [
    { clause_index: 0, text: "Tenant is liable for all repairs.", rule_id: "OBL-005", score: 8, label: "UNFAVORABLE" },
  ],
  exit_conditions: [
    { clause_index: 1, text: "Either party may terminate with 30 days written notice.", rule_id: "TRM-002", score: 0, label: "NEUTRAL" },
  ],
  clauses: [
    {
      id: "c1",
      document_id: "demo",
      text: "Tenant is liable for all repairs.",
      category: "OBLIGATION",
      sentiment: "UNFAVORABLE",
      rule_id: "rule-repairs-1",
      score: { auto: 8, lawyer_override: null },
      explanation: "Broad repair liability.",
    },
    {
      id: "c2",
      document_id: "demo",
      text: "Either party may terminate with 30 days written notice.",
      category: "TERMINATION",
      sentiment: "NEUTRAL",
      rule_id: null,
      score: { auto: 2, lawyer_override: null },
      explanation: "Standard termination clause.",
    },
  ],
};

// TODO(backend): no login/auth endpoint exists. Replace with POST /api/auth/login when it is added.
export async function mockLogin(email: string): Promise<{ token: string }> {
  return { token: `mock-token-for-${email}` };
}
