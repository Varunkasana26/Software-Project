"""Builds the sample PDFs from the .txt samples. Run: python core/data/make_pdfs.py

- two text-based PDFs (extractable text)
- one scanned-style PDF: the page is only an embedded image, so it has no text layer
"""
from pathlib import Path

from fpdf import FPDF
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
SAMPLES = HERE / "samples"


def text_pdf(txt_name: str, pdf_name: str) -> None:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)
    for line in (SAMPLES / txt_name).read_text(encoding="ascii").splitlines():
        pdf.multi_cell(0, 5, line or " ", new_x="LMARGIN", new_y="NEXT")
    pdf.output(str(SAMPLES / pdf_name))


def scanned_pdf(pdf_name: str) -> None:
    # Draw text into a bitmap, then place only the bitmap on the page.
    img = Image.new("RGB", (800, 1000), "white")
    draw = ImageDraw.Draw(img)
    draw.text((40, 40), "RENTAL AGREEMENT (scanned copy)\n\n1.1 Tenant shall pay rent monthly.", fill="black")
    img_path = HERE / "_scan.png"
    img.save(img_path)
    pdf = FPDF()
    pdf.add_page()
    pdf.image(str(img_path), x=10, y=10, w=190)
    pdf.output(str(SAMPLES / pdf_name))
    img_path.unlink()


if __name__ == "__main__":
    text_pdf("rental_balanced.txt", "rental_balanced.pdf")
    text_pdf("employment_2.txt", "employment_2.pdf")
    scanned_pdf("scanned_sample.pdf")
    print("PDFs written to", SAMPLES)
