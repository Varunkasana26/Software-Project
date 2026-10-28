import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler, notFoundHandler } from "../src/middleware/errorHandler";

const mockPrisma = {
  rule: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../src/services/ruleService", () => ({
  createRule: vi.fn(),
  getRules: vi.fn(),
  getRuleById: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
}));

describe("Rule Endpoints", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();
    const { default: ruleRoutes } = await import("../src/routes/rules");
    app = express();
    app.use(express.json());
    app.use("/api/rules", ruleRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  describe("POST /api/rules", () => {
    it("creates a new rule", async () => {
      const { createRule } = await import("../src/services/ruleService");
      vi.mocked(createRule).mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Test Rule",
        category: "OBLIGATION",
        pattern: "shall",
        riskLevel: "MEDIUM",
        sentiment: "NEUTRAL",
        explanation: "Test explanation",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post("/api/rules")
        .send({
          name: "Test Rule",
          category: "OBLIGATION",
          pattern: "shall",
          riskLevel: "MEDIUM",
          sentiment: "NEUTRAL",
          explanation: "Test explanation",
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Test Rule");
    });

    it("rejects invalid rule data", async () => {
      const res = await request(app)
        .post("/api/rules")
        .send({
          name: "",
          category: "INVALID",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("GET /api/rules", () => {
    it("returns paginated list of rules", async () => {
      const { getRules } = await import("../src/services/ruleService");
      vi.mocked(getRules).mockResolvedValue({
        data: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Test Rule",
            category: "OBLIGATION",
            pattern: "shall",
            riskLevel: "MEDIUM",
            sentiment: "NEUTRAL",
            explanation: "Test explanation",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const res = await request(app).get("/api/rules");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });
  });

  describe("GET /api/rules/:id", () => {
    it("returns 404 for non-existent rule", async () => {
      const { getRuleById } = await import("../src/services/ruleService");
      vi.mocked(getRuleById).mockResolvedValue(null);

      const res = await request(app).get("/api/rules/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });

    it("returns rule when found", async () => {
      const { getRuleById } = await import("../src/services/ruleService");
      vi.mocked(getRuleById).mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Test Rule",
        category: "OBLIGATION",
        pattern: "shall",
        riskLevel: "MEDIUM",
        sentiment: "NEUTRAL",
        explanation: "Test explanation",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app).get("/api/rules/11111111-1111-1111-1111-111111111111");
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Test Rule");
    });
  });

  describe("PATCH /api/rules/:id", () => {
    it("updates rule successfully", async () => {
      const { updateRule } = await import("../src/services/ruleService");
      vi.mocked(updateRule).mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Updated Rule",
        category: "OBLIGATION",
        pattern: "shall",
        riskLevel: "HIGH",
        sentiment: "UNFAVORABLE",
        explanation: "Updated explanation",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch("/api/rules/11111111-1111-1111-1111-111111111111")
        .send({ riskLevel: "HIGH", sentiment: "UNFAVORABLE" });

      expect(res.status).toBe(200);
      expect(res.body.riskLevel).toBe("HIGH");
    });
  });

  describe("DELETE /api/rules/:id", () => {
    it("deletes rule successfully", async () => {
      const { deleteRule } = await import("../src/services/ruleService");
      vi.mocked(deleteRule).mockResolvedValue(undefined);

      const res = await request(app).delete("/api/rules/11111111-1111-1111-1111-111111111111");
      expect(res.status).toBe(204);
    });

    it("returns 404 for non-existent rule", async () => {
      const { deleteRule } = await import("../src/services/ruleService");
      vi.mocked(deleteRule).mockRejectedValue({
        statusCode: 404,
        message: "Rule not found",
      });

      const res = await request(app).delete("/api/rules/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
    });
  });
});