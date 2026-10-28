import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { PrismaClient } from "@prisma/client";

vi.mock("@prisma/client", () => {
  const mockPrisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("Health Endpoint", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.resetModules();
    const { default: healthRoutes } = await import("../src/routes/health");
    app = express();
    app.use("/api/health", healthRoutes);
  });

  it("GET /api/health returns healthy when database is connected", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.database).toBe("connected");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/health returns unhealthy when database is disconnected", async () => {
    const { prisma } = await import("../src/lib/prisma");
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("Connection failed"));

    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unhealthy");
    expect(res.body.database).toBe("disconnected");
  });
});