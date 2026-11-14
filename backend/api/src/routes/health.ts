import { Router, Request, Response } from "express";
import { getConfig } from "../config/env";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: getConfig().OFFLINE_DEMO ? "in-memory" : "connected",
      ...(getConfig().OFFLINE_DEMO ? { mode: "offline-demo" } : {}), // lets the login page show the demo accounts
    });
  } catch {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

export default router;