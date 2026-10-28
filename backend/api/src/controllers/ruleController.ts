import { Request, Response, NextFunction } from "express";
import {
  createRule,
  getRules,
  getRuleById,
  updateRule,
  deleteRule,
} from "../services/ruleService";
import { AppError, NotFoundError } from "../middleware/errorHandler";

function getIdParam(req: Request): string {
  const id = req.params.id;
  if (Array.isArray(id)) throw new AppError(400, "Invalid ID parameter");
  return id;
}

export async function createRuleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rule = await createRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
}

export async function listRules(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt((req.query.page as string) || "1") || 1;
    const limit = parseInt((req.query.limit as string) || "20") || 20;
    const category = req.query.category as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

    const { data, total } = await getRules(page, limit, category as any, isActive);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getRule(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getIdParam(req);
    const rule = await getRuleById(id);
    if (!rule) {
      throw new NotFoundError("Rule", id);
    }
    res.json(rule);
  } catch (error) {
    next(error);
  }
}

export async function updateRuleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = getIdParam(req);
    const rule = await updateRule(id, req.body);
    res.json(rule);
  } catch (error) {
    next(error);
  }
}

export async function deleteRuleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = getIdParam(req);
    await deleteRule(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}