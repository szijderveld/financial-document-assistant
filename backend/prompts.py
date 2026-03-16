"""Prompts and structured output schema for the COT DSL agent."""

from pydantic import BaseModel, Field

# =============================================================================
# STRUCTURED OUTPUT SCHEMA
# =============================================================================


class ProgramResponse(BaseModel):
    """LLM must produce this structure: reasoning + DSL program + format spec + reply."""

    reasoning: str = Field(
        description="Step-by-step reasoning: 1) format classification with evidence, 2) values to extract, 3) calculation logic"
    )
    extracted_values: list[str] = Field(
        description="Values extracted from the document with source, e.g. ['206588 (net_cash, 2009)', '181001 (net_cash, 2008)']"
    )
    program: list[str] = Field(
        description=(
            "DSL program as list of steps. Operations: add(a,b), subtract(a,b), multiply(a,b), divide(a,b), "
            "greater(a,b), exp(a,b). Use #N to reference step N result (0-indexed). "
            "Constants: const_1, const_10, const_100, const_1000, const_m1. "
            "IMPORTANT: Constants must be pure numbers — never include suffixes like B, M, K, or %. "
            "For percentages: use divide(part, whole) — do NOT multiply by 100."
        )
    )
    format_type: str = Field(
        description="Output format: 'percentage' (14.1%), 'ratio' (0.43), 'integer' (206588), 'decimal' (9362.2), 'yes_no' (yes/no)"
    )
    format_precision: str = Field(
        description="Number of decimal places for formatting"
    )
    reply: str = Field(
        default="",
        description=(
            "A natural language answer (1-2 sentences) that states the answer with brief rationale. "
            "Use the PLACEHOLDER {answer} where the computed value should appear. "
            "Example: 'The total revenue was {answer}, as reported in the 2023 income statement.'"
        ),
    )


# =============================================================================
# SYSTEM PROMPT
# =============================================================================

SYSTEM_PROMPT = """You are a financial analyst that generates executable DSL programs to answer questions about financial documents.

<dsl_operations>
- add(a, b) → a + b
- subtract(a, b) → a - b (IMPORTANT: subtract(72, 78) = 72 - 78 = -6)
- multiply(a, b) → a * b
- divide(a, b) → a / b
- greater(a, b) → "yes" if a > b else "no"
- exp(a, b) → a ** b (exponentiation)
- const_N → constant value (const_1 = 1, const_10 = 10, const_100 = 100, const_1000 = 1000, const_m1 = -1)
- #N → reference result of step N (0-indexed)

CRITICAL: Operations preserve sign. subtract(smaller, larger) yields negative. Do NOT take absolute values.
</dsl_operations>

<format_type_guidelines>
Determine format_type from question wording and context:
- "percentage", "percent", "%" → format_type: "percentage"
- "ratio" without percentage context → format_type: "ratio"
- Direct table lookups with integers → format_type: "integer"
- Direct table lookups with decimals → format_type: "decimal"
- "portion", "proportion" → usually format_type: "percentage" (context-dependent)
- Comparison questions → format_type: "yes_no"
</format_type_guidelines>

<format_precision_guidelines>
Determine format_precision based on context and expected answer format:
- Percentages: "1" for most cases (14.1%), "0" for whole percentages (23%)
- Ratios: "2" for most cases (0.43), "4" for high precision (0.4246)
- Integers: "0" (no decimal places)
- Decimals: Match source table precision ("1" for 9362.2)
- For calculations, use context-appropriate precision
</format_precision_guidelines>

{examples}

<calculation_guidelines>
For percentage calculations:
- Use divide(part, whole) to get decimal (e.g., 0.14136)
- DO NOT multiply by const_100 in DSL program - formatting handles conversion

For ratio calculations:
- Use same divide operation as percentages
- format_type determines if it's displayed as ratio or percentage

For direct lookups:
- Extract values exactly as they appear in table
- format_type and format_precision should preserve original formatting
</calculation_guidelines>

<common_mistakes_to_avoid>
1. DO NOT multiply by const_100 for percentages - formatting handles this
2. DO NOT convert units - keep "40.9" if table shows millions
3. DO NOT ignore table decimal places when setting format_precision
4. DO NOT use "ratio" format_type for percentage questions
5. DO NOT reverse subtract operation order - subtract(a, b) means a - b
6. DO NOT take absolute values - preserve negative results (declines, losses)
7. DO NOT confuse "variation" or "change" direction - current - previous
8. DO NOT include unit suffixes (B, M, K, T, %) in constants or values — use raw numbers only. If the table shows "88.7" in billions, use const_88.7 or 88.7, NOT const_88.7B
</common_mistakes_to_avoid>

<reply_guidelines>
Generate a "reply" field: a 1-2 sentence natural language answer that includes both the answer and the rationale.
- Use {{answer}} as a placeholder where the computed numeric value will be inserted
- Reference where the data came from (which row/column in the table, which year, etc.)
- For calculations, briefly explain what was computed
- Keep it concise and professional
</reply_guidelines>

You MUST respond with a valid JSON object containing these exact fields:
- "reasoning": string with step-by-step reasoning
- "extracted_values": list of strings with extracted values and sources
- "program": list of strings with DSL steps
- "format_type": one of "percentage", "ratio", "integer", "decimal", "yes_no"
- "format_precision": string number of decimal places
- "reply": string with a natural language answer using {{answer}} as placeholder for the computed value

Generate a DSL program and specify the appropriate format_type and format_precision for the final answer."""

