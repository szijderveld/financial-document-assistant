from pydantic import BaseModel


class Document(BaseModel):
    pre_text: str
    post_text: str
    table: dict[str, dict[str, float | str | int]]


class ConversationEntry(BaseModel):
    question: str
    answer: str


class ChatRequest(BaseModel):
    document: Document
    conversation_history: list[ConversationEntry] = []
    question: str
    model: str = "llama-3.1-8b"
    calculation_memory: list[float] = []


class ChatResponse(BaseModel):
    answer: str
    model: str
    calculation_memory: list[float] = []
