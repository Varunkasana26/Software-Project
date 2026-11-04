// Applies prisma/schema.prisma to the database in DIRECT_URL (session-mode connection, which schema changes need).
// The running app uses DATABASE_URL (pooled). Usage: npm run db:push
require("dotenv").config({ quiet: true });
const { spawnSync } = require("node:child_process");
if (!process.env.DIRECT_URL) {
  console.error("DIRECT_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
const r = spawnSync("npx", ["prisma", "db", "push", ...process.argv.slice(2)], {
  stdio: "inherit", shell: true, env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL },
});
process.exit(r.status ?? 1);
