"""Screenshots of the REAL screens (real API, real database, real analysis). Needs the stack running and demo data:
    python scripts/start-all...   then   python scripts/demo-seed.py   then   python scripts/real-screenshots.py
Writes docs/design/screens/real/*.png. Requires: pip install playwright && python -m playwright install chromium
"""
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

OUT = Path(__file__).resolve().parents[1] / "docs" / "design" / "screens" / "real"
OUT.mkdir(parents=True, exist_ok=True)
APP = "http://localhost:5173"
ACCOUNTS = {"user": ("demo.user@example.com", "DemoUser-2026!"), "lawyer": ("demo.lawyer@example.com", "DemoLawyer-2026!"), "admin": ("demo.admin@example.com", "DemoAdmin-2026!")}


def sign_in(page: Page, who: str) -> None:
    email, password = ACCOUNTS[who]
    page.goto(f"{APP}/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    page.wait_for_url("**/upload")


def shot(page: Page, name: str, tag: str) -> None:
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / f"{name}-{tag}.png"), full_page=True)
    print("  saved", f"{name}-{tag}.png")


def run(p, width: int, height: int, tag: str) -> None:
    browser = p.chromium.launch()
    errors: list[str] = []

    def new_page(who: str) -> Page:
        page = browser.new_context(viewport={"width": width, "height": height}).new_page()
        page.on("console", lambda m: errors.append(f"{who}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"{who}: {e}"))
        sign_in(page, who)
        return page

    # Signed-in user: documents list and the real report of the analysed rental contract.
    page = new_page("user")
    page.goto(f"{APP}/documents")
    page.get_by_text("rental_landlord_friendly.txt").first.wait_for()
    shot(page, "01-documents", tag)
    page.locator("article", has_text="rental_landlord_friendly.txt").first.get_by_role("link", name="Open report").click()
    page.get_by_role("heading", name="Top 5 risks").wait_for()
    page.get_by_role("button", name="Why this was flagged").first.click()
    shot(page, "02-report", tag)

    # Lawyer: review screen, override one clause with a reason, then remove it again so the demo data stays clean.
    page = new_page("lawyer")
    page.goto(f"{APP}/documents")
    page.locator("article", has_text="rental_landlord_friendly.txt").first.get_by_role("link", name="Review").click()
    page.get_by_role("heading", name="Lawyer review").wait_for()
    page.get_by_label("Override score (0 to 10)").first.fill("3")
    page.get_by_label("Reason").first.fill("Market standard for a short-term lease; the tenant can leave after six months.")
    page.get_by_role("button", name="Save override").first.click()
    page.get_by_text("Saved. The original auto score").first.wait_for()
    shot(page, "03-lawyer-override", tag)
    page.get_by_role("button", name="Remove override").first.click()
    page.get_by_text("Override removed").first.wait_for()

    # Admin: the rules table, and the server refusing a pattern that could hang the analysis.
    page = new_page("admin")
    page.goto(f"{APP}/admin/rules")
    page.get_by_text("PEN-001").first.wait_for()
    shot(page, "04-rules-admin", tag)
    page.get_by_role("button", name="Add rule").click()
    page.get_by_label("Rule id").fill("DEMO-999")
    page.get_by_label("Name").fill("Demo rule")
    page.get_by_label("Patterns (regular expressions, one per line)").fill("(a+)+$")
    page.get_by_label("Explanation").fill("Demo")
    page.get_by_role("button", name="Save rule").click()
    page.get_by_text("catastrophic backtracking").wait_for()
    shot(page, "05-rules-bad-pattern-refused", tag)

    print(f"  browser console errors at {tag}: {errors if errors else 'none'}")
    browser.close()


if __name__ == "__main__":
    with sync_playwright() as p:
        run(p, 1440, 900, "1440")
        run(p, 390, 844, "390")
