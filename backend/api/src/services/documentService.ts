import { prisma, PrismaClient } from "../lib/prisma";
import { extractTextFromFile } from "../lib/fileExtractor";
import { getClauseEngine } from "./clauseEngine";
import {
  DocumentStatus,
  ClauseCategory,
  ClauseSentiment,
  RiskLevel,
  DocumentWithRelations,
  ClauseWithRelations,
  ReportWithRelations,
} from "../types";
import { AppError, NotFoundError } from "../middleware/errorHandler";
import fs from "fs";
import path from "path";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function createDocument(
  fileName: string,
  fileType: string,
  storagePath: string,
  fileSize: number
): Promise<DocumentWithRelations> {
  return prisma.document.create({
    data: {
      fileName,
      fileType,
      storagePath,
      fileSize,
      status: DocumentStatus.UPLOADED,
    },
  });
}

export async function getDocumentById(id: string): Promise<DocumentWithRelations | null> {
  return prisma.document.findUnique({
    where: { id },
    include: {
      clauses: true,
      report: true,
    },
  });
}

export async function getDocuments(
  page: number,
  limit: number,
  status?: DocumentStatus
): Promise<{ data: DocumentWithRelations[]; total: number }> {
  const where = status ? { status } : {};
  const [data, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        clauses: true,
        report: true,
      },
    }),
    prisma.document.count({ where }),
  ]);
  return { data, total };
}

export async function getDocumentClauses(id: string): Promise<ClauseWithRelations[]> {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    throw new NotFoundError("Document", id);
  }
  return prisma.clause.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
  });
}

export async function getDocumentReport(id: string): Promise<ReportWithRelations | null> {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    throw new NotFoundError("Document", id);
  }
  return prisma.report.findUnique({ where: { documentId: id } });
}

export async function processDocument(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new NotFoundError("Document", documentId);
  }

  if (document.status === DocumentStatus.PROCESSING) {
    throw new AppError(409, "Document is already being processed");
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: DocumentStatus.PROCESSING },
  });

  try {
    const text = await extractTextFromFile(document.storagePath);
    if (!text.trim()) {
      throw new AppError(400, "No text could be extracted from the document");
    }

    const engine = getClauseEngine();
    const result = await engine.processDocument(text);

    await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.clause.createMany({
        data: result.clauses.map((c) => ({
          documentId,
          text: c.text,
          category: c.category,
          sentiment: c.sentiment,
          riskLevel: c.riskLevel,
          explanation: c.explanation,
        })),
      });

      await tx.report.create({
        data: {
          documentId,
          summary: result.summary,
          topRisks: result.topRisks,
          obligations: result.obligations,
          exitConditions: result.exitConditions,
        },
      });

      await tx.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.COMPLETED },
      });
    });
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.FAILED },
    });

    if (error instanceof AppError) throw error;
    throw new AppError(500, "Document processing failed", error);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    throw new NotFoundError("Document", id);
  }

  try {
    if (fs.existsSync(document.storagePath)) {
      fs.unlinkSync(document.storagePath);
    }
  } catch {
    // Ignore file deletion errors
  }

  await prisma.document.delete({ where: { id } });
}