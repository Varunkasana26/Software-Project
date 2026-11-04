import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { db, makeUser, validateRules } from "./mocks";

const rule = { ruleId: "TST-001", name: "Test rule", category: "PENALTY", patterns: ["late fee"], severityWeight: 2, partyEffectHint: "UNFAVORABLE", explanation: "A late fee is charged." };

describe("Rules admin", () => {
  it("lets any signed-in user read rules but only an admin change them", async () => {
    const user = await makeUser("USER");
    const lawyer = await makeUser("LAWYER");
    const admin = await makeUser("ADMIN");
    expect((await request(app).get("/api/rules").set(user.auth)).status).toBe(200);
    for (const who of [user, lawyer]) expect((await request(app).post("/api/rules").set(who.auth).send(rule)).status).toBe(403);
    const created = await request(app).post("/api/rules").set(admin.auth).send(rule);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ ruleId: "TST-001", patterns: ["late fee"], isActive: true });
    expect((await request(app).patch(`/api/rules/${created.body.id}`).set(user.auth).send({ isActive: false })).status).toBe(403);
    expect((await request(app).delete(`/api/rules/${created.body.id}`).set(user.auth)).status).toBe(403);
  });

  it("asks core to check the patterns and refuses a rule core rejects", async () => {
    const admin = await makeUser("ADMIN");
    validateRules.mockResolvedValue([{ rule_id: "TST-001", message: "Rule TST-001: bad regex '(oops'" }]);
    const res = await request(app).post("/api/rules").set(admin.auth).send({ ...rule, patterns: ["(oops"] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_RULE");
    expect(db.rule.rows).toHaveLength(0);
  });

  it("rejects unknown fields, so a caller cannot set id or timestamps", async () => {
    const admin = await makeUser("ADMIN");
    const res = await request(app).post("/api/rules").set(admin.auth).send({ ...rule, id: "11111111-1111-1111-1111-111111111111", createdAt: "2001-01-01" });
    expect(res.status).toBe(400);
    expect(db.rule.rows).toHaveLength(0);
  });

  it("updates, validating the merged rule, and deletes", async () => {
    const admin = await makeUser("ADMIN");
    const id = (await request(app).post("/api/rules").set(admin.auth).send(rule)).body.id;
    const res = await request(app).patch(`/api/rules/${id}`).set(admin.auth).send({ isActive: false, severityWeight: 3 });
    expect(res.body).toMatchObject({ isActive: false, severityWeight: 3, patterns: ["late fee"] });
    expect(validateRules.mock.calls.at(-1)![0][0]).toMatchObject({ rule_id: "TST-001", severity_weight: 3 });
    expect((await request(app).delete(`/api/rules/${id}`).set(admin.auth)).status).toBe(204);
    expect(db.rule.rows).toHaveLength(0);
  });
});
