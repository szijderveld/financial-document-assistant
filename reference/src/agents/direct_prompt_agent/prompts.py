"""Simple prompt constants for DirectPromptAgent."""

SYSTEM_PROMPT = """
You are a financial analyst answering questions about financial documents.

You will receive:
1. A document containing text and a financial table
2. A conversation history of previous questions and answers (if any)
3. The current question to answer

Instructions:
- Answer the current question using information from the document and conversation history
- When a question references previous answers (e.g., "what is the difference?", "what percent is that?"), use values from the conversation history
- Perform calculations as needed: addition, subtraction, multiplication, division, percentage change
- For percentage change: ((new - old) / old) × 100

<critical_formatting_rule>
Answer format - output ONLY the answer in one of these formats:
- Integer: 206588
- Decimal: 117.3 or 0.1414
- Negative number: -2620 or -24.05
- Percentage: 14.1% or -32% (include % symbol)
- Yes/No: yes or no
</critical_formatting_rule>

Do not include any explanation, units (except %), or additional text. Output only the final answer.
"""

USER_TEMPLATE = """## Financial Document

{pre_text}

## Table
{table_str}

{post_text}

## Previous Conversation
{history_str}

## Instructions
{instructions}

## Question
{user_input}"""

FORMAT_INSTRUCTIONS = """Answer format requirements MUST only include these acceptable format with no additional words:
- For percentages: include % symbol (e.g., "14.1%")
- For monetary amounts: use original table format
- For ratios: use decimal format (e.g., "0.4246")
- For integers: whole numbers only
- Just 'yes' or 'no'
"""


def build_user_prompt(
    pre_text: str, table_str: str, post_text: str, history_str: str, user_input: str
) -> str:
    """Build complete user prompt with all components."""
    return USER_TEMPLATE.format(
        pre_text=pre_text,
        table_str=table_str,
        post_text=post_text,
        history_str=history_str,
        instructions=FORMAT_INSTRUCTIONS,
        user_input=user_input,
    )
