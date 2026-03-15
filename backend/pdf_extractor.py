"""PDF extraction pipeline for financial documents.

Uses pdfplumber for table detection/extraction and pymupdf (fitz) for
fast text extraction. Outputs structured sections with narrative text
and cleaned financial tables.
"""

import re
from pathlib import Path

import fitz  # pymupdf
import pdfplumber

from schemas import ExtractedDocument, ExtractedSection


def _parse_number(value: str) -> float | str | int:
    """Parse a financial number string into a numeric value.

    Handles:
    - Parenthetical negatives: (6) → -6, (1,234) → -1234
    - Dollar signs: $24,479 → 24479
    - Commas: 24,479 → 24479
    - Percentages: 5.2% → 5.2
    - Em dashes (—) → 0
    - Plain integers and floats
    """
    if not value or not value.strip():
        return ""

    s = value.strip()

    # Em dash, en dash, or lone hyphen → 0
    if s in ("—", "–", "−") or (s == "-" and len(s) == 1):
        return 0

    # Remove footnote markers like (1), (2) at end — only single/double digit
    s_no_fn = re.sub(r"\s*\(\d{1,2}\)\s*$", "", s)
    if s_no_fn and not re.match(r"^\([\$\d,.]", s_no_fn) and s_no_fn != "$":
        s = s_no_fn

    # Lone dollar sign
    if s == "$":
        return ""

    # Parenthetical negative: (123), (1,234.5), ($1,234), $(123)
    m = re.match(r"^[\$]?\([\$]?([\d,]+\.?\d*)\)%?$", s)
    if m:
        num_str = m.group(1).replace(",", "")
        try:
            val = float(num_str)
            return -int(val) if val == int(val) else -val
        except ValueError:
            return s

    # Unclosed parenthetical negative: $(799 or (799 (missing close paren)
    m = re.match(r"^[\$]?\(([\d,]+\.?\d*)\s*$", s)
    if m:
        num_str = m.group(1).replace(",", "")
        try:
            val = float(num_str)
            return -int(val) if val == int(val) else -val
        except ValueError:
            return s

    # Remove $, %, commas
    is_pct = "%" in s
    s = s.replace("$", "").replace("%", "").replace(",", "").strip()

    try:
        val = float(s)
        if is_pct:
            return val
        return int(val) if val == int(val) else val
    except ValueError:
        return value.strip()


def _merge_cells(row: list[str | None]) -> list[str]:
    """Merge split financial cells in a pdfplumber row.

    Financial PDFs often put '$', the number, and '%' in separate cells.
    This merges them: ['$', '2,575', ''] → ['$2,575']
    Also merges: ['(1.9', ')%'] → ['(1.9)%']
    And three-way: ['$', '(799', ')'] → ['$(799)']
    """
    cleaned = [c.strip() if c else "" for c in row]
    merged: list[str] = []
    i = 0
    while i < len(cleaned):
        cell = cleaned[i]

        # '$' followed by a number or opening paren → merge
        if cell == "$" and i + 1 < len(cleaned):
            next_cell = cleaned[i + 1]
            if next_cell and (next_cell[0].isdigit() or next_cell.startswith("(")):
                combined = f"${next_cell}"
                i += 2
                # Check if we also need to grab a closing paren/percent
                if "(" in combined and ")" not in combined and i < len(cleaned):
                    suffix = cleaned[i]
                    if suffix.startswith(")"):
                        combined += suffix
                        i += 1
                merged.append(combined)
                continue

        # Opening paren without close, next cell has close: '(1.9' + ')%' → '(1.9)%'
        if cell.startswith("(") and ")" not in cell and i + 1 < len(cleaned):
            next_cell = cleaned[i + 1]
            if next_cell.startswith(")"):
                merged.append(cell + next_cell)
                i += 2
                continue

        merged.append(cell)
        i += 1

    return merged


