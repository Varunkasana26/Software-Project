// Creates (or resets) three LOCAL DEMO accounts. The passwords below are for a local demo only. Never use them anywhere real.
// Run: npm run seed:users
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const DEMO = [
  { email: "demo.user@example.com", password: "DemoUser-2026!", role: "USER" },
  { email: "demo.lawyer@example.com", password: "DemoLawyer-2026!", role: "LAWYER" },
  { email: "demo.admin@example.com", password: "DemoAdmin-2026!", role: "ADMIN" },
] as const;

async function main() {
  for (const u of DEMO) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({ where: { email: u.email }, update: { passwordHash, role: u.role }, create: { email: u.email, passwordHash, role: u.role } });
    console.log(`${u.role.padEnd(6)} ${u.email}`);
  }
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
