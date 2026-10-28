import { prisma } from "../lib/prisma";
import {
  ClauseCategory,
  ClauseSentiment,
  RiskLevel,
  RuleWithRelations,
} from "../types";
import { NotFoundError } from "../middleware/errorHandler";

export async function createRule(data: {
  name: string;
  category: ClauseCategory;
  pattern: string;
  riskLevel: RiskLevel;
  sentiment: ClauseSentiment;
  explanation: string;
  isActive?: boolean;
}): Promise<RuleWithRelations> {
  return prisma.rule.create({ data });
}

export async function getRules(
  page: number,
  limit: number,
  category?: ClauseCategory,
  isActive?: boolean
): Promise<{ data: RuleWithRelations[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive;

  const [data, total] = await Promise.all([
    prisma.rule.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.rule.count({ where }),
  ]);
  return { data, total };
}

export async function getRuleById(id: string): Promise<RuleWithRelations | null> {
  return prisma.rule.findUnique({ where: { id } });
}

export async function updateRule(
  id: string,
  data: Partial<{
    name: string;
    category: ClauseCategory;
    pattern: string;
    riskLevel: RiskLevel;
    sentiment: ClauseSentiment;
    explanation: string;
    isActive: boolean;
  }>
): Promise<RuleWithRelations> {
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule) {
    throw new NotFoundError("Rule", id);
  }
  return prisma.rule.update({ where: { id }, data });
}

export async function deleteRule(id: string): Promise<void> {
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule) {
    throw new NotFoundError("Rule", id);
  }
  await prisma.rule.delete({ where: { id } });
}