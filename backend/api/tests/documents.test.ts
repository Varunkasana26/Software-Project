import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { errorHandler, notFoundHandler } from "../src/middleware/errorHandler";
import { getConfig } from "../src/config/env";

const mockPrisma = {
  document: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  clause: {
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  report: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../src/services/documentService", () => ({
  createDocument: vi.fn(),
  getDocumentById: vi.fn(),
  getDocuments: vi.fn(),
  getDocumentClauses: vi.fn(),
  getDocumentReport: vi.fn(),
  processDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

vi.mock("../src/services/clauseEngine", () => ({
  getClauseEngine: vi.fn(() => ({
    processDocument: vi.fn().mockResolvedValue({
      clauses: [],
      summary: "Mock summary",
      topRisks: [],
      obligations: [],
      exitConditions: [],
    }),
  })),
  setClauseEngine: vi.fn(),
}));

const testConfig = getConfig();

const allowedMimeTypes = ["application/pdf", "text/plain"];

function fileFilter(
  _req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and plain text files are allowed"));
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = testConfig.UPLOAD_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const testUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: testConfig.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

function handleMulterError(
  err: Error,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File too large. Maximum size is ${testConfig.MAX_FILE_SIZE_MB}MB`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message === "Only PDF and plain text files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

vi.mock("../src/middleware/upload", () => ({
  upload: testUpload,
  handleMulterError,
}));

describe("Document Endpoints", () => {
  let app: express.Express;
  const testUploadDir = "test_uploads";

  beforeEach(async () => {
    vi.resetModules();
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }

    const { default: documentRoutes } = await import("../src/routes/documents");
    app = express();
    app.use(express.json());
    app.use("/api/documents", documentRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterEach(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  describe("POST /api/documents", () => {
    it("rejects request without file", async () => {
      const res = await request(app).post("/api/documents");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No file uploaded");
    });

    it("rejects unsupported file types", async () => {
      const res = await request(app)
        .post("/api/documents")
        .attach("file", Buffer.from("test"), "test.docx");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Only PDF and plain text files are allowed");
    });
  });

  describe("GET /api/documents", () => {
    it("returns paginated list of documents", async () => {
      const { getDocuments } = await import("../src/services/documentService");
      vi.mocked(getDocuments).mockResolvedValue({
        data: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            fileName: "test.pdf",
            fileType: "application/pdf",
            storagePath: "uploads/test.pdf",
            status: "UPLOADED",
            fileSize: 1024,
            createdAt: new Date(),
            updatedAt: new Date(),
            clauses: [],
            report: null,
          },
        ],
        total: 1,
      });

      const res = await request(app).get("/api/documents");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
    });
  });

  describe("GET /api/documents/:id", () => {
    it("returns 404 for non-existent document", async () => {
      const { getDocumentById } = await import("../src/services/documentService");
      vi.mocked(getDocumentById).mockResolvedValue(null);

      const res = await request(app).get("/api/documents/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Document not found");
    });

    it("returns document when found", async () => {
      const { getDocumentById } = await import("../src/services/documentService");
      vi.mocked(getDocumentById).mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        fileName: "test.pdf",
        fileType: "application/pdf",
        storagePath: "uploads/test.pdf",
        status: "COMPLETED",
        fileSize: 1024,
        createdAt: new Date(),
        updatedAt: new Date(),
        clauses: [],
        report: null,
      });

      const res = await request(app).get("/api/documents/11111111-1111-1111-1111-111111111111");
      expect(res.status).toBe(200);
      expect(res.body.fileName).toBe("test.pdf");
    });
  });

  describe("GET /api/documents/:id/clauses", () => {
    it("returns 404 for non-existent document", async () => {
      const { getDocumentClauses } = await import("../src/services/documentService");
      vi.mocked(getDocumentClauses).mockRejectedValue({
        statusCode: 404,
        message: "Document not found",
      });

      const res = await request(app).get("/api/documents/00000000-0000-0000-0000-000000000000/clauses");
      expect(res.status).toBe(404);
    });

    it("returns clauses for existing document", async () => {
      const { getDocumentClauses } = await import("../src/services/documentService");
      vi.mocked(getDocumentClauses).mockResolvedValue([
        {
          id: "1",
          documentId: "11111111-1111-1111-1111-111111111111",
          text: "Test clause",
          category: "OBLIGATION",
          sentiment: "NEUTRAL",
          riskLevel: "LOW",
          explanation: "Test explanation",
          createdAt: new Date(),
        },
      ]);

      const res = await request(app).get("/api/documents/11111111-1111-1111-1111-111111111111/clauses");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("GET /api/documents/:id/report", () => {
    it("returns 404 when report not found", async () => {
      const { getDocumentReport } = await import("../src/services/documentService");
      vi.mocked(getDocumentReport).mockResolvedValue(null);

      const res = await request(app).get("/api/documents/11111111-1111-1111-1111-111111111111/report");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Report not found for this document");
    });

    it("returns report when exists", async () => {
      const { getDocumentReport } = await import("../src/services/documentService");
      vi.mocked(getDocumentReport).mockResolvedValue({
        id: "1",
        documentId: "11111111-1111-1111-1111-111111111111",
        summary: "Test summary",
        topRisks: [],
        obligations: [],
        exitConditions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app).get("/api/documents/11111111-1111-1111-1111-111111111111/report");
      expect(res.status).toBe(200);
      expect(res.body.summary).toBe("Test summary");
    });
  });

  describe("POST /api/documents/:id/process", () => {
    it("processes document successfully", async () => {
      const { processDocument, getDocumentById } = await import("../src/services/documentService");
      vi.mocked(processDocument).mockResolvedValue(undefined);
      vi.mocked(getDocumentById).mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        fileName: "test.pdf",
        fileType: "application/pdf",
        storagePath: "uploads/test.pdf",
        status: "COMPLETED",
        fileSize: 1024,
        createdAt: new Date(),
        updatedAt: new Date(),
        clauses: [],
        report: null,
      });

      const res = await request(app).post("/api/documents/11111111-1111-1111-1111-111111111111/process");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Document processed successfully");
    });

    it("returns 404 for non-existent document", async () => {
      const { processDocument } = await import("../src/services/documentService");
      vi.mocked(processDocument).mockRejectedValue({
        statusCode: 404,
        message: "Document not found",
      });

      const res = await request(app).post("/api/documents/00000000-0000-0000-0000-000000000000/process");
      expect(res.status).toBe(404);
    });
  });
});