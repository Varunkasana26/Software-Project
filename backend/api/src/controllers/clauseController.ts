import { Request, Response } from "express";
import { clearOverride, setOverride } from "../services/clauseService";
import { AuthUser } from "../types";

export async function override(req: Request, res: Response) {
  const { score, reason } = req.body as { score: number; reason: string };
  res.json(await setOverride(String(req.params.id), req.user as AuthUser, score, reason));
}

export async function removeOverride(req: Request, res: Response) {
  res.json(await clearOverride(String(req.params.id)));
}