def _process_table(
    raw_table: list[list[str | None]],
) -> tuple[dict[str, dict[str, float | str | int]], str]:
    """Convert a pdfplumber table to dict-of-dicts format.

    Returns (table_dict, inferred_title).
    Format: {column_header: {row_label: value}}
    """
    if not raw_table or len(raw_table) < 2:
        return {}, ""

    # Merge split cells in every row
    rows = [_merge_cells(r) for r in raw_table]

    # Normalize row lengths
    max_cols = max(len(r) for r in rows)
    rows = [r + [""] * (max_cols - len(r)) for r in rows]

    # Parse header row — extract year/period info
    header = rows[0]
    inferred_title = ""

    # Try to extract column headers from the first row
    # Pattern: "(amounts in millions) 2025" or just "2025"
    year_pattern = re.compile(r"(20\d{2})")
    col_names: list[str] = []

    # First cell often has the title + year
    first_cell = header[0]
    if first_cell:
        inferred_title = first_cell
        years = year_pattern.findall(first_cell)
        if years:
            col_names.append(years[0])

    # Look for additional year columns in header
    for cell in header[1:]:
        if cell:
            years = year_pattern.findall(cell)
            if years:
                col_names.append(years[-1])

    # If we couldn't find year-based columns, use simple column indices
    if not col_names:
        # Count non-empty value columns in data rows
        for data_row in rows[1:]:
            vals = [c for c in data_row[1:] if c]
            if vals:
                col_names = [f"Value {i+1}" for i in range(len(vals))]
                break

    if not col_names:
        return {}, inferred_title

    # Build the table dict
    table_dict: dict[str, dict[str, float | str | int]] = {
        name: {} for name in col_names
    }

    for row in rows[1:]:
        if not row or not row[0]:
            continue

        label = row[0].replace("\n", " ").strip()
        if not label:
            continue

        # Extract values from non-label cells
        values = [c for c in row[1:] if c]

        # Handle case where value is embedded in the label
        # e.g., "Total Transformation Strategy Costs 133"
        # or "Non-GAAP Adjusted Operating Profit $ 2,890"
        if not values:
            # Try extracting trailing value from label:
            #   $ + number, number + %, or plain number (>= 2 digit chars)
            m = re.search(
                r"(?<=[a-zA-Z)]\s)\s*(\$\s*[\d,]+\.?\d*%?)\s*$"
                r"|(?<=[a-zA-Z)]\s)\s*([\d,]+\.?\d*%)\s*$"
                r"|(?<=[a-zA-Z)]\s)\s*([\d,]{2,}\.?\d*)\s*$",
                label,
            )
            if m:
                val_str = (m.group(1) or m.group(2) or m.group(3)).strip()
                label = label[: m.start()].strip()
                values = [val_str]
            else:
                continue

        # Skip sub-header rows (label with no extractable value)
        if not values:
            continue

        # Map values to columns
        for i, col_name in enumerate(col_names):
            if i < len(values):
                table_dict[col_name][label] = _parse_number(values[i])

    # Remove empty columns
    table_dict = {k: v for k, v in table_dict.items() if v}

    return table_dict, inferred_title


def _merge_single_row_tables(
    tables: list[list[list[str | None]]],
) -> list[list[list[str | None]]]:
    """Merge consecutive single-row tables into one multi-row table.

    Financial PDFs sometimes have each row detected as a separate table.
    """
    if not tables:
        return tables

    merged: list[list[list[str | None]]] = []
    current_group: list[list[str | None]] = []

    for table in tables:
        if len(table) == 1:
            current_group.append(table[0])
        else:
            if current_group:
                merged.append(current_group)
                current_group = []
            merged.append(table)

    if current_group:
        merged.append(current_group)

    return merged


def _process_wide_table(
    rows: list[list[str | None]],
) -> tuple[dict[str, dict[str, float | str | int]], str]:
    """Process a wide-format financial summary table.

    These tables have many columns (20+) representing multiple metrics
    side by side: Revenue, Op. Profit, Op. Margin for each period.
    """
    if not rows:
        return {}, ""

    # Merge cells in all rows
    merged_rows = [_merge_cells(r) for r in rows]

    # For wide tables, just convert to a simpler format
    # Each row becomes: {label: value1, value2, ...}
    # We'll name columns by index since headers are complex
    max_vals = 0
    data_entries: list[tuple[str, list[str]]] = []

    for row in merged_rows:
        cells = [c for c in row if c]
        if not cells:
            continue
        label = cells[0]
        values = cells[1:]
        if values:
            max_vals = max(max_vals, len(values))
            data_entries.append((label, values))

    if not data_entries or max_vals == 0:
        return {}, ""

    # Create column names
    col_names = [f"Col {i+1}" for i in range(max_vals)]
    table_dict: dict[str, dict[str, float | str | int]] = {
        name: {} for name in col_names
    }

    for label, values in data_entries:
        for i, val in enumerate(values):
            if i < len(col_names):
                table_dict[col_names[i]][label] = _parse_number(val)

    table_dict = {k: v for k, v in table_dict.items() if v}
    return table_dict, ""


