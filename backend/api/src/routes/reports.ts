import { Router } from "express";
import { report } from "../controllers/documentController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { documentIdParamSchema } from "../validators/document";

const router = Router();

// Same as GET /api/documents/:id/report (the id is the document id), with the same access rule.
router.get("/:id", authenticate, validate({ params: documentIdParamSchema }), report);

export default router;
