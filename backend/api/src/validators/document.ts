import { z } from "zod";
import { DocumentStatus, ClauseCategory, ClauseSentiment, RiskLevel } from "../types";

export const createDocumentSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.enum(["application/pdf", "text/plain"]),
  fileSize: z.number().positive("File size must be positive"),
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid("Invalid document ID format"),
});

export const documentQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  status: z.nativeEnum(DocumentStatus).optional(),
});

export const ruleCreateSchema = z.object({
  name: z.string().min(1, "Rule name is required").max(255),
  category: z.nativeEnum(ClauseCategory),
  pattern: z.string().min(1, "Pattern is required"),
  riskLevel: z.nativeEnum(RiskLevel),
  sentiment: z.nativeEnum(ClauseSentiment),
  explanation: z.string().min(1, "Explanation is required"),
  isActive: z.boolean().default(true),
});

export const ruleUpdateSchema = ruleCreateSchema.partial();

export const ruleIdParamSchema = z.object({
  id: z.string().uuid("Invalid rule ID format"),
});

export const ruleQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  category: z.nativeEnum(ClauseCategory).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type DocumentIdParam = z.infer<typeof documentIdParamSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
export type RuleCreateInput = z.infer<typeof ruleCreateSchema>;
export type RuleUpdateInput = z.infer<typeof ruleUpdateSchema>;
export type RuleIdParam = z.infer<typeof ruleIdParamSchema>;
export type RuleQuery = z.infer<typeof ruleQuerySchema>;