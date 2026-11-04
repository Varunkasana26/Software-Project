import "dotenv/config"; // load .env before anything reads the environment
import app from "./app";
import { getConfig } from "./config/env";
import { seedRulesIfEmpty } from "./services/ruleService";

const config = getConfig();

// Fill an empty rules table from core/rules/rules.json before taking requests.
seedRulesIfEmpty()
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