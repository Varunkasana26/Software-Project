import { Router } from "express";
import { create, getOne, list, remove, update } from "../controllers/ruleController";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { Role } from "../types";
import { ruleCreateSchema, ruleIdParamSchema, ruleQuerySchema, ruleUpdateSchema } from "../validators/document";

const router = Router();
router.use(authenticate);
const admin = requireRole(Role.ADMIN);

router.get("/", validate({ query: ruleQuerySchema }), list);
router.get("/:id", validate({ params: ruleIdParamSchema }), getOne);
router.post("/", admin, validate({ body: ruleCreateSchema }), create);
router.patch("/:id", admin, validate({ params: ruleIdParamSchema, body: ruleUpdateSchema }), update);
router.delete("/:id", admin, validate({ params: ruleIdParamSchema }), remove);

export default router;
