"""Smoke test against the RUNNING stack (core 8001, backend 8000). Run: python scripts/smoke-test.py

Checks: sign-in, upload with a party, analysis through core, the report against shared/contracts/report.schema.json,
rejection of a scanned PDF with the right code, and that another user cannot read the first user's report.
Exits 0 if every check passes, 1 otherwise.
"""
import json
import secrets
import sys
from pathlib import Path

import httpx
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
API = "http://localhost:8000/api"
CONTRACTS = ROOT / "shared" / "contracts"
SAMPLES = ROOT / "core" / "data" / "samples"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))
    return ok


def schema_validator() -> Draft202012Validator:
    registry = Registry()
    for name in ("clause.schema.json", "report.schema.json"):
        registry = registry.with_resource(name, Resource.from_contents(json.loads((CONTRACTS / name).read_text())))
    return Draft202012Validator(json.loads((CONTRACTS / "report.schema.json").read_text()), registry=registry)


def main() -> int:
    client = httpx.Client(timeout=90)
    print("Smoke test against", API)

    # 0. The stack is up.
    try:
        check("backend health", client.get(f"{API}/health").json().get("status") == "healthy")
        check("core health", httpx.get("http://localhost:8001/health", timeout=10).json().get("status") == "ok")
    except httpx.HTTPError as exc:
        print(f"  FAIL  cannot reach the stack: {exc.__class__.__name__}. Start it with scripts/start-all first.")
        return 1

    # 1. Two fresh users (random emails, so the test can be run repeatedly).
    def new_user(tag: str) -> dict:
        creds = {"email": f"smoke.{tag}.{secrets.token_hex(4)}@example.com", "password": "Smoke-" + secrets.token_hex(6)}
        client.post(f"{API}/auth/register", json=creds).raise_for_status()
        token = client.post(f"{API}/auth/login", json=creds).json()["token"]  # logs in again: also checks the login route
        return {"Authorization": f"Bearer {token}"}

    a, b = new_user("a"), new_user("b")
    check("register and login", True)

    # 2. Upload the landlord-friendly rental as a tenant, analyse it.
    sample = SAMPLES / "rental_landlord_friendly.txt"
    up = client.post(f"{API}/documents", headers=a, data={"party": "tenant"}, files={"file": (sample.name, sample.read_bytes(), "text/plain")})
    check("upload accepted", up.status_code == 201, f"HTTP {up.status_code}")
    doc_id = up.json()["id"]
    done = client.post(f"{API}/documents/{doc_id}/process", headers=a)
    check("analysis through core", done.status_code == 200, f"HTTP {done.status_code}")

    # 3. The report matches the shared contract.
    report = client.get(f"{API}/documents/{doc_id}/report", headers=a).json()
    errors = sorted(schema_validator().iter_errors(report), key=lambda e: list(e.path))
    check("report matches report.schema.json", not errors, errors[0].message[:80] if errors else f"{len(report['clauses'])} clauses")
    top = report["top_risks"][0] if report["top_risks"] else {}
    check("top risk is a reportItem with a rule id", bool(top.get("rule_id")) and isinstance(top.get("score"), (int, float)), f"{top.get('rule_id')} score {top.get('score')}")
    check("every clause has a score and category", all("auto" in c["score"] and c["category"] for c in report["clauses"]))

    # 4. A scanned PDF is rejected with the right code.
    scan = SAMPLES / "scanned_sample.pdf"
    up2 = client.post(f"{API}/documents", headers=a, data={"party": "tenant"}, files={"file": (scan.name, scan.read_bytes(), "application/pdf")})
    res2 = client.post(f"{API}/documents/{up2.json()['id']}/process", headers=a)
    check("scanned PDF rejected with SCANNED_PDF_UNSUPPORTED", res2.status_code == 422 and res2.json().get("code") == "SCANNED_PDF_UNSUPPORTED", f"HTTP {res2.status_code} {res2.json().get('code')}")

    # 5. User B cannot see user A's document.
    for what, path in (("report", f"/documents/{doc_id}/report"), ("document", f"/documents/{doc_id}"), ("clauses", f"/documents/{doc_id}/clauses")):
        r = client.get(f"{API}{path}", headers=b)
        check(f"user B cannot read user A's {what}", r.status_code == 404, f"HTTP {r.status_code}")
    check("signed-out request is refused", httpx.get(f"{API}/documents/{doc_id}/report", timeout=30).status_code == 401)  # a fresh client: `client` holds a login cookie

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)} of {len(results)} checks passed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
