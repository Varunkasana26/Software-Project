// LOCAL DEMO ACCOUNTS. The passwords are public (they are in README.md). Used by scripts/seed-users.ts and by OFFLINE_DEMO mode.
// Never create these accounts in a database that anyone else can reach.
export const DEMO_ACCOUNTS = [
  { email: "demo.user@example.com", password: "DemoUser-2026!", role: "USER" },
  { email: "demo.lawyer@example.com", password: "DemoLawyer-2026!", role: "LAWYER" },
  { email: "demo.admin@example.com", password: "DemoAdmin-2026!", role: "ADMIN" },
] as const;
