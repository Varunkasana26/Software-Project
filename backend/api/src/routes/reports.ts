import { Router } from "express";
import { validate } from "../middleware/validation";
import { documentIdParamSchema } from "../validators/document";
import { getReport } from "../controllers/documentController";

const router = Router();

router.get("/:id", validate({ params: documentIdParamSchema }), getReport);

export default router;