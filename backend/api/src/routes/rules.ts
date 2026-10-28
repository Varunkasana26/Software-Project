import { Router } from "express";
import { validate } from "../middleware/validation";
import {
  ruleCreateSchema,
  ruleUpdateSchema,
  ruleIdParamSchema,
  ruleQuerySchema,
} from "../validators/document";
import {
  createRuleController,
  listRules,
  getRule,
  updateRuleController,
  deleteRuleController,
} from "../controllers/ruleController";

const router = Router();

router.post("/", validate({ body: ruleCreateSchema }), createRuleController);

router.get("/", validate({ query: ruleQuerySchema }), listRules);

router.get("/:id", validate({ params: ruleIdParamSchema }), getRule);

router.patch("/:id", validate({ params: ruleIdParamSchema, body: ruleUpdateSchema }), updateRuleController);

router.delete("/:id", validate({ params: ruleIdParamSchema }), deleteRuleController);

export default router;