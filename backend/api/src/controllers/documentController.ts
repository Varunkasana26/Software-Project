import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  createDocument, deleteDocument, documentView, getAccessibleDocument, getClauses, getReportView, listDocuments, processDocument,
} from "../services/documentService";
import { AuthUser } from "../types";

const user = (req: Request): AuthUser => req.user as AuthUser; // set by authenticate
const idOf = (req: Request): string => {
  const id = req.params.id;
  if (Array.isArray(id)) throw new AppError(400, "Invalid ID parameter", "VALIDATION_FAILED");
  return id;
};

export async function uploadDocument(req: Request, res: Response) {
  if (!req.file) throw new AppError(400, "No file uploaded.", "NO_FILE");
  // The side the user is on. Letters only; core treats an unknown value as "no side" and warns.
  const party = String(req.body?.party ?? "").trim().toLowerCase();
  const doc = await createDocument(user(req), req.file, /^[a-z]{0,30}$/.test(party) ? party : "");
  res.status(201).json({ id: doc.id, fileName: doc.fileName, status: doc.status, party: doc.party, message: "Document uploaded. Use POST /api/documents/:id/process to analyze it." });
}

export async function list(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const { data, total } = await listDocuments(user(req), page, limit, req.query.status as never);
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function getOne(req: Request, res: Response) {
  res.json(documentView(await getAccessibleDocument(idOf(req), user(req))));
}

export async function clauses(req: Request, res: Response) {
  res.json(await getClauses(await getAccessibleDocument(idOf(req), user(req))));
}

export async function report(req: Request, res: Response) {
  res.json(await getReportView(await getAccessibleDocument(idOf(req), user(req))));
}

export async function process_(req: Request, res: Response) {
  const doc = await getAccessibleDocument(idOf(req), user(req), { write: true });
  await processDocument(doc);
  const fresh = await getAccessibleDocument(doc.id, user(req), { write: true });
  res.json({ message: "Document analyzed.", document: documentView(fresh), report: await getReportView(fresh) });
}

export async function remove(req: Request, res: Response) {
  await deleteDocument(await getAccessibleDocument(idOf(req), user(req), { write: true }));
  res.status(204).send();
}
