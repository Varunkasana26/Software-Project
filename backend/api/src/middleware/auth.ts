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

function verified(req: Request): AuthUser | null {
  const token = readToken(req);
  if (!token) return null;
  try {
    const claims = jwt.verify(token, getConfig().JWT_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    return { id: String(claims.sub), email: String(claims.email), role: claims.role as Role };
  } catch {
    return null;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const user = verified(req);
  if (!user) return next(new AppError(401, readToken(req) ? "Your session has expired. Sign in again." : "Sign in required.", "UNAUTHENTICATED"));
  req.user = user;
  next();
}

/** Like authenticate, but a missing or bad token is not an error (used by GET /api/auth/me). */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = verified(req) ?? undefined;
  next();
}

/** Use after authenticate. */
export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, "You do not have permission to do this.", "FORBIDDEN"));
  }
  next();
};
