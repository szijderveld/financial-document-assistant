"""Direct prompting baseline agent for ConvFinQA."""

from langchain_core.messages import HumanMessage, SystemMessage

from agents.base import BaseAgent
from logger import get_logger

from .prompts import SYSTEM_PROMPT, build_user_prompt

logger = get_logger(__name__)


class DirectPromptAgent(BaseAgent):
    """Baseline agent that uses direct prompting with conversation history."""

    def chat(self, user_input: str) -> str:
        """Generate a response using the document context."""
        logger.info(f"Processing question: {user_input[:50]}...")

        # Build user prompt using base class functions
        user_prompt = build_user_prompt(
            pre_text=self.document.pre_text,
            table_str=self._format_table(self.document.table),
            post_text=self.document.post_text,
            history_str=self._build_conversation_history(),
            user_input=user_input,
        )

        # Get response
        try:
            response = self.base_llm.invoke(
                [
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(content=user_prompt),
                ]
            )
            content = response.content
            if isinstance(content, str):
                return content.strip()
            else:
                # Handle case where content is a list
                return str(content).strip()
        except Exception as e:
            logger.error(f"LLM API call failed: {e}")
            raise
