import fs from "fs";

export type DetectedType = "pdf" | "txt";

/**
 * Decide the real type from the file's first bytes, not from the name or the Content-Type header (both are
 * chosen by the client). A PDF starts with "%PDF-". Text must be valid UTF-8 with no NUL bytes.
 */
export function detectFileType(filePath: string): DetectedType | null {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(4096);
    const read = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, read);
    if (head.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
    if (head.includes(0)) return null;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(head, { stream: true }); // stream: a cut-off last character is fine
      return "txt";
    } catch {
      return null;
    }
  } finally {
    fs.closeSync(fd);
  }
}
