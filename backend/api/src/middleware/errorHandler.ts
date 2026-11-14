import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma";

/** An error that is safe to show to the client. `code` is a stable machine-readable string. */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_FAILED");
  }
}

/** True when the error means the database could not be reached (paused project, wrong URL, network), not that a query was wrong. */
function isDatabaseDown(err: Error): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError && /^P1\d{3}$|^P2024$/.test(err.code)) return true;
  return /timeout expired|Connection terminated|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|Can't reach database/i.test(`${err.message} ${(err as { code?: string }).code ?? ""}`);
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    // Field names and messages only; never the submitted values.
    return res.status(400).json({ error: "Validation failed", code: "VALIDATION_FAILED", details: err.flatten().fieldErrors });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
  }

  // Log the real cause on the server only. The client gets a fixed message (no Prisma meta, no stack).
  console.error("Unhandled error:", err);
  if (isDatabaseDown(err)) {
    return res.status(503).json({ error: "The database is not reachable right now. Try again in a minute; if it keeps happening, tell the person running the server.", code: "DATABASE_UNAVAILABLE" });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({ error: "That value already exists.", code: "CONFLICT" });
  }
  return res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found", code: "NOT_FOUND" });
}
