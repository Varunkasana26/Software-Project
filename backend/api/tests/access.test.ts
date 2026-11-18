import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { db, makeDoc, makeUser, storeAnalysis } from "./mocks";

describe("Document access", () => {
  it("needs a signed-in user", async () => {
    expect((await request(app).get("/api/documents")).status).toBe(401);
    expect((await request(app).get("/api/rules")).status).toBe(401);
  });

  it("user B cannot read, process or delete user A's document (404, not 403)", async () => {
    const a = await makeUser("USER");
    const b = await makeUser("USER");
    const doc = await makeDoc(a.user.id, { status: "COMPLETED" });
    await storeAnalysis(doc.id);
    for (const [method, path] of [["get", ""], ["get", "/report"], ["get", "/clauses"], ["post", "/process"], ["delete", ""]] as const) {
      const res = await (request(app) as any)[method](`/api/documents/${doc.id}${path}`).set(b.auth);
      expect(res.status, `${method} ${path}`).toBe(404);
    }
    expect((await request(app).get(`/api/reports/${doc.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).get(`/api/documents/${doc.id}/report`).set(a.auth)).status).toBe(200); // the owner can
  });

  it("a lawyer can read a document once advice is requested, an admin cannot, and a list shows only your own", async () => {
    const a = await makeUser("USER");
    const b = await makeUser("USER");
    const lawyer = await makeUser("LAWYER");
    const admin = await makeUser("ADMIN");
    const doc = await makeDoc(a.user.id, { status: "COMPLETED" });
    await storeAnalysis(doc.id);
    await makeDoc(b.user.id);
    expect((await request(app).get(`/api/documents/${doc.id}/report`).set(lawyer.auth)).status).toBe(404); // nothing requested yet
    await request(app).post(`/api/documents/${doc.id}/clauses/${db.clause.rows[0].id}/request-advice`).set(a.auth);
    expect((await request(app).get(`/api/documents/${doc.id}/report`).set(lawyer.auth)).status).toBe(200);
    expect((await request(app).get(`/api/documents/${doc.id}/report`).set(admin.auth)).status).toBe(404);
    expect((await request(app).get("/api/documents").set(a.auth)).body.total).toBe(1);
    expect((await request(app).get("/api/documents").set(lawyer.auth)).body.total).toBe(1); // only the one with a request
  });

  it("never returns the server-side file path or the owner id", async () => {
    const a = await makeUser("USER");
    const doc = await makeDoc(a.user.id);
    const body = JSON.stringify((await request(app).get(`/api/documents/${doc.id}`).set(a.auth)).body);
    expect(body).not.toContain("storagePath");
    expect(body).not.toContain("ownerId");
  });
});
