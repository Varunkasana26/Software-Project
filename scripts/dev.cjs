// Cross-platform launcher (Windows, macOS, Linux). Used by the root package.json:
//   npm run setup   installs everything (Python packages for core, npm packages for backend and frontend)
//   npm run dev     starts core (8001), backend (8000) and frontend (5173); uses the database if backend/api/.env exists,
//                   otherwise starts in OFFLINE DEMO mode (no database needed)
//   npm run demo    adds two analysed sample contracts (run it while "npm run dev" is running)
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const win = process.platform === "win32";

function findPython() {
  for (const cmd of ["python3", "python", "py"]) {
    const r = spawnSync(cmd, ["-c", "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)"], { stdio: "ignore" }); // no shell: the -c argument has spaces and would be split by cmd.exe
    if (r.status === 0) return cmd;
  }
  console.error("Python 3.11 or newer was not found. Install it and try again.");
  process.exit(1);
}

function run(cmd, args, cwd, extraEnv = {}) {
  return spawnSync(cmd, args, { cwd, stdio: "inherit", shell: win, env: { ...process.env, ...extraEnv } });
}

const command = process.argv[2];

if (command === "setup") {
  const py = findPython();
  const steps = [
    [py, ["-m", "pip", "install", "-r", "core/requirements.txt"], root],
    ["npm", ["install"], path.join(root, "backend", "api")],
    ["npm", ["install"], path.join(root, "frontend")],
  ];
  for (const [cmd, args, cwd] of steps) {
    console.log(`\n> ${cmd} ${args.join(" ")}   (in ${path.relative(root, cwd) || "."})`);
    if (run(cmd, args, cwd).status !== 0) {
      console.error("That step failed. Fix the error above and run `npm run setup` again.");
      process.exit(1);
    }
  }
  console.log("\nDone. Now run: npm run dev");
} else if (command === "demo") {
  process.exit(run(findPython(), ["scripts/demo-seed.py", ...(fs.existsSync(path.join(root, "backend", "api", ".env")) ? [] : ["--offline"])], root).status ?? 1);
} else if (command === "dev") {
  for (const dir of ["backend/api", "frontend"]) {
    if (!fs.existsSync(path.join(root, dir, "node_modules"))) {
      console.error(`Missing ${dir}/node_modules. Run: npm run setup`);
      process.exit(1);
    }
  }
  const hasEnv = fs.existsSync(path.join(root, "backend", "api", ".env"));
  const offline = process.argv.includes("--offline") || !hasEnv;
  if (offline && !hasEnv) console.log("No backend/api/.env found, so starting in OFFLINE DEMO mode (no database needed).");
  if (offline) console.log("OFFLINE DEMO mode: data is kept in memory and lost on restart. Demo accounts are on the login page.\n");

  const py = findPython();
  const services = [
    ["core", py, ["-m", "uvicorn", "service.main:app", "--port", "8001"], path.join(root, "core"), {}],
    ["backend", "npm", ["run", "dev"], path.join(root, "backend", "api"), offline ? { OFFLINE_DEMO: "true" } : {}],
    ["frontend", "npm", ["run", "dev", "--", "--port", "5173", "--strictPort"], path.join(root, "frontend"), {}],
  ];
  const children = services.map(([name, cmd, args, cwd, env]) => {
    const child = spawn(cmd, args, { cwd, shell: win, env: { ...process.env, ...env } });
    const prefix = (line) => process.stdout.write(`[${name}] ${line}\n`);
    for (const stream of [child.stdout, child.stderr]) stream.on("data", (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach(prefix));
    child.on("exit", (code) => { if (code) prefix(`stopped with code ${code}`); });
    return child;
  });

  const stop = () => {
    for (const c of children) {
      if (win) spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
      else c.kill("SIGTERM");
    }
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  setTimeout(() => console.log("\nWhen you see the services start, open  http://localhost:5173   (Ctrl+C stops everything)\n"), 8000);
} else {
  console.error("Usage: node scripts/dev.cjs setup | dev [--offline] | demo");
  process.exit(1);
}
