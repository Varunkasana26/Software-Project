import { Router } from "express";
import { upload, handleMulterError } from "../middleware/upload";
import { validate } from "../middleware/validation";
import {
  documentIdParamSchema,
  documentQuerySchema,
} from "../validators/document";
import {
  uploadDocument,
  listDocuments,
  getDocument,
  getClauses,
  getReport,
  processDocumentController,
  deleteDocumentController,
} from "../controllers/documentController";

const router = Router();

router.post(
  "/",
  upload.single("file"),
  handleMulterError,
  uploadDocument
);

router.get("/", validate({ query: documentQuerySchema }), listDocuments);

router.get("/:id", validate({ params: documentIdParamSchema }), getDocument);

router.get("/:id/clauses", validate({ params: documentIdParamSchema }), getClauses);

router.get("/:id/report", validate({ params: documentIdParamSchema }), getReport);

router.post("/:id/process", validate({ params: documentIdParamSchema }), processDocumentController);

router.delete("/:id", validate({ params: documentIdParamSchema }), deleteDocumentController);

export default router;