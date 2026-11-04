import {
  ClauseCategory as ClauseCategoryEnum,
  ClauseSentiment as ClauseSentimentEnum,
  DocumentStatus as DocumentStatusEnum,
  Role as RoleEnum,
} from "../generated/prisma";

export type DocumentStatus = DocumentStatusEnum;
export type ClauseCategory = ClauseCategoryEnum;
export type ClauseSentiment = ClauseSentimentEnum;
export type Role = RoleEnum;

export const DocumentStatus = DocumentStatusEnum;
export const ClauseCategory = ClauseCategoryEnum;
export const ClauseSentiment = ClauseSentimentEnum;
export const Role = RoleEnum;

/** The signed-in user, taken from the verified token. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