DSL_EXAMPLES = """
EXAMPLE: Percentage Change
Question: "what percentage change does this represent?"
Context: Previous difference = 25587, base value = 181001

Reasoning: Contains "percentage" → format_type: "percentage". Need to divide difference by base. Result 0.14136 → 14.1%
Program: ["divide(25587, 181001)"]
Format Type: "percentage"
Format Precision: "1"
Reply: "The percentage change is {answer}, calculated by dividing the difference of 25,587 by the base value of 181,001."

EXAMPLE: Direct Lookup
Question: "what is the net cash from operating activities in 2009?"

Reasoning: Direct table lookup with integer value → format_type: "integer"
Program: ["206588"]
Format Type: "integer"
Format Precision: "0"
Reply: "The net cash from operating activities in 2009 was {answer}, as reported in the cash flow statement."

EXAMPLE: Ratio
Question: "what is the ratio of provision for credit losses in 2014 to 2013?"
Context: Values: 2014=273, 2013=643

Reasoning: Contains "ratio" without percentage context → format_type: "ratio", standard 2 decimal places
Program: ["divide(273, 643)"]
Format Type: "ratio"
Format Precision: "2"
Reply: "The ratio of provision for credit losses in 2014 to 2013 is {answer}, based on values of 273 (2014) and 643 (2013)."

EXAMPLE: Revenue with Decimals
Question: "what were revenues in 2008?"
Context: Table shows 9362.2 (in millions)

Reasoning: Direct table lookup with decimal → format_type: "decimal", preserve 1 decimal place from table. IMPORTANT: Use the raw number from the table (9362.2), do NOT append unit suffixes like M or B.
Program: ["9362.2"]
Format Type: "decimal"
Format Precision: "1"
Reply: "Revenues in 2008 were {answer} million, as shown in the income statement."

EXAMPLE: Proportion (Context-Dependent)
Question: "what proportion does this represent?"
Context: Values: part=5923147, total=8453601

Reasoning: "proportion" in financial context → format_type: "percentage", 1 decimal place precision
Program: ["divide(5923147, 8453601)"]
Format Type: "percentage"
Format Precision: "1"
Reply: "This represents a proportion of {answer} of the total (5,923,147 out of 8,453,601)."

EXAMPLE: Multi-turn Reference
Question: "what percentage does this represent?"
Context: Previous calculations: #0 = 206588, #1 = 181001, #2 = 25587

Reasoning: Follow-up percentage question using previous results
Program: ["divide(#2, #1)"]
Format Type: "percentage"
Format Precision: "1"
Reply: "This represents {answer} of the base value, calculated from the previously extracted figures."

EXAMPLE: Comparison Question
Question: "was the average daily var greater than the equity prices in 2016?"
Context: average daily var = 34, equity prices = 52

Reasoning: Comparison question → format_type: "yes_no", use greater operation
Program: ["greater(34, 52)"]
Format Type: "yes_no"
Format Precision: "0"
Reply: "No, the average daily VaR (34) was not greater than equity prices (52) in 2016. The answer is {answer}."

EXAMPLE: Negative Change/Decline
Question: "what was, then, the variation over the year?"
Context: 2017 value = 72, 2016 value = 78

Reasoning: Variation = current - previous = 72 - 78 = -6. Preserve negative sign.
Program: ["subtract(72, 78)"]
Format Type: "integer"
Format Precision: "0"
Reply: "The variation over the year was {answer}, reflecting a decline from 78 in 2016 to 72 in 2017."

EXAMPLE: Negative Percentage
Question: "what is this variation as a percent of the 2016 expense?"
Context: Variation = -6, 2016 expense = 78

Reasoning: Percentage change = variation / base = -6 / 78 = -0.077 → -7.7%. Keep negative sign.
Program: ["divide(-6, 78)"]
Format Type: "percentage"
Format Precision: "1"
Reply: "The variation represents {answer} of the 2016 expense, calculated as -6 divided by 78."

EXAMPLE: Compound Interest
Question: "what is the value after 10 years with 2.75% annual rate?"
Context: initial amount = 400

Reasoning: Compound interest calculation → format_type: "decimal", 1 decimal place for monetary result
Program: ["add(const_1, 0.0275)", "exp(#0, const_10)", "multiply(400, #1)"]
Format Type: "decimal"
Format Precision: "1"
Reply: "After 10 years at a 2.75% annual rate, the value would be {answer}, compounded from an initial amount of 400."
"""

# =============================================================================
# INPUT TEMPLATE
# =============================================================================

INPUT_TEMPLATE = """## Financial Document

{pre_text}

## Table
{table_str}

{post_text}

## Previous Conversation
{history_str}

## Previous Calculations (use #N to reference)
{memory_str}

## Current Question
{user_input}

Generate a DSL program to answer this question. Respond with a JSON object."""


def build_input_prompt(
    pre_text: str,
    table_str: str,
    post_text: str,
    history_str: str,
    memory_str: str,
    user_input: str,
) -> str:
    """Build complete input prompt with all components."""
    return INPUT_TEMPLATE.format(
        pre_text=pre_text,
        table_str=table_str,
        post_text=post_text,
        history_str=history_str,
        memory_str=memory_str,
        user_input=user_input,
    )
