import { Request, Response } from "express";
import { NotFoundError } from "../middleware/errorHandler";
import { createRule, deleteRule, getRuleById, getRules, updateRule } from "../services/ruleService";

const idOf = (req: Request) => String(req.params.id);

export async function create(req: Request, res: Response) {
  res.status(201).json(await createRule(req.body));
}

export async function list(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const { data, total } = await getRules(page, limit);
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function getOne(req: Request, res: Response) {
  const rule = await getRuleById(idOf(req));
  if (!rule) throw new NotFoundError("Rule");
  res.json(rule);
}

export async function update(req: Request, res: Response) {
  res.json(await updateRule(idOf(req), req.body));
}

export async function remove(req: Request, res: Response) {
  await deleteRule(idOf(req));
  res.status(204).send();
}
