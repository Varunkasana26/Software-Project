import { vi } from "vitest";
import { createMemoryPrisma } from "../src/lib/memoryDb";
import { signToken } from "../src/middleware/auth";

export const db = createMemoryPrisma();
export const analyzeFile = vi.fn();
export const validateRules = vi.fn(async () => [] as { rule_id: string; message: string }[]);

export async function makeUser(role: "USER" | "LAWYER" | "ADMIN", email = `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}@example.com`) {
  const user = await db.user.create({ data: { email, passwordHash: "x", role } });
  return { user, auth: { Authorization: `Bearer ${signToken({ id: user.id, email, role })}` } };
}

// What core returns for a small contract (shape of shared/contracts/report.schema.json).
export const coreReport = {
  summary: "2 clauses (2 matched a rule): 1 penalty, 1 termination.",
  top_risks: [{ clause_index: 0, text: "The deposit is non-refundable.", rule_id: "PEN-008", score: 8, label: "UNFAVORABLE" }],
  obligations: [],
  exit_conditions: [{ clause_index: 1, text: "Either party may terminate on 60 days notice.", rule_id: "TRM-002", score: 0, label: "NEUTRAL" }],
  clauses: [
    { id: "c0", index: 0, heading: "DEPOSIT", text: "The deposit is non-refundable.", category: "PENALTY", sentiment: "UNFAVORABLE", rule_id: "PEN-008", matched_rule_ids: ["PEN-008"], score: { auto: 8, lawyer_override: null }, explanation: "The deposit can be kept." },
    { id: "c1", index: 1, heading: "TERMINATION", text: "Either party may terminate on 60 days notice.", category: "TERMINATION", sentiment: "NEUTRAL", rule_id: "TRM-002", matched_rule_ids: ["TRM-002"], score: { auto: 0, lawyer_override: null }, explanation: "A notice period." },
  ],
  warnings: [],
};

/** Creates a document row for `ownerId`. The file itself is not needed because core is mocked. */
export const makeDoc = (ownerId: string, extra: Record<string, unknown> = {}) =>
  db.document.create({ data: { ownerId, fileName: "a.txt", fileType: "text/plain", storagePath: "uploads/none.txt", fileSize: 10, party: "tenant", ...extra } });

/** A finished analysis stored for a document, as processDocument would store it. */
export async function storeAnalysis(documentId: string) {
  for (const c of coreReport.clauses) {
    await db.clause.create({ data: { documentId, index: c.index, heading: c.heading, text: c.text, category: c.category, sentiment: c.sentiment, ruleId: c.rule_id, matchedRuleIds: c.matched_rule_ids, autoScore: c.score.auto, explanation: c.explanation } });
  }
  await db.report.create({ data: { documentId, summary: coreReport.summary, topRisks: coreReport.top_risks, obligations: [], exitConditions: coreReport.exit_conditions } });
}
