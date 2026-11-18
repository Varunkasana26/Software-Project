import { prisma } from "../lib/prisma";
import { NotFoundError } from "../middleware/errorHandler";
import { AuthUser } from "../types";
import { clauseView } from "./serialize";

/** Stores a lawyer's score and reason. autoScore is never touched, so the original value is always kept. */
export async function setOverride(clauseId: string, user: AuthUser, score: number, reason: string) {
  const clause = await prisma.clause.findUnique({ where: { id: clauseId } });
  if (!clause || (clause as { adviceRequested?: boolean }).adviceRequested !== true) throw new NotFoundError("Clause"); // a lawyer may only change a clause the user asked about
  const updated = await prisma.clause.update({
    where: { id: clauseId },
    data: { lawyerOverride: score, lawyerOverrideReason: reason, overriddenAt: new Date(), overriddenById: user.id },
  });
  return clauseView(updated);
}

export async function clearOverride(clauseId: string) {
  const clause = await prisma.clause.findUnique({ where: { id: clauseId } });
  if (!clause || (clause as { adviceRequested?: boolean }).adviceRequested !== true) throw new NotFoundError("Clause"); // a lawyer may only change a clause the user asked about
  const updated = await prisma.clause.update({
    where: { id: clauseId },
    data: { lawyerOverride: null, lawyerOverrideReason: null, overriddenAt: null, overriddenById: null },
  });
  return clauseView(updated);
}
