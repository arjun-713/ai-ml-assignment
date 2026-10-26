#!/usr/bin/env python3
"""Build the academic report PDF from the local HTML source.

The HTML is printed with Chromium, then PyMuPDF adds running headers, page
numbers, PDF metadata, and bookmarks. A short two-pass loop fills the table of
contents with the page numbers observed in the rendered PDF.
"""

from __future__ import annotations

import re
from pathlib import Path

import fitz  # PyMuPDF
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "cardia-academic-report.html"
PDF = ROOT / "cardia-academic-report.pdf"
TEMP = ROOT / ".build-report.pdf"

ANCHORS = {
    "introduction": ("Introduction", "1. Introduction"),
    "background": ("Background and related work", "2. Background and related work"),
    "dataset": ("Dataset and exploratory analysis", "3. Dataset and exploratory analysis"),
    "methodology": ("Methodology", "4. Methodology"),
    "system": ("System design and implementation", "5. System design and implementation"),
    "results": ("Results", "6. Results"),
    "discussion": ("Discussion", "7. Discussion"),
    "limitations": ("Limitations and future work", "8. Limitations and future work"),
    "conclusion": ("Conclusion", "9. Conclusion"),
    "references": ("References", "References"),
    "appendix-a": ("Reproducibility commands", "A. Reproducibility commands"),
    "appendix-b": ("API example", "B. API example"),
    "appendix-c": ("Test inventory", "C. Test inventory"),
}


def print_pdf(target: Path) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox"],
        )
        page = browser.new_page()
        page.goto(HTML.as_uri(), wait_until="load")
        page.wait_for_load_state("networkidle")
        page.emulate_media(media="print")
        page.pdf(
            path=str(target),
            format="A4",
            print_background=True,
            prefer_css_page_size=True,
        )
        browser.close()


def find_toc_pages(pdf_path: Path) -> dict[str, int]:
    doc = fitz.open(pdf_path)
    texts = [page.get_text("text") for page in doc]
    toc_index = next(
        (i for i, text in enumerate(texts) if "Report map" in text and "contents" in text.lower()),
        None,
    )
    pages: dict[str, int] = {}
    for key, (needle, _) in ANCHORS.items():
        for i, text in enumerate(texts):
            if i == 0 or i == toc_index:
                continue
            if needle in text:
                pages[key] = i
                break
    doc.close()
    return pages


def update_toc(html: str, pages: dict[str, int]) -> str:
    for key, page in pages.items():
        html = re.sub(
            rf'(<span class="pg" data-anchor="{re.escape(key)}">)\d+(</span>)',
            rf'\g<1>{page}\g<2>',
            html,
        )
    return html


def finish_pdf(path: Path, pages: dict[str, int]) -> Path:
    doc = fitz.open(path)
    header_color = (0.37, 0.43, 0.40)
    line_color = (0.87, 0.89, 0.85)
    for i, page in enumerate(doc):
        if i == 0:
            continue
        width, height = page.rect.width, page.rect.height
        left = 48
        right = width - 48
        page.insert_text(
            (left, 27),
            "Cardia  ·  Heart Disease Detection",
            fontname="helv",
            fontsize=7.3,
            color=header_color,
        )
        right_text = "Academic Mini-Project"
        right_width = fitz.get_text_length(right_text, fontname="helv", fontsize=7.3)
        page.insert_text(
            (right - right_width, 27),
            right_text,
            fontname="helv",
            fontsize=7.3,
            color=header_color,
        )
        page.draw_line(
            fitz.Point(left, 33),
            fitz.Point(right, 33),
            color=line_color,
            width=0.45,
        )
        page.insert_text(
            (width / 2 - 2.2, height - 24),
            str(i),
            fontname="helv",
            fontsize=8,
            color=header_color,
        )

    doc.set_metadata(
        {
            "title": "Heart Disease Detection Using Machine Learning",
            "author": "Arjun",
            "subject": "Academic mini-project report: reproducible classification and a single-runtime Next.js deployment",
            "keywords": "heart disease, machine learning, logistic regression, UCI Cleveland, Next.js, Vercel",
            "creator": "Cardia report build",
            "producer": "Chromium / PyMuPDF",
        }
    )
    bookmarks = [[1, title, pages[key]] for key, (_, title) in ANCHORS.items() if key in pages]
    if bookmarks:
        doc.set_toc(bookmarks)
    output = path.with_name(".finished-report.pdf")
    doc.save(output, garbage=4, deflate=True)
    doc.close()
    return output


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    print_pdf(TEMP)
    pages = find_toc_pages(TEMP)
    missing = sorted(set(ANCHORS) - set(pages))
    if missing:
        raise RuntimeError(f"Could not find headings: {missing}")

    for _ in range(3):
        html = update_toc(html, pages)
        HTML.write_text(html, encoding="utf-8")
        print_pdf(TEMP)
        new_pages = find_toc_pages(TEMP)
        if new_pages == pages:
            break
        pages = new_pages
    else:
        raise RuntimeError(f"TOC page numbers did not stabilise: {pages}")

    finished = finish_pdf(TEMP, pages)
    finished.replace(PDF)
    TEMP.unlink(missing_ok=True)
    print(f"Wrote {PDF}")
    print("Page map:", pages)
    print("Pages:", fitz.open(PDF).page_count)


if __name__ == "__main__":
    main()
