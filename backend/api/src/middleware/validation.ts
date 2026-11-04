import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";

/**
 * Validates body, query and params. A body that passes is REPLACED by the parsed result, so unknown fields are
 * dropped (or rejected, for .strict() schemas) and the controllers never see the raw input.
 */
export const validate = (schemas: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (schemas.body) req.body = await schemas.body.parseAsync(req.body);
    if (schemas.query) await schemas.query.parseAsync(req.query);
    if (schemas.params) await schemas.params.parseAsync(req.params);
    next();
  } catch (error) {
    next(error); // ZodError is turned into a 400 by errorHandler
  }
};
