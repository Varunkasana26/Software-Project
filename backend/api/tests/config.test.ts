import { afterEach, describe, expect, it } from "vitest";
import { getConfig, resetConfig } from "../src/config/env";

const KEYS = ["NODE_ENV", "OFFLINE_DEMO", "DATABASE_URL", "JWT_SECRET"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]);
  resetConfig();
});

describe("Config", () => {
  it("needs DATABASE_URL and JWT_SECRET in normal mode", () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    resetConfig();
    expect(() => getConfig()).toThrow("Invalid environment configuration");
  });

  it("OFFLINE_DEMO runs with no database URL and no secret, and makes its own random secret", () => {
    process.env.OFFLINE_DEMO = "true";
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    resetConfig();
    const first = getConfig().JWT_SECRET;
    expect(first.length).toBeGreaterThanOrEqual(32);
    resetConfig();
    expect(getConfig().JWT_SECRET).not.toBe(first); // a new secret on every start
  });

  it("refuses OFFLINE_DEMO in production", () => {
    process.env.OFFLINE_DEMO = "true";
    process.env.NODE_ENV = "production";
    resetConfig();
    expect(() => getConfig()).toThrow("Invalid environment configuration");
  });
});
