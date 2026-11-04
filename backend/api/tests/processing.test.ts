import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { AppError } from "../src/middleware/errorHandler";
import { analyzeFile, coreReport, db, makeDoc, makeUser } from "./mocks";

describe("Processing through core", () => {
  it("sends the file, the party and the active rules to core, and stores clauses with rule id and automatic score", async () => {
    const { user, auth } = await makeUser("USER");
    const doc = await makeDoc(user.id, { party: "tenant" });
    await db.rule.create({ data: { ruleId: "PEN-008", name: "x", category: "PENALTY", patterns: ["non-refundable"], severityWeight: 4, partyEffectHint: "UNFAVORABLE", explanation: "e" } });
    await db.rule.create({ data: { ruleId: "OFF-001", name: "off", category: "OTHER", patterns: ["zzz"], severityWeight: 1, partyEffectHint: "NEUTRAL", explanation: "e", isActive: false } });
    analyzeFile.mockResolvedValue(coreReport);

    const res = await request(app).post(`/api/documents/${doc.id}/process`).set(auth);

    expect(res.status).toBe(200);
    const call = analyzeFile.mock.calls[0][0];
    expect(call.party).toBe("tenant");
    expect(call.rules.map((r: { rule_id: string }) => r.rule_id)).toEqual(["PEN-008"]); // the inactive rule is not sent
    expect(call.rules[0]).toMatchObject({ category: "penalty", party_effect_hint: "unfavorable", severity_weight: 4 });
    expect(db.clause.rows).toHaveLength(2);
    expect(db.clause.rows[0]).toMatchObject({ ruleId: "PEN-008", autoScore: 8, category: "PENALTY", sentiment: "UNFAVORABLE" });
    expect(res.body.document.status).toBe("COMPLETED");
    expect(res.body.report.top_risks[0]).toMatchObject({ rule_id: "PEN-008", score: 8, label: "UNFAVORABLE" }); // reportItem object, not a string
  });

  it("returns a clear error and stores nothing when core is unreachable (no fake results)", async () => {
    const { user, auth } = await makeUser("USER");
    const doc = await makeDoc(user.id);
    analyzeFile.mockRejectedValue(new AppError(502, "The analysis service is not reachable.", "CORE_UNREACHABLE"));

    const res = await request(app).post(`/api/documents/${doc.id}/process`).set(auth);

    expect(res.status).toBe(502);
    expect(res.body.code).toBe("CORE_UNREACHABLE");
    expect(db.clause.rows).toHaveLength(0);
    expect(db.report.rows).toHaveLength(0);
    expect(db.document.rows[0]).toMatchObject({ status: "FAILED", failureCode: "CORE_UNREACHABLE" });
  });

  it("passes core's rejection of a scanned PDF through with its status and code", async () => {
    const { user, auth } = await makeUser("USER");
    const doc = await makeDoc(user.id, { fileName: "scan.pdf" });
    analyzeFile.mockRejectedValue(new AppError(422, "This PDF has no readable text (it looks scanned). OCR is not supported.", "SCANNED_PDF_UNSUPPORTED"));
    const res = await request(app).post(`/api/documents/${doc.id}/process`).set(auth);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("SCANNED_PDF_UNSUPPORTED");
  });

  it("refuses a second process request while one is running", async () => {
    const { user, auth } = await makeUser("USER");
    const doc = await makeDoc(user.id, { status: "PROCESSING" });
    const res = await request(app).post(`/api/documents/${doc.id}/process`).set(auth);
    expect(res.status).toBe(409);
    expect(analyzeFile).not.toHaveBeenCalled();
  });
});
