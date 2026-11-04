import { z } from "zod";

const flag = (fallback: "true" | "false") => z.enum(["true", "false"]).default(fallback).transform((v) => v === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid PostgreSQL connection string").optional(),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").default("http://localhost:5173"),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(12),
  CORE_URL: z.string().url("CORE_URL must be a valid URL").default("http://localhost:8001"),
  CORE_TIMEOUT_MS: z.coerce.number().positive().default(60000),
  RULES_SEED_PATH: z.string().default("../../core/rules/rules.json"),
  DB_SSL: flag("true"),
  COOKIE_SECURE: flag("false"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Environment validation failed:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function resetConfig() {
  cachedConfig = null;
}
