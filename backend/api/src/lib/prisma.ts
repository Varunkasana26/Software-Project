import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getConfig } from "../config/env";

const config = getConfig();

// ponytail: rejectUnauthorized is off so the Supabase pooler works without shipping its CA. Pin the CA for production.
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DB_SSL ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
export { PrismaClient } from "../generated/prisma";
export { Prisma } from "../generated/prisma";
