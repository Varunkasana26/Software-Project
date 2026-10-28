import express, { Request, Response } from "express";
import cors from "cors";
import { getConfig } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import healthRoutes from "./routes/health";
import documentRoutes from "./routes/documents";
import ruleRoutes from "./routes/rules";
import reportRoutes from "./routes/reports";

const config = getConfig();

const app = express();

app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/rules", ruleRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api", (_req: Request, res: Response) => {
  res.json({
    name: "Legal Document Summarizer API",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/health",
      documents: "GET/POST /api/documents",
      documentDetail: "GET /api/documents/:id",
      documentClauses: "GET /api/documents/:id/clauses",
      documentReport: "GET /api/documents/:id/report",
      processDocument: "POST /api/documents/:id/process",
      rules: "GET/POST /api/rules",
      ruleDetail: "GET/PATCH/DELETE /api/rules/:id",
      reports: "GET /api/reports/:id",
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;