// A small in-memory stand-in for the Prisma client, so the API can be tested without a database.
// It supports only what the services use: equality, OR, { not }, { lt }, orderBy, skip and take.
import { randomUUID } from "crypto";

type Row = Record<string, any>;

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "OR") return (cond as Row[]).some((w) => matches(row, w));
    if (cond && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond)) {
      if ("not" in cond) return row[key] !== cond.not;
      if ("lt" in cond) return row[key] < cond.lt;
    }
    return row[key] === cond;
  });
}

function sorted(rows: Row[], orderBy: Row | Row[] | undefined): Row[] {
  const keys = ([] as Row[]).concat(orderBy ?? []);
  return [...rows].sort((a, b) => {
    for (const o of keys) {
      const [k, dir] = Object.entries(o)[0] as [string, string];
      if (a[k] === b[k]) continue;
      return (a[k] > b[k] ? 1 : -1) * (dir === "desc" ? -1 : 1);
    }
    return 0;
  });
}

function table(defaults: () => Row = () => ({})) {
  const rows: Row[] = [];
  return {
    rows,
    create: async ({ data }: Row) => { const r = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...defaults(), ...data }; rows.push(r); return r; },
    createMany: async ({ data }: Row) => { for (const d of data) await (this as any).create({ data: d }); return { count: data.length }; },
    findUnique: async ({ where }: Row) => rows.find((r) => matches(r, where)) ?? null,
    findFirst: async ({ where, orderBy }: Row = {}) => sorted(rows.filter((r) => matches(r, where)), orderBy)[0] ?? null,
    findMany: async ({ where, orderBy, skip = 0, take }: Row = {}) => sorted(rows.filter((r) => matches(r, where)), orderBy).slice(skip, take === undefined ? undefined : skip + take),
    count: async ({ where }: Row = {}) => rows.filter((r) => matches(r, where)).length,
    update: async ({ where, data }: Row) => { const r = rows.find((x) => matches(x, where)); if (!r) throw new Error("not found"); Object.assign(r, data, { updatedAt: new Date() }); return r; },
    updateMany: async ({ where, data }: Row) => { const hit = rows.filter((r) => matches(r, where)); hit.forEach((r) => Object.assign(r, data, { updatedAt: new Date() })); return { count: hit.length }; },
    delete: async ({ where }: Row) => { const i = rows.findIndex((r) => matches(r, where)); if (i >= 0) rows.splice(i, 1); },
    deleteMany: async ({ where }: Row = {}) => { const keep = rows.filter((r) => !matches(r, where)); const n = rows.length - keep.length; rows.length = 0; rows.push(...keep); return { count: n }; },
  };
}

export function createFakePrisma() {
  const t = (d?: () => Row) => { const x = table(d); x.createMany = async ({ data }: Row) => { for (const r of data) await x.create({ data: r }); return { count: data.length }; }; return x; };
  const db: Row = {
    user: t(), document: t(() => ({ status: "UPLOADED", failureCode: null, party: "" })), clause: t(() => ({ lawyerOverride: null, lawyerOverrideReason: null, overriddenAt: null, warning: null, matchedRuleIds: [] })),
    report: t(() => ({ warnings: [] })), rule: t(() => ({ justification: "", isActive: true, position: 0 })),
    $queryRaw: async () => [1],
  };
  // A later clause row cascades with its document, as in the real database.
  const del = db.document.delete;
  db.document.delete = async (args: Row) => { const doc = db.document.rows.find((r: Row) => matches(r, args.where)); if (doc) { await db.clause.deleteMany({ where: { documentId: doc.id } }); await db.report.deleteMany({ where: { documentId: doc.id } }); } return del(args); };
  db.$transaction = async (fn: (tx: Row) => Promise<unknown>) => fn(db);
  db.reset = () => ["user", "document", "clause", "report", "rule"].forEach((k) => (db[k].rows.length = 0));
  return db;
}
