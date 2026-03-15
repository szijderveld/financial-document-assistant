"""
COT DSL agent using Cloudflare Workers AI for financial document Q&A.

Architecture: LLM generates a DSL program (reasoning), then a deterministic
executor runs the arithmetic. This avoids LLM calculation errors.
"""

import json
import logging
import os

from langchain_cloudflare import ChatCloudflareWorkersAI
from langchain_core.messages import HumanMessage, SystemMessage

from dsl_executor import DSLExecutor
from prompts import DSL_EXAMPLES, SYSTEM_PROMPT, ProgramResponse, build_input_prompt
from schemas import ConversationEntry, Document
from table_formatter import format_table

logger = logging.getLogger(__name__)

MODEL_MAP = {
    "llama-3.1-8b": "@cf/meta/llama-3.1-8b-instruct",
    "llama-3.3-70b": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
}


def _build_conversation_history(history: list[ConversationEntry]) -> str:
    """Format conversation history as Q1:/A1: pairs."""
    if not history:
        return "No previous conversation."
    lines = []
    for i, turn in enumerate(history, 1):
        lines.append(f"Q{i}: {turn.question}")
        lines.append(f"A{i}: {turn.answer}")
    return "\n".join(lines)


def _build_calculation_memory(memory: list[float]) -> str:
    """Format calculation memory as #N: value lines."""
    if not memory:
        return "No previous calculations."
    return "\n".join(f"#{i}: {v}" for i, v in enumerate(memory))


def _parse_program_response(text: str) -> ProgramResponse:
    """Parse LLM output as JSON into ProgramResponse.

    Handles common LLM quirks: markdown code fences, trailing text.
    """
    content = text.strip()

    # Strip markdown code fences
    if content.startswith("```"):
        # Remove opening fence (with optional language tag)
        first_newline = content.index("\n")
        content = content[first_newline + 1:]
        # Remove closing fence
        if "```" in content:
            content = content[:content.rindex("```")]
        content = content.strip()

    # Try to extract JSON object if there's surrounding text
    if not content.startswith("{"):
        start = content.find("{")
        if start != -1:
            content = content[start:]
    if not content.endswith("}"):
        end = content.rfind("}")
        if end != -1:
            content = content[:end + 1]

    data = json.loads(content)
    return ProgramResponse(**data)


async def get_answer(
    document: Document,
    conversation_history: list[ConversationEntry],
    question: str,
    model_name: str = "llama-3.1-8b",
    calculation_memory: list[float] | None = None,
) -> dict:
    """Generate a DSL program via LLM, execute it deterministically, return formatted answer.

    Returns:
        dict with keys: answer, reasoning, extracted_values, program, format_type, calculation_memory
    """
    model_id = MODEL_MAP.get(model_name)
    if not model_id:
        raise ValueError(f"Unknown model: {model_name}. Choose from: {list(MODEL_MAP.keys())}")

    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    if not account_id or not api_token:
        raise ValueError("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set")

    if calculation_memory is None:
        calculation_memory = []

    llm = ChatCloudflareWorkersAI(
        model=model_id,
        account_id=account_id,
        api_token=api_token,
        temperature=0,
        max_tokens=512,
    )

    # Build prompts
    system_prompt = SYSTEM_PROMPT.format(examples=DSL_EXAMPLES)
    table_str = format_table(document.table)
    history_str = _build_conversation_history(conversation_history)
    memory_str = _build_calculation_memory(calculation_memory)

    user_prompt = build_input_prompt(
        pre_text=document.pre_text,
        table_str=table_str,
        post_text=document.post_text,
        history_str=history_str,
        memory_str=memory_str,
        user_input=question,
    )

    # Try structured output first, fall back to JSON parsing
    try:
        structured_llm = llm.with_structured_output(ProgramResponse)
        response = await structured_llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])
        if not isinstance(response, ProgramResponse):
            raise TypeError("Structured output not returned")
        program_response = response
    except Exception:
        logger.info("Structured output not supported, falling back to JSON parsing")
        raw_response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])
        program_response = _parse_program_response(raw_response.content)

    # Execute the DSL program deterministically
    executor = DSLExecutor(memory=calculation_memory)
    result = executor.execute(program_response.program)

    # Format the answer
    answer = executor.format_result(
        result.final_value,
        program_response.format_type,
        program_response.format_precision,
    )

    # Update calculation memory with numeric results
    updated_memory = list(calculation_memory)
    if isinstance(result.final_value, (int, float)):
        updated_memory.append(result.final_value)

    return {
        "answer": answer,
        "reasoning": program_response.reasoning,
        "extracted_values": program_response.extracted_values,
        "program": program_response.program,
        "format_type": program_response.format_type,
        "calculation_memory": updated_memory,
    }
