"""In-memory store for extracted PDF documents.

Pre-loads documents from the manifest on startup and supports
runtime additions via upload.
"""

import json
import logging
from pathlib import Path

from pdf_extractor import PDFExtractor
from schemas import ExtractedDocument

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data" / "documents"
UPLOAD_DIR = Path(__file__).parent / "data" / "uploads"

# Module-level store — populated by init()
_documents: dict[str, ExtractedDocument] = {}
_pdf_paths: dict[str, Path] = {}

extractor = PDFExtractor()


def init() -> None:
    """Pre-extract all documents listed in the manifest."""
    manifest_path = DATA_DIR / "manifest.json"
    if not manifest_path.exists():
        logger.warning("No manifest.json found at %s", manifest_path)
        return

    manifest = json.loads(manifest_path.read_text())

    for entry in manifest.get("documents", []):
        doc_id = entry["id"]
        pdf_path = DATA_DIR / entry["filename"]
        if not pdf_path.exists():
            logger.warning("PDF not found: %s", pdf_path)
            continue
        try:
            extracted = extractor.extract(str(pdf_path))
            # Use the manifest id (not the auto-generated one)
            extracted.id = doc_id
            _documents[doc_id] = extracted
            _pdf_paths[doc_id] = pdf_path
            logger.info(
                "Loaded %s: %d sections", doc_id, len(extracted.sections)
            )
        except Exception:
            logger.exception("Failed to extract %s", doc_id)


def get_document(doc_id: str) -> ExtractedDocument | None:
    return _documents.get(doc_id)


def get_pdf_path(doc_id: str) -> Path | None:
    return _pdf_paths.get(doc_id)


def add_document(doc_id: str, extracted: ExtractedDocument, pdf_path: Path) -> None:
    _documents[doc_id] = extracted
    _pdf_paths[doc_id] = pdf_path


def list_documents() -> list[dict]:
    """Return a summary list of all loaded documents."""
    manifest_path = DATA_DIR / "manifest.json"
    manifest_meta: dict[str, dict] = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        for entry in manifest.get("documents", []):
            manifest_meta[entry["id"]] = entry

    results = []
    for doc_id, doc in _documents.items():
        meta = manifest_meta.get(doc_id, {})
        results.append(
            {
                "id": doc_id,
                "filename": doc.filename,
                "label": meta.get("label", doc.filename),
                "shortLabel": meta.get("shortLabel", doc_id),
                "description": meta.get("description", ""),
                "company": meta.get("company", ""),
                "section_count": len(doc.sections),
                "page_count": doc.page_count,
            }
        )
    return results
