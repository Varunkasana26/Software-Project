import bcrypt from "bcryptjs";
import { CookieOptions, Request, Response } from "express";
import { getConfig } from "../config/env";
import { prisma } from "../lib/prisma";
import { COOKIE_NAME, TOKEN_HOURS, signToken } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { Role } from "../types";

const cookieOptions = (): CookieOptions => ({
  httpOnly: true, // the page's JavaScript cannot read the token
  sameSite: "lax",
  secure: getConfig().COOKIE_SECURE,
  maxAge: TOKEN_HOURS * 3600 * 1000,
});

const publicUser = (u: { id: string; email: string; role: string }) => ({ id: u.id, email: u.email, role: u.role });

function startSession(res: Response, user: { id: string; email: string; role: Role }) {
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

// A real hash to compare against when the email is unknown, so login takes about the same time either way.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 4);

export async function register(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new AppError(409, "An account with this email already exists.", "EMAIL_TAKEN");
  }
  // New accounts are always USER. LAWYER and ADMIN are assigned by an operator (see scripts/seed-users.ts).
  const user = await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, getConfig().BCRYPT_ROUNDS), role: Role.USER } });
  const token = startSession(res, user);
  res.status(201).json({ user: publicUser(user), token });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  const token = startSession(res, user);
  res.json({ user: publicUser(user), token });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.status(204).send();
}

export function me(req: Request, res: Response) {
  res.json({ user: req.user ?? null });
}
