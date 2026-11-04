import multer from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { getConfig } from "../config/env";
import { detectFileType } from "../lib/fileType";
import { AppError } from "./errorHandler";

const config = getConfig();

const allowedExtensions = [".pdf", ".txt"];

// First, cheap check on the client's claim. The real check is checkUploadedFile (file content).
function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new AppError(415, "Only PDF (.pdf) and plain text (.txt) files are allowed.", "UNSUPPORTED_TYPE"));
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = config.UPLOAD_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  // The stored name is random and has no extension yet; checkUploadedFile adds the real one.
  filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.upload`),
});

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

export const handleMulterError = (err: Error, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(413, `File too large. Maximum size is ${config.MAX_FILE_SIZE_MB}MB.`, "FILE_TOO_LARGE"));
    }
    return next(new AppError(400, err.message, "UPLOAD_FAILED"));
  }
  next(err);
};

/** Runs after multer: checks the content matches the claimed type, then gives the file its real extension. */
export function checkUploadedFile(req: Request, _res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) return next(new AppError(400, "No file uploaded.", "NO_FILE"));
  const remove = () => fs.rmSync(file.path, { force: true });
  const claimed = path.extname(file.originalname).toLowerCase().slice(1);
  const detected = detectFileType(file.path);
  if (detected === null || detected !== claimed) {
    remove();
    return next(new AppError(415, "The file content does not match a PDF or plain text file.", "UNSUPPORTED_TYPE"));
  }
  const finalPath = file.path.replace(/\.upload$/, `.${detected}`);
  fs.renameSync(file.path, finalPath);
  file.path = finalPath;
  file.mimetype = detected === "pdf" ? "application/pdf" : "text/plain";
  next();
}
