import {
  DocumentStatus as PrismaDocumentStatus,
  ClauseCategory as PrismaClauseCategory,
  ClauseSentiment as PrismaClauseSentiment,
  RiskLevel as PrismaRiskLevel,
  DocumentStatus as DocumentStatusEnum,
  ClauseCategory as ClauseCategoryEnum,
  ClauseSentiment as ClauseSentimentEnum,
  RiskLevel as RiskLevelEnum,
} from "../generated/prisma";

export type DocumentStatus = PrismaDocumentStatus;
export type ClauseCategory = PrismaClauseCategory;
export type ClauseSentiment = PrismaClauseSentiment;
export type RiskLevel = PrismaRiskLevel;

export const DocumentStatus = DocumentStatusEnum;
export const ClauseCategory = ClauseCategoryEnum;
export const ClauseSentiment = ClauseSentimentEnum;
export const RiskLevel = RiskLevelEnum;

export interface DocumentWithRelations {
  id: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  status: DocumentStatus;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
  clauses?: ClauseWithRelations[];
  report?: ReportWithRelations | null;
}

export interface ClauseWithRelations {
  id: string;
  documentId: string;
  text: string;
  category: ClauseCategory;
  sentiment: ClauseSentiment;
  riskLevel: RiskLevel;
  explanation: string;
  createdAt: Date;
}

export interface ReportWithRelations {
  id: string;
  documentId: string;
  summary: string;
  topRisks: string[];
  obligations: string[];
  exitConditions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleWithRelations {
  id: string;
  name: string;
  category: ClauseCategory;
  pattern: string;
  riskLevel: RiskLevel;
  sentiment: ClauseSentiment;
  explanation: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedClause {
  text: string;
  category: ClauseCategory;
  sentiment: ClauseSentiment;
  riskLevel: RiskLevel;
  explanation: string;
}

export interface ProcessingResult {
  clauses: ProcessedClause[];
  summary: string;
  topRisks: string[];
  obligations: string[];
  exitConditions: string[];
}

export interface ClauseProcessingEngine {
  processDocument(text: string): Promise<ProcessingResult>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}