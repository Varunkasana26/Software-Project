// Creates (or resets) three LOCAL DEMO accounts. The passwords below are for a local demo only. Never use them anywhere real.
// Run: npm run seed:users
import "dotenv/config";
import bcrypt from "bcryptjs";
import { DEMO_ACCOUNTS as DEMO } from "../src/lib/demoAccounts";
import { prisma } from "../src/lib/prisma";

async function main() {
  for (const u of DEMO) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({ where: { email: u.email }, update: { passwordHash, role: u.role }, create: { email: u.email, passwordHash, role: u.role } });
    console.log(`${u.role.padEnd(6)} ${u.email}`);
  }
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
