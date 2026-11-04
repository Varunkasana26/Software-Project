import { beforeEach, vi } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test" });

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.DIRECT_URL = "postgresql://test:test@localhost:5432/test";
process.env.UPLOAD_DIR = "test_uploads";
process.env.MAX_FILE_SIZE_MB = "10";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.PORT = "8001";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.BCRYPT_ROUNDS = "4";
process.env.DB_SSL = "false";
process.env.CORE_URL = "http://localhost:8001";

// The API tests run without a database and without the core service: both are replaced here (see tests/mocks.ts).
vi.mock("../src/lib/prisma", async () => {
  const { db } = await import("./mocks");
  return { prisma: db, default: db };
});
vi.mock("../src/services/coreClient", async () => {
  const m = await import("./mocks");
  return { analyzeFile: m.analyzeFile, validateRules: m.validateRules };
});

beforeEach(async () => {
  const m = await import("./mocks");
  m.db.reset();
  m.analyzeFile.mockReset();
  m.validateRules.mockReset().mockResolvedValue([]);
});
