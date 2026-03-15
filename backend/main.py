import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent import get_answer
from schemas import ChatRequest, ChatResponse

load_dotenv()

app = FastAPI(title="FinDoc AI API", version="1.0.0")

# CORS — allow frontend origins
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
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


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        answer, updated_memory = await get_answer(
            document=request.document,
            conversation_history=request.conversation_history,
            question=request.question,
            model_name=request.model,
            calculation_memory=request.calculation_memory,
        )
        return ChatResponse(
            answer=answer,
            model=request.model,
            calculation_memory=updated_memory,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
