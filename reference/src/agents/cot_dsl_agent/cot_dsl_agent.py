"""
Chain-of-Thought DSL Agent with Structured Output for ConvFinQA
Handles conversational numerical reasoning about financial documents

Architecture Decisions:
1. Structured Output (Pydantic): Enforces consistent LLM responses, preventing parsing errors
2. DSL Execution: Separates reasoning (LLM) from calculation (deterministic), avoiding LLM arithmetic errors
3. Conversation Memory: Maintains calculation results for Type II multi-hop reasoning
4. Prompt Engineering: Few-shot examples cover edge cases (percentages, ratios, comparisons)

Why DSL over Direct LLM Calculation:
- LLMs make arithmetic errors, especially with division and percentages
- DSL provides deterministic, testable calculations
- Clear separation of concerns: understanding vs. computation
"""

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from agents.base import BaseAgent
from logger import get_logger
from schemas.convfinqa import Document, Features

from .dsl_executor import DSLExecutor
from .prompts import DSL_EXAMPLES, SYSTEM_PROMPT, build_input_prompt

logger = get_logger(__name__)


# =============================================================================
# SCHEMA: Forces the LLM to output this exact structure
# =============================================================================


class ProgramResponse(BaseModel):
    """
    Structured output schema for DSL program generation.
    The LLM MUST output this exact structure via with_structured_output().
    """

    reasoning: str = Field(
        description="Step-by-step reasoning: 1) format classification with evidence, 2) values to extract, 3) calculation logic"
    )
    extracted_values: list[str] = Field(
        description="Values extracted from the document with source, e.g. ['206588 (net_cash, 2009)', '181001 (net_cash, 2008)']"
    )
    program: list[str] = Field(
        description=(
            "DSL program as list of steps. Operations: add(a,b), subtract(a,b), multiply(a,b), divide(a,b). "
            "Use #N to reference step N result (0-indexed). Use const_100, const_1000 for constants. "
            "For percentages: use divide(part, whole) - do NOT multiply by 100, formatting handles conversion."
        )
    )
    format_type: str = Field(
        description=(
            "Expected format type based on question context. Options: "
            "'percentage' (14.1%), 'ratio' (0.43), 'integer' (206588), 'decimal' (9362.2), 'yes_no' (yes/no)"
        )
    )
    format_precision: str = Field(
        description=(
            "Precision guidance for formatting in number of significant figures"
        )
    )


# =============================================================================
# AGENT: Combines LLM + DSL Executor with Conversational Memory
# =============================================================================


class ChainOfThoughtDSLAgent(BaseAgent):
    """
    Chain-of-thought agent that:
    1. Takes a question about a financial document
    2. Uses LLM with structured output to generate a DSL program
    3. Executes the program for guaranteed arithmetic accuracy
    4. Maintains conversation history for multi-turn reasoning
    """

    def __init__(
        self,
        document: Document,
        document_features: Features,
    ):
        super().__init__(document, document_features)

        self.structured_llm = self.base_llm.with_structured_output(ProgramResponse)

        # Build prompt template with DSL examples
        system_prompt = SYSTEM_PROMPT.format(examples=DSL_EXAMPLES)
        self.prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("human", "{input}")]
        )

        # Create processing chain and initialize state
        self.chain = self.prompt | self.structured_llm
        self.calculation_memory: list[float] = []

    def chat(self, user_input: str) -> str:
        """Answer a question about the financial document."""
        logger.info(f"Generating DSL program for: {user_input[:50]}...")

        # Build input prompt using base class helpers
        prompt_input = build_input_prompt(
            pre_text=self.document.pre_text,
            table_str=self._format_table(self.document.table),
            post_text=self.document.post_text,
            history_str=self._build_conversation_history(),
            memory_str=self._build_calculation_memory(),
            user_input=user_input,
        )

        # Generate and execute DSL program
        try:
            response = self.chain.invoke({"input": prompt_input})
            if not isinstance(response, ProgramResponse):
                raise ValueError(f"Expected ProgramResponse, got {type(response)}")
            logger.debug(f"DSL program: {response.program}")

            executor = DSLExecutor(memory=self.calculation_memory)
            execution_result = executor.execute(response.program)

            # Format the result using the LLM's specified format_type and format_precision
            answer = executor.format_result(
                execution_result.final_value,
                response.format_type,
                response.format_precision,
            )

            logger.info(f"DSL result: {answer}")

            self.conversation_history.append({"question": user_input, "answer": answer})

            # Append numeric results to calculation memory for #N references
            if isinstance(execution_result.final_value, (int, float)):
                self.calculation_memory.append(execution_result.final_value)

            return answer

        except Exception as e:
            logger.error(f"DSL execution failed: {e}")
            raise

    def _build_calculation_memory(self) -> str:
        """Build formatted calculation memory for context."""
        if not self.calculation_memory:
            return "No previous calculations."

        lines = []
        for i, value in enumerate(self.calculation_memory):
            lines.append(f"#{i}: {value}")
        return "\n".join(lines)
