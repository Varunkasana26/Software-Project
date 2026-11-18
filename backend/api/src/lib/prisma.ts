import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getConfig } from "../config/env";
import { createMemoryPrisma } from "./memoryDb";

const config = getConfig();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  // OFFLINE_DEMO: no database. Data is kept in memory and lost on restart (see config/env.ts).
  if (config.OFFLINE_DEMO) return createMemoryPrisma() as unknown as PrismaClient;

  // ponytail: rejectUnauthorized is off so the Supabase pooler works without shipping its CA. Pin the CA for production.
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.DB_SSL ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10_000, // fail fast when the database is paused or unreachable instead of hanging the request
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
export { PrismaClient } from "../generated/prisma";
export { Prisma } from "../generated/prisma";
