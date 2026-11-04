import { Router } from "express";
import rateLimit from "express-rate-limit";
import { clauses, getOne, list, process_, remove, report, uploadDocument } from "../controllers/documentController";
import { authenticate } from "../middleware/auth";
import { checkUploadedFile, handleMulterError, upload } from "../middleware/upload";
import { validate } from "../middleware/validation";
import { documentIdParamSchema, documentQuerySchema } from "../validators/document";

const router = Router();
router.use(authenticate); // every document route needs a signed-in user; ownership is checked in documentService

const heavy = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test" });
const byId = validate({ params: documentIdParamSchema });

router.post("/", heavy, upload.single("file"), handleMulterError, checkUploadedFile, uploadDocument);
router.get("/", validate({ query: documentQuerySchema }), list);
router.get("/:id", byId, getOne);
router.get("/:id/clauses", byId, clauses);
router.get("/:id/report", byId, report);
router.post("/:id/process", heavy, byId, process_);
router.delete("/:id", byId, remove);

export default router;
