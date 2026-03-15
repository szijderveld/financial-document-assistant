import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import document_store
from agent import get_answer
from schemas import (
    ChatRequest,
    ChatResponse,
    Document,
    ExtractedDocument,
    ExtractedSection,
)

load_dotenv()

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).parent / "data" / "uploads"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: pre-extract manifest documents
    document_store.init()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="FinDoc AI API", version="1.0.0", lifespan=lifespan)

# CORS — allow frontend origins
_default_origins = [
    "http://localhost:5173",
    "https://findoc-ai.pages.dev",
    "https://findoc.samzijderveld.dev",
]
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o for o in _env_origins.split(",") if o] or _default_origins
# Always include the production frontends
for origin in _default_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# --- Document endpoints ---


@app.get("/api/documents")
async def list_documents():
    return document_store.list_documents()


@app.get("/api/documents/{doc_id}", response_model=ExtractedDocument)
async def get_document(doc_id: str):
    doc = document_store.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.get("/api/documents/{doc_id}/pdf")
async def get_document_pdf(doc_id: str):
    pdf_path = document_store.get_pdf_path(doc_id)
    if not pdf_path or not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    return FileResponse(
        str(pdf_path), media_type="application/pdf", filename=pdf_path.name
    )


@app.get("/api/documents/{doc_id}/sections/{section_index}", response_model=ExtractedSection)
async def get_document_section(doc_id: str, section_index: int):
    doc = document_store.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if section_index < 0 or section_index >= len(doc.sections):
        raise HTTPException(status_code=404, detail="Section not found")
    return doc.sections[section_index]


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    doc_id = f"upload-{uuid.uuid4().hex[:8]}"
    save_path = UPLOAD_DIR / f"{doc_id}.pdf"

    content = await file.read()
    save_path.write_bytes(content)

    try:
        extracted = document_store.extractor.extract(str(save_path))
        extracted.id = doc_id
        extracted.filename = file.filename
        document_store.add_document(doc_id, extracted, save_path)
    except ValueError as e:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        save_path.unlink(missing_ok=True)
        logger.exception("Failed to extract uploaded PDF")
        raise HTTPException(status_code=500, detail="Failed to process PDF")

    return extracted


# --- Chat endpoint ---


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Look up document and section
    doc = document_store.get_document(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if request.section_index < 0 or request.section_index >= len(doc.sections):
        raise HTTPException(status_code=404, detail="Section not found")

    section = doc.sections[request.section_index]
    document = Document(
        pre_text=section.pre_text,
        post_text=section.post_text,
        table=section.table,
    )

    try:
        result = await get_answer(
            document=document,
            conversation_history=request.conversation_history,
            question=request.question,
            model_name=request.model,
            calculation_memory=request.calculation_memory,
        )
        return ChatResponse(
            answer=result["answer"],
            reasoning=result["reasoning"],
            extracted_values=result["extracted_values"],
            program=result["program"],
            format_type=result["format_type"],
            model=request.model,
            calculation_memory=result["calculation_memory"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach the AI model service. Please try again later.",
        )
    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="The AI model took too long to respond. Please try again.",
        )
    except Exception:
        logger.exception("Unexpected error in /api/chat")
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while processing your question. Please try again.",
        )
