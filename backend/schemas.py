from pydantic import BaseModel


class ExtractedSection(BaseModel):
    pre_text: str
    post_text: str
    table: dict[str, dict[str, float | str | int]]
    table_title: str = ""
    page_numbers: list[int] = []


class ExtractedDocument(BaseModel):
    id: str
    filename: str
    sections: list[ExtractedSection]
    full_text: str
    page_count: int
    extraction_status: str = "completed"


class Document(BaseModel):
    pre_text: str
    post_text: str
    table: dict[str, dict[str, float | str | int]]


class ConversationEntry(BaseModel):
    question: str
    answer: str


class ChatRequest(BaseModel):
    document_id: str
    section_index: int = 0
    conversation_history: list[ConversationEntry] = []
    question: str
    model: str = "llama-3.1-8b"
    calculation_memory: list[float] = []


class ChatResponse(BaseModel):
    answer: str
    reply: str = ""
    reasoning: str = ""
    extracted_values: list[str] = []
    program: list[str] = []
    format_type: str = ""
    model: str
    calculation_memory: list[float] = []
