"""LangChain agent using Cloudflare Workers AI for financial document Q&A."""

import os

from langchain_cloudflare import ChatCloudflareWorkersAI
from langchain_core.messages import HumanMessage, SystemMessage

from schemas import ConversationEntry, Document
from table_formatter import format_table

MODEL_MAP = {
    "llama-3.1-8b": "@cf/meta/llama-3.1-8b-instruct",
    "llama-3.3-70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
}

SYSTEM_PROMPT = """You are a financial analysis assistant. You answer questions about financial documents using precise numerical reasoning.

CRITICAL INSTRUCTIONS:
1. Provide ONLY the numerical answer or percentage (like "25587" or "14.1%")
2. Do NOT include explanations, reasoning steps, or additional text
3. For percentages, round to 1 decimal place and include the % symbol
4. For monetary values, provide the exact number without commas or dollar signs
5. Use context from previous conversation turns when answering follow-up questions
6. Extract values directly from the table when possible
7. Perform calculations step-by-step internally but output only the final answer

ANSWER FORMAT EXAMPLES:
- Direct table lookup: "206588"
- Percentage calculation: "14.1%"
- Subtraction result: "25587"
- Money values: "9362.2"

The answer must match the format expected in ConvFinQA dataset."""

USER_PROMPT_TEMPLATE = """FINANCIAL DOCUMENT ANALYSIS

Document Context:
{pre_text}

Financial Table:
{table_str}

Additional Context:
{post_text}

Conversation History:
{history_str}

Current Question: {question}

INSTRUCTIONS:
- Analyze the question in context of the document and previous conversation
- If asking for a direct value from the table, extract it exactly
- If asking for a calculation (difference, percentage change, etc.), compute it precisely
- If asking "what about in [year]?" refer to the previous question's context
- For percentage changes: ((new_value - old_value) / old_value) * 100
- Round percentages to 1 decimal place
- Provide ONLY the final numerical answer"""


def _build_conversation_history(history: list[ConversationEntry]) -> str:
    """Format conversation history as Q1:/A1: pairs."""
    if not history:
        return "No previous conversation."

    lines = []
    for i, turn in enumerate(history, 1):
        lines.append(f"Q{i}: {turn.question}")
        lines.append(f"A{i}: {turn.answer}")

    return "\n".join(lines)


async def get_answer(
    document: Document,
    conversation_history: list[ConversationEntry],
    question: str,
    model_name: str = "llama-3.1-8b",
) -> str:
    """Call Cloudflare Workers AI via LangChain and return the answer."""
    model_id = MODEL_MAP.get(model_name)
    if not model_id:
        raise ValueError(f"Unknown model: {model_name}. Choose from: {list(MODEL_MAP.keys())}")

    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    if not account_id or not api_token:
        raise ValueError("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set")

    llm = ChatCloudflareWorkersAI(
        model=model_id,
        account_id=account_id,
        api_token=api_token,
        temperature=0,
        max_tokens=256,
    )

    table_str = format_table(document.table)
    history_str = _build_conversation_history(conversation_history)

    user_prompt = USER_PROMPT_TEMPLATE.format(
        pre_text=document.pre_text,
        table_str=table_str,
        post_text=document.post_text,
        history_str=history_str,
        question=question,
    )

    response = await llm.ainvoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ])

    return response.content.strip()
