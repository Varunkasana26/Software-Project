import { z } from "zod";
import { ClauseCategory, ClauseSentiment, DocumentStatus } from "../types";

export const documentIdParamSchema = z.object({ id: z.string().uuid("Invalid document ID format") });
export const clauseIdParamSchema = z.object({ id: z.string().uuid("Invalid clause ID format") });
export const ruleIdParamSchema = z.object({ id: z.string().uuid("Invalid rule ID format") });

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(DocumentStatus).optional(),
});

export const ruleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// .strict(): unknown fields are rejected, so a caller cannot set id, createdAt or anything else not listed here.
const ruleFields = {
  ruleId: z.string().regex(/^[A-Za-z0-9_-]{2,40}$/, "ruleId: 2-40 letters, digits, - or _"),
  name: z.string().min(1, "Name is required").max(255),
  category: z.nativeEnum(ClauseCategory),
  // The patterns are checked for real by core (same loader as the analysis) when the rule is saved.
  patterns: z.array(z.string().min(1).max(500)).min(1, "At least one pattern is required").max(10),
  severityWeight: z.number().int().min(1).max(5),
  partyEffectHint: z.nativeEnum(ClauseSentiment),
  explanation: z.string().min(1, "Explanation is required").max(2000),
  justification: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
};
export const ruleCreateSchema = z.object(ruleFields).strict();
export const ruleUpdateSchema = z.object(ruleFields).partial().strict();

export const authSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
}).strict();

export const overrideSchema = z.object({
  score: z.number().min(0).max(10),
  reason: z.string().trim().min(1, "A reason is required").max(1000),
}).strict();

export type RuleCreateInput = z.infer<typeof ruleCreateSchema>;
export type RuleUpdateInput = z.infer<typeof ruleUpdateSchema>;
