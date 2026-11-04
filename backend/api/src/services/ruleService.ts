// Classification rules live in the database (source of truth). The backend seeds the table from core/rules/rules.json
// when it is empty and sends the active rules to core with every analysis, so an admin's change takes effect on the
// next analysis.
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { getConfig } from "../config/env";
import { AppError, NotFoundError } from "../middleware/errorHandler";
import { ClauseCategory, ClauseSentiment } from "../types";
import { CoreRule, validateRules } from "./coreClient";

// Core breaks ties between equally strong rules by their order, so the order is kept: category block, then position.
const CATEGORY_ORDER = ["PENALTY", "RIGHT", "TERMINATION", "PAYMENT_TERM", "OBLIGATION", "OTHER"];

interface RuleRow {
  id: string; ruleId: string; name: string; category: ClauseCategory; patterns: string[]; severityWeight: number; position: number;
  partyEffectHint: ClauseSentiment; explanation: string; justification: string; isActive: boolean; createdAt: Date; updatedAt: Date;
}

export type RuleInput = {
  ruleId: string; name: string; category: ClauseCategory; patterns: string[]; severityWeight: number;
  partyEffectHint: ClauseSentiment; explanation: string; justification?: string; isActive?: boolean;
};

export const toCoreRule = (r: RuleRow): CoreRule => ({
  rule_id: r.ruleId, category: r.category.toLowerCase(), patterns: r.patterns, severity_weight: r.severityWeight,
  party_effect_hint: r.partyEffectHint.toLowerCase(), explanation: r.explanation, justification: r.justification,
});

export async function getActiveCoreRules(): Promise<CoreRule[]> {
  const rows = (await prisma.rule.findMany({ where: { isActive: true } })) as RuleRow[];
  rows.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.position - b.position);
  return rows.map(toCoreRule);
}

async function assertValid(rule: CoreRule) {
  const problems = await validateRules([rule]);
  if (problems.length) throw new AppError(400, problems[0].message, "INVALID_RULE");
}

export async function createRule(data: RuleInput): Promise<RuleRow> {
  const last = await prisma.rule.findFirst({ orderBy: { position: "desc" } });
  const row = { ...data, justification: data.justification ?? "", isActive: data.isActive ?? true, position: (last?.position ?? 0) + 1 };
  await assertValid(toCoreRule({ ...row, id: "", createdAt: new Date(), updatedAt: new Date() }));
  return prisma.rule.create({ data: row });
}

export async function getRules(page: number, limit: number): Promise<{ data: RuleRow[]; total: number }> {
  const [data, total] = await Promise.all([
    prisma.rule.findMany({ orderBy: [{ position: "asc" }], skip: (page - 1) * limit, take: limit }),
    prisma.rule.count(),
  ]);
  return { data, total };
}

export async function getRuleById(id: string): Promise<RuleRow | null> {
  return prisma.rule.findUnique({ where: { id } });
}

export async function updateRule(id: string, patch: Partial<RuleInput>): Promise<RuleRow> {
  const existing = await prisma.rule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Rule");
  await assertValid(toCoreRule({ ...existing, ...patch } as RuleRow)); // check the merged rule, not just the changed fields
  return prisma.rule.update({ where: { id }, data: patch });
}

export async function deleteRule(id: string): Promise<void> {
  const existing = await prisma.rule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Rule");
  await prisma.rule.delete({ where: { id } });
}

/** Fills an empty rules table from core/rules/rules.json. Never overwrites existing rules. */
export async function seedRulesIfEmpty(): Promise<number> {
  if ((await prisma.rule.count()) > 0) return 0;
  const file = path.resolve(process.cwd(), getConfig().RULES_SEED_PATH);
  if (!fs.existsSync(file)) {
    console.warn(`Rules table is empty and the seed file was not found at ${file}. Add rules in the admin screen.`);
    return 0;
  }
  const seed = JSON.parse(fs.readFileSync(file, "utf-8")).rules as Array<Record<string, unknown>>;
  await prisma.rule.createMany({
    data: seed.map((r, i) => ({
      ruleId: String(r.rule_id),
      name: String(r.explanation).slice(0, 80),
      category: String(r.category).toUpperCase() as ClauseCategory,
      patterns: r.patterns as string[],
      severityWeight: Number(r.severity_weight),
      position: i + 1,
      partyEffectHint: String(r.party_effect_hint).toUpperCase() as ClauseSentiment,
      explanation: String(r.explanation),
      justification: String(r.justification ?? ""),
      isActive: true,
    })),
  });
  return seed.length;
}
