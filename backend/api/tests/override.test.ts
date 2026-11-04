import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { db, makeDoc, makeUser, storeAnalysis } from "./mocks";

async function setup() {
  const owner = await makeUser("USER");
  const doc = await makeDoc(owner.user.id, { status: "COMPLETED" });
  await storeAnalysis(doc.id);
  return { owner, doc, clause: db.clause.rows[0] };
}

describe("Lawyer override", () => {
  it("stores the override and reason, keeps the automatic score, and shows the override in the report", async () => {
    const { doc, clause } = await setup();
    const lawyer = await makeUser("LAWYER");

    const res = await request(app).patch(`/api/clauses/${clause.id}/override`).set(lawyer.auth).send({ score: 3, reason: "Standard for this market" });

    expect(res.status).toBe(200);
    expect(res.body.score).toEqual({ auto: 8, lawyer_override: 3 });
    expect(res.body.lawyer_override_reason).toBe("Standard for this market");
    expect(db.clause.rows[0]).toMatchObject({ autoScore: 8, lawyerOverride: 3, overriddenById: lawyer.user.id });
    const report = (await request(app).get(`/api/documents/${doc.id}/report`).set(lawyer.auth)).body;
    expect(report.top_risks[0].score).toBe(3); // the list shows the override
    expect(report.clauses[0].score.auto).toBe(8); // the original is still there
  });

  it("is lawyer-only and validates the input", async () => {
    const { owner, clause } = await setup();
    const lawyer = await makeUser("LAWYER");
    const admin = await makeUser("ADMIN");
    const url = `/api/clauses/${clause.id}/override`;
    expect((await request(app).patch(url).set(owner.auth).send({ score: 3, reason: "x" })).status).toBe(403);
    expect((await request(app).patch(url).set(admin.auth).send({ score: 3, reason: "x" })).status).toBe(403);
    expect((await request(app).patch(url).send({ score: 3, reason: "x" })).status).toBe(401);
    expect((await request(app).patch(url).set(lawyer.auth).send({ score: 11, reason: "x" })).status).toBe(400);
    expect((await request(app).patch(url).set(lawyer.auth).send({ score: 3, reason: "  " })).status).toBe(400);
    expect((await request(app).patch(url).set(lawyer.auth).send({ score: 3, reason: "x", autoScore: 0 })).status).toBe(400); // strict: no extra fields
    expect(db.clause.rows[0].lawyerOverride).toBeNull();
  });

  it("can be cleared, which restores the automatic score", async () => {
    const { clause } = await setup();
    const lawyer = await makeUser("LAWYER");
    await request(app).patch(`/api/clauses/${clause.id}/override`).set(lawyer.auth).send({ score: 1, reason: "r" });
    const res = await request(app).delete(`/api/clauses/${clause.id}/override`).set(lawyer.auth);
    expect(res.body.score).toEqual({ auto: 8, lawyer_override: null });
  });
});
