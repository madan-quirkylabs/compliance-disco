#!/usr/bin/env python3
"""
Generic PDF-to-Text converter.

Converts any PDFs in a directory to a single text file.
Works with any regulation, any language, any structure.

Usage:
    python scripts/pdf2text.py --source docs/regulations/dpdp/ --output workspace/shared-data/extracted-regulations/raw.txt
    python scripts/pdf2text.py --source docs/regulations/sebi/ --output /tmp/sebi-text.txt
"""

import argparse
import sys
from pathlib import Path

try:
    import pymupdf
except ImportError:
    print("ERROR: pymupdf not installed. Run: pip install pymupdf")
    sys.exit(1)


def convert(source_dir: str, output_file: str) -> str:
    """Convert all PDFs in source_dir to a single text file."""
    source = Path(source_dir)
    if not source.exists():
        print(f"ERROR: Source directory not found: {source_dir}")
        sys.exit(1)

    pdfs = sorted(source.glob("*.pdf"))
    if not pdfs:
        print(f"ERROR: No PDF files found in {source_dir}")
        sys.exit(1)

    print(f"Found {len(pdfs)} PDF(s) in {source_dir}")

    all_text = []
    for pdf_path in pdfs:
        print(f"  Converting: {pdf_path.name}")
        doc = pymupdf.open(str(pdf_path))
        page_count = doc.page_count

        pages = []
        for i, page in enumerate(doc):
            text = page.get_text()
            pages.append(f"--- Page {i+1} ---\n{text}")
        doc.close()

        full_text = "\n".join(pages)
        all_text.append(f"\n\n=== DOCUMENT: {pdf_path.name} ({page_count} pages) ===\n{full_text}")
        print(f"    Pages: {page_count}, Characters: {len(full_text)}")

    combined = "\n".join(all_text).strip()

    out = Path(output_file)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(combined)

    print(f"\nWrote: {output_file}")
    print(f"Total: {len(combined)} characters ({len(combined.split())} words)")
    return str(out)


def main():
    parser = argparse.ArgumentParser(description="Convert PDFs to plain text")
    parser.add_argument("--source", required=True, help="Directory containing PDF files")
    parser.add_argument("--output", required=True, help="Output text file path")
    args = parser.parse_args()

    convert(args.source, args.output)


if __name__ == "__main__":
    main()