class PDFExtractor:
    """Extracts structured data from financial PDF documents."""

    def extract(self, pdf_path: str) -> ExtractedDocument:
        """Extract structured sections from a PDF document.

        Args:
            pdf_path: Path to the PDF file.

        Returns:
            ExtractedDocument with sections containing narrative text and tables.

        Raises:
            ValueError: If the PDF cannot be read or appears to be scanned/image-based.
        """
        path = Path(pdf_path)
        if not path.exists():
            raise ValueError(f"PDF file not found: {pdf_path}")

        # Use pymupdf to get full text and page count
        fitz_doc = fitz.open(str(path))
        page_count = len(fitz_doc)
        full_text_parts: list[str] = []

        for page in fitz_doc:
            text = page.get_text()
            if text.strip():
                full_text_parts.append(text)

        full_text = "\n\n".join(full_text_parts)

        if not full_text.strip():
            fitz_doc.close()
            raise ValueError(
                "This PDF appears to be scanned or image-based. "
                "OCR is not supported in this version."
            )

        fitz_doc.close()

        sections = self._extract_sections(pdf_path)

        doc_id = path.stem.replace(" ", "-").lower()

        return ExtractedDocument(
            id=doc_id,
            filename=path.name,
            sections=sections,
            full_text=full_text,
            page_count=page_count,
        )

    def _extract_sections(self, pdf_path: str) -> list[ExtractedSection]:
        """Extract sections (narrative + table pairs) from the PDF."""
        sections: list[ExtractedSection] = []

        with pdfplumber.open(pdf_path) as pdf:
            pending_text: list[str] = []
            pending_pages: list[int] = []

            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                raw_tables = page.extract_tables()

                if not raw_tables:
                    # Pure narrative page — accumulate text
                    if page_text.strip():
                        pending_text.append(page_text.strip())
                        pending_pages.append(page_num)
                    continue

                # Get table bounding boxes for text region cropping
                found_tables = page.find_tables()
                table_bboxes = [t.bbox for t in found_tables]

                # Collect pre-text (accumulated narrative + text above first table)
                pre_text_parts = list(pending_text)
                pending_text = []

                if table_bboxes:
                    first_table_top = min(b[1] for b in table_bboxes)
                    if first_table_top > 10:
                        try:
                            cropped = page.crop((0, 0, page.width, first_table_top))
                            crop_text = cropped.extract_text()
                            if crop_text and crop_text.strip():
                                pre_text_parts.append(crop_text.strip())
                        except Exception:
                            pass

                # Merge single-row tables that are really one table
                processed_tables = _merge_single_row_tables(raw_tables)

                for table_idx, raw_table in enumerate(processed_tables):
                    # Decide processing strategy based on table width
                    first_row_len = len(raw_table[0]) if raw_table else 0
                    is_wide = first_row_len > 10

                    if is_wide:
                        table_dict, title = _process_wide_table(raw_table)
                    else:
                        table_dict, title = _process_table(raw_table)

                    if not table_dict:
                        continue

                    # Get post-text between this table and the next
                    post_text = ""
                    if table_bboxes and table_idx < len(table_bboxes):
                        table_bottom = table_bboxes[table_idx][3]
                        next_top = (
                            table_bboxes[table_idx + 1][1]
                            if table_idx + 1 < len(table_bboxes)
                            else page.height
                        )
                        if next_top - table_bottom > 10:
                            try:
                                cropped = page.crop(
                                    (0, table_bottom, page.width, next_top)
                                )
                                crop_text = cropped.extract_text()
                                if crop_text and crop_text.strip():
                                    post_text = crop_text.strip()
                            except Exception:
                                pass

                    section = ExtractedSection(
                        pre_text="\n\n".join(pre_text_parts),
                        post_text=post_text,
                        table=table_dict,
                        table_title=title,
                        page_numbers=pending_pages + [page_num],
                    )
                    sections.append(section)

                    pre_text_parts = []
                    if post_text:
                        pre_text_parts = [post_text]
                    pending_pages = [page_num]

            # Leftover narrative text with no table
            if pending_text:
                sections.append(
                    ExtractedSection(
                        pre_text="\n\n".join(pending_text),
                        post_text="",
                        table={},
                        table_title="",
                        page_numbers=pending_pages,
                    )
                )

        return sections
