import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getConfig } from "../config/env";
import { AuthUser, Role } from "../types";
import { AppError } from "./errorHandler";

export const COOKIE_NAME = "lds_token";
export const TOKEN_HOURS = 8;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, getConfig().JWT_SECRET, { expiresIn: `${TOKEN_HOURS}h` });
}

/** Accepts the httpOnly cookie (browser) or an `Authorization: Bearer` header (scripts, tests). */
function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.[COOKIE_NAME] ?? null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(new AppError(401, "Sign in required.", "UNAUTHENTICATED"));
  try {
    const claims = jwt.verify(token, getConfig().JWT_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    req.user = { id: String(claims.sub), email: String(claims.email), role: claims.role as Role };
    next();
  } catch {
    next(new AppError(401, "Your session has expired. Sign in again.", "UNAUTHENTICATED"));
  }
}

/** Use after authenticate. */
export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, "You do not have permission to do this.", "FORBIDDEN"));
  }
  next();
};
