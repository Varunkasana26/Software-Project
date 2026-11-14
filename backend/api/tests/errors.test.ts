import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { db } from "./mocks";

describe("Error handling", () => {
  it("answers 503 DATABASE_UNAVAILABLE, not a vague 500, when the database cannot be reached", async () => {
    const original = db.user.findUnique;
    db.user.findUnique = async () => { throw new Error("timeout expired"); };
    try {
      const res = await request(app).post("/api/auth/login").send({ email: "a@example.com", password: "whatever-123" });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe("DATABASE_UNAVAILABLE");
      expect(JSON.stringify(res.body)).not.toContain("timeout expired"); // the cause stays in the server log
    } finally {
      db.user.findUnique = original;
    }
  });

  it("still answers 500 INTERNAL for other unexpected errors", async () => {
    const original = db.user.findUnique;
    db.user.findUnique = async () => { throw new Error("something else broke"); };
    try {
      const res = await request(app).post("/api/auth/login").send({ email: "a@example.com", password: "whatever-123" });
      expect(res.status).toBe(500);
      expect(res.body.code).toBe("INTERNAL");
    } finally {
      db.user.findUnique = original;
    }
  });
});
