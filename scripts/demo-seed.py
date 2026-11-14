"""Creates LOCAL DEMO data against the running stack: three accounts and two analysed contracts.

Run (after start-all):  python scripts/demo-seed.py

The demo passwords are public, for a local demo only. Never use them anywhere real.
Accounts are created by backend/api/scripts/seed-users.ts (it sets the lawyer and admin roles, which the API cannot do).
"""
import subprocess
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
API = "http://localhost:8000/api"
USER = {"email": "demo.user@example.com", "password": "DemoUser-2026!"}
SAMPLES = [("rental_landlord_friendly.txt", "tenant"), ("employment_1.txt", "employee")]


def main() -> int:
    offline = "--offline" in sys.argv  # offline demo backend: the accounts already exist in memory
    done = None
    if offline:
        print("Offline demo: the backend created the demo accounts when it started.")
    else:
        print("Creating demo accounts (user, lawyer, admin)...")
        done = subprocess.run("npm run seed:users", cwd=ROOT / "backend" / "api", shell=True, capture_output=True, text=True)
    if done is not None and done.returncode != 0:
        print(done.stdout[-600:], done.stderr[-600:])
        print("Could not create the accounts. Is backend/api/.env filled in and the schema pushed (npm run db:push)?")
        return 1
    if done is not None:
        print("\n".join(line for line in done.stdout.splitlines() if "@" in line))

    with httpx.Client(timeout=60) as client:
        login = client.post(f"{API}/auth/login", json=USER)
        if login.status_code != 200:
            print("Demo user could not sign in:", login.status_code, login.text[:200])
            return 1
        headers = {"Authorization": f"Bearer {login.json()['token']}"}
        existing = {d["fileName"] for d in client.get(f"{API}/documents?limit=100", headers=headers).json()["data"]}
        for name, party in SAMPLES:
            if name in existing:
                print(f"  {name}: already uploaded, skipped")
                continue
            path = ROOT / "core" / "data" / "samples" / name
            up = client.post(f"{API}/documents", headers=headers, data={"party": party}, files={"file": (name, path.read_bytes(), "text/plain")})
            up.raise_for_status()
            result = client.post(f"{API}/documents/{up.json()['id']}/process", headers=headers)
            if result.status_code != 200:
                print(f"  {name}: analysis failed: {result.status_code} {result.json().get('error')}. Is core running on port 8001?")
                return 1
            print(f"  {name}: analysed as {party}: {result.json()['report']['summary']}")

    print("\nDone. Sign in at http://localhost:5173 with:")
    print("  user    demo.user@example.com    DemoUser-2026!")
    print("  lawyer  demo.lawyer@example.com  DemoLawyer-2026!")
    print("  admin   demo.admin@example.com   DemoAdmin-2026!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
