import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { db } from "./mocks";

const creds = { email: "Alice@Example.com", password: "correct-horse-1" };

describe("Auth", () => {
  it("registers a USER, sets an httpOnly cookie and never returns the password hash", async () => {
    const res = await request(app).post("/api/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "alice@example.com", role: "USER" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(String(res.headers["set-cookie"])).toMatch(/lds_token=.*HttpOnly/i);
    expect(db.user.rows[0].passwordHash).not.toBe(creds.password); // stored as a bcrypt hash
  });

  it("rejects a duplicate email, a short password and a wrong password with fixed messages", async () => {
    await request(app).post("/api/auth/register").send(creds);
    expect((await request(app).post("/api/auth/register").send(creds)).status).toBe(409);
    expect((await request(app).post("/api/auth/register").send({ email: "b@example.com", password: "short" })).status).toBe(400);
    const bad = await request(app).post("/api/auth/login").send({ ...creds, password: "wrong-password-1" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "whatever-123" });
    expect(bad.status).toBe(401);
    expect(unknown.body).toEqual(bad.body); // same answer, so the response does not reveal which emails exist
  });

  it("logs in, returns the user on /me, and answers /me with user null when signed out", async () => {
    await request(app).post("/api/auth/register").send(creds);
    const login = await request(app).post("/api/auth/login").send(creds);
    expect(login.status).toBe(200);
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.body.user.email).toBe("alice@example.com");
    expect((await request(app).get("/api/auth/me")).body).toEqual({ user: null }); // signed out: not an error
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-token")).body).toEqual({ user: null });
  });
});
