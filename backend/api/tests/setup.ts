import { config } from "dotenv";
config({ path: ".env.test" });

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.DIRECT_URL = "postgresql://test:test@localhost:5432/test";
process.env.UPLOAD_DIR = "test_uploads";
process.env.MAX_FILE_SIZE_MB = "10";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.PORT = "8001";