"""Base agent class for ConvFinQA agents.

ConvFinQA conversations come in two types:
- Type I (Simple): Direct numerical calculations from table/text data
  Example: "What was revenue in 2019?" → Direct table lookup

- Type II (Hybrid): Multi-hop reasoning requiring both extraction AND calculation
  Example: "What percentage of total revenue was from Asia?" → Extract values → Calculate percentage
  Later turns often reference previous calculations, requiring memory management.
"""

from abc import ABC, abstractmethod

from langchain_openai import ChatOpenAI

from config import config
from logger import get_logger
from schemas.convfinqa import Document, Features

logger = get_logger(__name__)


class BaseAgent(ABC):
    """Base agent class for answering ConvFinQA questions.

    Architecture Decision: We use an abstract base class to:
    1. Enforce consistent interface across different agent strategies
    2. Share common functionality (table formatting, history management)
    3. Allow easy comparison of different approaches (direct vs. DSL-based)

    Subclasses must implement the chat() method with their specific strategy.
    """

    def __init__(
        self,
        document: Document,
        document_features: Features,
    ):
        """Initialize with document, features and LangChain ChatOpenAI model."""
        # Configuration consistency: use config default if not specified

        logger.info(
            f"Initializing {self.__class__.__name__} with model={config.model_name}"
        )
        self.document = document
        self.document_features = document_features
        self.base_llm = ChatOpenAI(
            model=config.model_name,
            temperature=config.temperature,
            api_key=config.api_key,
            max_tokens=config.max_tokens,
            timeout=config.timeout,
        )
        self.conversation_history: list[dict[str, str]] = []

    @abstractmethod
    def chat(self, user_input: str) -> str:
        """Generate a response to user input. Must be implemented by subclasses."""
        pass

    def _build_conversation_history(self) -> str:
        """Build formatted conversation history.

        Critical for Type II (Hybrid) conversations where later questions
        reference previous answers. For example:
        - Q1: "What was revenue in 2019?" A1: "1000"
        - Q2: "What was revenue in 2020?" A2: "1200"
        - Q3: "What's the percentage increase?" (requires A1 and A2)

        The agent must see full history to understand references.
        """
        if not self.conversation_history:
            return "No previous conversation."

        lines = []
        for i, turn in enumerate(self.conversation_history, 1):
            lines.append(f"Q{i}: {turn['question']}")
            lines.append(f"A{i}: {turn['answer']}")

        return "\n".join(lines)

    def _format_table(self, table: dict[str, dict[str, float | str | int]]) -> str:
        """Format table as readable text."""
        if not table:
            return "No table data"

        lines = []
        headers = list(table.keys())

        # Get all row keys
        all_rows: set[str] = set()
        for col_data in table.values():
            all_rows.update(col_data.keys())

        # Header row
        lines.append("| " + " | ".join([""] + headers) + " |")
        lines.append("|" + "-|" * (len(headers) + 1))

        # Data rows
        for row in sorted(all_rows):
            row_data = [row]
            for header in headers:
                value = table[header].get(row, "")
                row_data.append(str(value))
            lines.append("| " + " | ".join(row_data) + " |")

        return "\n".join(lines)
