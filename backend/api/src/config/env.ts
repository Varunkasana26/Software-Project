import { randomBytes } from "crypto";
import { z } from "zod";

const flag = (fallback: "true" | "false") => z.enum(["true", "false"]).default(fallback).transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  // Required unless OFFLINE_DEMO=true (checked below).
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string").optional(),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid PostgreSQL connection string").optional(),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").default("http://localhost:5173"),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters").optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(12),
  CORE_URL: z.string().url("CORE_URL must be a valid URL").default("http://localhost:8001"),
  CORE_TIMEOUT_MS: z.coerce.number().positive().default(60000),
  RULES_SEED_PATH: z.string().default("../../core/rules/rules.json"),
  DB_SSL: flag("true"),
  COOKIE_SECURE: flag("false"),
  // Local demo without a database: data lives in memory and the public demo accounts exist. Never for production.
  OFFLINE_DEMO: flag("false"),
});

export type EnvConfig = Omit<z.infer<typeof envSchema>, "JWT_SECRET"> & { JWT_SECRET: string };

let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const result = envSchema.safeParse(process.env);
  const problems: Record<string, string[] | undefined> = result.success ? {} : { ...result.error.flatten().fieldErrors };

  if (result.success) {
    const c = result.data;
    if (c.OFFLINE_DEMO && c.NODE_ENV === "production") {
      problems.OFFLINE_DEMO = ["OFFLINE_DEMO has public demo accounts and no database. It must never run with NODE_ENV=production."];
    }
    if (!c.OFFLINE_DEMO && !c.DATABASE_URL) problems.DATABASE_URL = ["Required (or set OFFLINE_DEMO=true to run without a database)"];
    if (!c.OFFLINE_DEMO && !c.JWT_SECRET) problems.JWT_SECRET = ["Required: at least 32 characters"];
  }

  if (!result.success || Object.keys(problems).length > 0) {
    console.error("Environment validation failed:");
    console.error(problems);
    throw new Error("Invalid environment configuration");
  }

  // In offline demo mode a fresh random secret is used for each start, so no .env file is needed at all.
  cachedConfig = { ...result.data, JWT_SECRET: result.data.JWT_SECRET ?? randomBytes(32).toString("hex") };
  return cachedConfig;
}

export function resetConfig() {
  cachedConfig = null;
}
