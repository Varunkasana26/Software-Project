import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

const mockPrisma = {
  document: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  clause: {
    createMany: vi.fn(),
  },
  report: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../src/lib/fileExtractor", () => ({
  extractTextFromFile: vi.fn(),
}));

vi.mock("../src/services/clauseEngine", () => ({
  getClauseEngine: vi.fn(() => ({
    processDocument: vi.fn(),
  })),
  setClauseEngine: vi.fn(),
}));

describe("Document Processing Workflow", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("extracts text from PDF and processes through engine", async () => {
    const { processDocument } = await import("../src/services/documentService");
    const { extractTextFromFile } = await import("../src/lib/fileExtractor");
    const { getClauseEngine } = await import("../src/services/clauseEngine");

    const mockEngine = {
      processDocument: vi.fn().mockResolvedValue({
        clauses: [
          {
            text: "Party shall deliver goods",
            category: "OBLIGATION",
            sentiment: "NEUTRAL",
            riskLevel: "LOW",
            explanation: "Standard obligation clause",
          },
        ],
        summary: "Document contains 1 obligation(s).",
        topRisks: [],
        obligations: ["Party shall deliver goods"],
        exitConditions: [],
      }),
    };

    vi.mocked(getClauseEngine).mockReturnValue(mockEngine as any);
    vi.mocked(extractTextFromFile).mockResolvedValue("Party shall deliver goods on time.");
    
    mockPrisma.document.findUnique.mockResolvedValue({
      id: "doc-1",
      fileName: "test.pdf",
      fileType: "application/pdf",
      storagePath: "uploads/test.pdf",
      status: "UPLOADED",
      fileSize: 1024,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.document.update.mockResolvedValue({} as any);
    mockPrisma.clause.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.report.create.mockResolvedValue({} as any);
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));

    await processDocument("doc-1");

    expect(extractTextFromFile).toHaveBeenCalledWith("uploads/test.pdf");
    expect(mockEngine.processDocument).toHaveBeenCalledWith("Party shall deliver goods on time.");
    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { status: "PROCESSING" },
    });
    expect(mockPrisma.clause.createMany).toHaveBeenCalled();
    expect(mockPrisma.report.create).toHaveBeenCalled();
  });

  it("handles processing failure and updates status to FAILED", async () => {
    const { processDocument } = await import("../src/services/documentService");
    const { extractTextFromFile } = await import("../src/lib/fileExtractor");
    const { getClauseEngine } = await import("../src/services/clauseEngine");

    const mockEngine = {
      processDocument: vi.fn().mockRejectedValue(new Error("Engine error")),
    };

    vi.mocked(getClauseEngine).mockReturnValue(mockEngine as any);
    vi.mocked(extractTextFromFile).mockResolvedValue("Some text");
    
    mockPrisma.document.findUnique.mockResolvedValue({
      id: "doc-1",
      fileName: "test.pdf",
      fileType: "application/pdf",
      storagePath: "uploads/test.pdf",
      status: "UPLOADED",
      fileSize: 1024,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.document.update.mockResolvedValue({} as any);
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));

    await expect(processDocument("doc-1")).rejects.toThrow("Document processing failed");
    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { status: "FAILED" },
    });
  });

  it("handles empty text extraction", async () => {
    const { processDocument } = await import("../src/services/documentService");
    const { extractTextFromFile } = await import("../src/lib/fileExtractor");

    vi.mocked(extractTextFromFile).mockResolvedValue("");
    
    mockPrisma.document.findUnique.mockResolvedValue({
      id: "doc-1",
      fileName: "test.pdf",
      fileType: "application/pdf",
      storagePath: "uploads/test.pdf",
      status: "UPLOADED",
      fileSize: 1024,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.document.update.mockResolvedValue({} as any);
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));

    await expect(processDocument("doc-1")).rejects.toThrow("No text could be extracted");
    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { status: "FAILED" },
    });
  });
});