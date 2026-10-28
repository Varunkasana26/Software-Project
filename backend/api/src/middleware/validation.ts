import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError, ZodRawShape } from "zod";

export const validate = (schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (schemas.body) {
      await schemas.body.parseAsync(req.body);
    }
    if (schemas.query) {
      await schemas.query.parseAsync(req.query);
    }
    if (schemas.params) {
      await schemas.params.parseAsync(req.params);
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.flatten().fieldErrors,
      });
    }
    next(error);
  }
};