import "dotenv/config"; // load .env before anything reads the environment
import app from "./app";
import { getConfig } from "./config/env";
import bcrypt from "bcryptjs";
import { DEMO_ACCOUNTS } from "./lib/demoAccounts";
import { prisma } from "./lib/prisma";
import { seedRulesIfEmpty } from "./services/ruleService";

const config = getConfig();

// OFFLINE_DEMO: no database. Create the public demo accounts in memory and say so loudly.
async function startOfflineDemo() {
  for (const a of DEMO_ACCOUNTS) {
    await prisma.user.create({ data: { email: a.email, passwordHash: await bcrypt.hash(a.password, 10), role: a.role } });
  }
  console.warn("*** OFFLINE DEMO MODE ***");
  console.warn("No database is used. Data lives in memory and is lost when the server stops.");
  console.warn("These accounts are public and for local use only: " + DEMO_ACCOUNTS.map((a) => a.email).join(", "));
  console.warn("Passwords are in README.md. Never deploy this mode.");
}

// Say plainly at start-up whether the database answers (a paused Supabase project, a wrong URL or a typo in .env all look the same later).
const ready = config.OFFLINE_DEMO
  ? startOfflineDemo()
  : prisma.$queryRaw`SELECT 1`
      .then(() => console.log("Database: connected"))
      .catch(() => console.error("Database: NOT reachable. Check DATABASE_URL in backend/api/.env, that the Supabase project is not paused, and your network."));

// Fill an empty rules table from core/rules/rules.json before taking requests.
ready
  .then(() => seedRulesIfEmpty())
  .then((n) => n && console.log(`Seeded ${n} rules from the core rules file`))
  .catch((e) => console.error("Rule seeding failed:", e.message));

const server = app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default server;