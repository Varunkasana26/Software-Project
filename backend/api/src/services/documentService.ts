import fs from "fs";
import { Prisma } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { AppError, NotFoundError } from "../middleware/errorHandler";
import { AuthUser, ClauseCategory, ClauseSentiment, DocumentStatus, Role } from "../types";
import { analyzeFile } from "./coreClient";
import { getActiveCoreRules } from "./ruleService";
import { clauseView, documentView, reportView } from "./serialize";

const STALE_LOCK_MS = 5 * 60 * 1000; // a document stuck in PROCESSING longer than this can be processed again

interface DocumentRow { id: string; ownerId: string; fileName: string; fileType: string; storagePath: string; fileSize: number; status: string; party: string; failureCode: string | null; createdAt: Date }

/**
 * The only access rule for documents. The owner can do everything. A lawyer can read (and override scores) because
 * review is their job. An admin manages rules and users and cannot read documents. A document the caller may not
 * see is reported as "not found", so its existence is not revealed.
 */
export async function getAccessibleDocument(id: string, user: AuthUser, opts: { write?: boolean } = {}): Promise<DocumentRow> {
  const doc = (await prisma.document.findUnique({ where: { id } })) as DocumentRow | null;
  const isOwner = doc?.ownerId === user.id;
  const mayRead = isOwner || user.role === Role.LAWYER;
  if (!doc || !(opts.write ? isOwner : mayRead)) throw new NotFoundError("Document");
  // A lawyer sees a document only when its owner asked for advice on at least one clause.
  if (!isOwner && !(await prisma.clause.count({ where: { documentId: id, adviceRequested: true } }))) throw new NotFoundError("Document");
  return doc;
}

export async function createDocument(user: AuthUser, file: { originalname: string; mimetype: string; path: string; size: number }, party: string) {
  const doc = await prisma.document.create({
    data: { ownerId: user.id, fileName: file.originalname, fileType: file.mimetype, storagePath: file.path, fileSize: file.size, party, status: DocumentStatus.UPLOADED },
  });
  return documentView(doc);
}

export async function listDocuments(user: AuthUser, page: number, limit: number, status?: DocumentStatus) {
  let advice: { OR: { id: string }[] } | Record<string, never> = {};
  if (user.role === Role.LAWYER) {
    const asked = (await prisma.clause.findMany({ where: { adviceRequested: true } })) as { documentId: string }[];
    advice = { OR: [...new Set(asked.map((c) => c.documentId))].map((id) => ({ id })) }; // only documents with a requested clause
  }
  const where = { ...(user.role === Role.LAWYER ? advice : { ownerId: user.id }), ...(status ? { status } : {}) };
  const [rows, total] = await Promise.all([
    prisma.document.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.document.count({ where }),
  ]);
  return { data: rows.map(documentView), total };
}

const lawyerView = (doc: DocumentRow, user?: AuthUser) => !!user && user.role === Role.LAWYER && doc.ownerId !== user.id;

export async function getClauses(doc: DocumentRow, user?: AuthUser) {
  const clauses = await prisma.clause.findMany({ where: { documentId: doc.id }, orderBy: { index: "asc" } });
  return clauses.filter((c: { adviceRequested?: boolean }) => !lawyerView(doc, user) || c.adviceRequested === true).map(clauseView);
}

/** The owner asks for a lawyer's advice on one clause. Only then does it appear on the lawyer side. */
export async function requestAdvice(doc: DocumentRow, clauseId: string) {
  const clause = await prisma.clause.findFirst({ where: { id: clauseId, documentId: doc.id } });
  if (!clause) throw new NotFoundError("Clause");
  return clauseView(await prisma.clause.update({ where: { id: clauseId }, data: { adviceRequested: true, adviceRequestedAt: new Date() } }));
}

export async function getReportView(doc: DocumentRow, user?: AuthUser) {
  const report = await prisma.report.findUnique({ where: { documentId: doc.id } });
  if (!report) throw new AppError(404, "Report not found for this document. Process the document first.", "NO_REPORT");
  let clauses = await prisma.clause.findMany({ where: { documentId: doc.id } });
  if (lawyerView(doc, user)) {
    clauses = clauses.filter((c: { adviceRequested?: boolean }) => c.adviceRequested === true); // a lawyer sees only the clauses asked about
    return reportView(doc, report, clauses, new Set(clauses.map((c: { index: number }) => c.index)));
  }
  return reportView(doc, report, clauses);
}

export async function processDocument(doc: DocumentRow): Promise<void> {
  // Take the lock in one statement, so two requests cannot both start.
  const lock = await prisma.document.updateMany({
    where: { id: doc.id, OR: [{ status: { not: DocumentStatus.PROCESSING } }, { updatedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) } }] },
    data: { status: DocumentStatus.PROCESSING, failureCode: null },
  });
  if (lock.count === 0) throw new AppError(409, "Document is already being processed.", "ALREADY_PROCESSING");

  try {
    const rules = await getActiveCoreRules();
    const result = await analyzeFile({ filePath: doc.storagePath, party: doc.party, rules });
    const clauses = result.clauses.map((c, i) => ({
      documentId: doc.id,
      index: c.index ?? i,
      heading: c.heading ?? "",
      text: c.text,
      category: c.category as ClauseCategory,
      sentiment: c.sentiment as ClauseSentiment,
      ruleId: c.rule_id,
      matchedRuleIds: c.matched_rule_ids ?? (c.rule_id ? [c.rule_id] : []),
      autoScore: c.score.auto, // the automatic score is stored once and never changed by a lawyer's override
      warning: c.warning ?? null,
      explanation: c.explanation,
    }));
    await prisma.$transaction(async (tx) => {
      // Re-processing replaces the old analysis (and any lawyer overrides on it).
      await tx.clause.deleteMany({ where: { documentId: doc.id } });
      await tx.report.deleteMany({ where: { documentId: doc.id } });
      await tx.clause.createMany({ data: clauses });
      await tx.report.create({
        data: {
          documentId: doc.id, summary: result.summary, topRisks: result.top_risks as unknown as Prisma.InputJsonValue, obligations: result.obligations as unknown as Prisma.InputJsonValue,
          exitConditions: result.exit_conditions as unknown as Prisma.InputJsonValue, warnings: result.warnings ?? [],
        },
      });
      await tx.document.update({ where: { id: doc.id }, data: { status: DocumentStatus.COMPLETED, failureCode: null } });
    });
  } catch (error) {
    const code = error instanceof AppError ? error.code ?? "FAILED" : "FAILED";
    await prisma.document.update({ where: { id: doc.id }, data: { status: DocumentStatus.FAILED, failureCode: code } });
    throw error;
  }
}

export async function deleteDocument(doc: DocumentRow): Promise<void> {
  fs.rmSync(doc.storagePath, { force: true });
  await prisma.document.delete({ where: { id: doc.id } });
}

export { documentView };
