import { Request, Response, NextFunction } from "express";
import {
  createDocument,
  getDocumentById,
  getDocuments,
  getDocumentClauses,
  getDocumentReport,
  processDocument,
  deleteDocument,
} from "../services/documentService";
import { AppError } from "../middleware/errorHandler";

function getIdParam(req: Request): string {
  const id = req.params.id;
  if (Array.isArray(id)) throw new AppError(400, "Invalid ID parameter");
  return id;
}

export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      throw new AppError(400, "No file uploaded");
    }

    const document = await createDocument(
      req.file.originalname,
      req.file.mimetype,
      req.file.path,
      req.file.size
    );

    res.status(201).json({
      id: document.id,
      fileName: document.fileName,
      status: document.status,
      message: "Document uploaded successfully. Use POST /api/documents/:id/process to start processing.",
    });
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        const fs = await import("fs");
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch {
        // Ignore cleanup errors
      }
    }
    next(error);
  }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt((req.query.page as string) || "1") || 1;
    const limit = parseInt((req.query.limit as string) || "20") || 20;
    const status = req.query.status as string | undefined;

    const { data, total } = await getDocuments(page, limit, status as any);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getIdParam(req);
    const document = await getDocumentById(id);
    if (!document) {
      throw new AppError(404, "Document not found");
    }
    res.json(document);
  } catch (error) {
    next(error);
  }
}

export async function getClauses(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getIdParam(req);
    const clauses = await getDocumentClauses(id);
    res.json(clauses);
  } catch (error) {
    next(error);
  }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getIdParam(req);
    const report = await getDocumentReport(id);
    if (!report) {
      throw new AppError(404, "Report not found for this document");
    }
    res.json(report);
  } catch (error) {
    next(error);
  }
}

export async function processDocumentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = getIdParam(req);
    await processDocument(id);
    const document = await getDocumentById(id);
    res.json({
      message: "Document processed successfully",
      document,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocumentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = getIdParam(req);
    await deleteDocument(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}