import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { getConfig } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import clauseRoutes from "./routes/clauses";
import documentRoutes from "./routes/documents";
import healthRoutes from "./routes/health";
import reportRoutes from "./routes/reports";
import ruleRoutes from "./routes/rules";

const config = getConfig();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL, // one configured origin, never "*", because cookies are sent
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/clauses", clauseRoutes);
app.use("/api/rules", ruleRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api", (_req: Request, res: Response) => {
  res.json({
    name: "Legal Document Summarizer API",
    version: "2.0.0",
    endpoints: {
      health: "GET /api/health",
      auth: "POST /api/auth/register | login | logout, GET /api/auth/me",
      documents: "GET/POST /api/documents, GET/DELETE /api/documents/:id, GET .../clauses, GET .../report, POST .../process",
      override: "PATCH/DELETE /api/clauses/:id/override (lawyer)",
      rules: "GET /api/rules, POST/PATCH/DELETE (admin)",
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
