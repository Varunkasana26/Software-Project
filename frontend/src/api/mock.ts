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

export interface ContractReport {
  id: string;
  document_id: string;
  summary: string;
  top_risks: string[];
  obligations: string[];
  exit_conditions: string[];
  clauses: ContractClause[];
}

export const mockReport: ContractReport = {
  id: "demo-report",
  document_id: "demo",
  summary: "Demo report (mock data).",
  top_risks: [
    "Tenant is liable for all repairs.",
    "Rent may increase with 7 days notice.",
    "Deposit is non-refundable.",
  ],
  obligations: ["Tenant shall pay rent monthly.", "Landlord must provide working utilities."],
  exit_conditions: ["Either party may terminate with 30 days written notice."],
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
