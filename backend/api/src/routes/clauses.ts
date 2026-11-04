import { Router } from "express";
import { override, removeOverride } from "../controllers/clauseController";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { Role } from "../types";
import { clauseIdParamSchema, overrideSchema } from "../validators/document";

const router = Router();
router.use(authenticate, requireRole(Role.LAWYER));

router.patch("/:id/override", validate({ params: clauseIdParamSchema, body: overrideSchema }), override);
router.delete("/:id/override", validate({ params: clauseIdParamSchema }), removeOverride);

export default router;
