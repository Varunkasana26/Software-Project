import fs from "fs";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { db, makeUser } from "./mocks";

afterAll(() => fs.rmSync("test_uploads", { recursive: true, force: true }));

describe("Upload", () => {
  it("stores a text file for the signed-in user with the chosen party, and hides the server path", async () => {
    const { user, auth } = await makeUser("USER");
    const res = await request(app).post("/api/documents").set(auth).field("party", "Tenant")
      .attach("file", Buffer.from("1.1 The Tenant shall pay rent monthly."), { filename: "lease.txt", contentType: "text/plain" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ fileName: "lease.txt", status: "UPLOADED", party: "tenant" });
    expect(JSON.stringify(res.body)).not.toContain("test_uploads");
    expect(db.document.rows[0]).toMatchObject({ ownerId: user.id });
    expect(db.document.rows[0].storagePath).toMatch(/\.txt$/); // real extension, chosen from the content
  });

  it("checks the content, not the name or the Content-Type header", async () => {
    const { auth } = await makeUser("USER");
    const send = (name: string, body: Buffer, type: string) => request(app).post("/api/documents").set(auth).attach("file", body, { filename: name, contentType: type });
    const textAsPdf = await send("fake.pdf", Buffer.from("this is only text"), "application/pdf");
    expect(textAsPdf.status).toBe(415);
    expect(textAsPdf.body.code).toBe("UNSUPPORTED_TYPE");
    expect((await send("a.docx", Buffer.from("x"), "text/plain")).status).toBe(415);
    expect((await send("bin.txt", Buffer.from([0x89, 0x00, 0xff, 0x00]), "text/plain")).status).toBe(415);
    expect(db.document.rows).toHaveLength(0);
  });

  it("needs a signed-in user", async () => {
    const res = await request(app).post("/api/documents").attach("file", Buffer.from("x"), { filename: "a.txt", contentType: "text/plain" });
    expect(res.status).toBe(401);
  });
});
