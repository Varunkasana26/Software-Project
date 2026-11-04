// Turns database rows into the shapes of shared/contracts (snake_case), so the API returns a Report that
// validates against report.schema.json.
import type { CoreItem } from "./coreClient";

interface ClauseRow {
  id: string; documentId: string; index: number; heading: string; text: string; category: string; sentiment: string;
  ruleId: string | null; matchedRuleIds: string[]; autoScore: number; lawyerOverride: number | null;
  lawyerOverrideReason: string | null; overriddenAt: Date | null; warning: string | null; explanation: string;
}
interface DocRow { id: string; fileName: string; fileType: string; fileSize: number; status: string; party: string; failureCode: string | null; createdAt: Date }
interface ReportRow { id: string; summary: string; topRisks: unknown; obligations: unknown; exitConditions: unknown; warnings: string[] }

export function documentView(d: DocRow) {
  // storagePath and ownerId stay on the server.
  return { id: d.id, fileName: d.fileName, fileType: d.fileType, fileSize: d.fileSize, status: d.status, party: d.party, failureCode: d.failureCode, createdAt: d.createdAt };
}

export function clauseView(c: ClauseRow) {
  return {
    id: c.id,
    document_id: c.documentId,
    index: c.index,
    heading: c.heading,
    text: c.text,
    category: c.category,
    sentiment: c.sentiment,
    rule_id: c.ruleId,
    matched_rule_ids: c.matchedRuleIds,
    score: { auto: c.autoScore, lawyer_override: c.lawyerOverride },
    lawyer_override_reason: c.lawyerOverrideReason,
    overridden_at: c.overriddenAt ? c.overriddenAt.toISOString() : null,
    warning: c.warning,
    explanation: c.explanation,
  };
}

export function reportView(doc: DocRow, report: ReportRow, clauses: ClauseRow[]) {
  // The stored report items keep the automatic score. Show a lawyer's override where there is one.
  const override = new Map(clauses.filter((c) => c.lawyerOverride !== null).map((c) => [c.index, c.lawyerOverride as number]));
  const show = (items: unknown): CoreItem[] =>
    (items as CoreItem[]).map((i) => (override.has(i.clause_index) ? { ...i, score: override.get(i.clause_index) as number } : i));
  return {
    id: report.id,
    document_id: doc.id,
    summary: report.summary,
    top_risks: show(report.topRisks),
    obligations: show(report.obligations),
    exit_conditions: show(report.exitConditions),
    clauses: [...clauses].sort((a, b) => a.index - b.index).map(clauseView),
    warnings: report.warnings,
  };
}
