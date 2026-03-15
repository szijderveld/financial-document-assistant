"""Evaluator for ConvFinQA agents.

Architecture Decisions:
1. Multi-Agent Comparison: Supports evaluating multiple agent strategies side-by-side
2. Flexible Matching: Uses tolerance-based matching for financial answers. Example answers have inconsistent
formatting so differentiate formating errors from understanding errors we can use the flexible score
3. Excel Export: Allow export to excel for review and results tracking
4. Random Sampling: Ensures unbiased evals

Design Rationale:
- Financial answers have various valid formats (14.1% vs 0.141)
- Excel output for ease of use, version tracking and additional calculations and exploration
"""

import random
from pathlib import Path
from typing import Any

import pandas as pd

from agents.base import BaseAgent
from agents.direct_prompt_agent.direct_prompt_agent import DirectPromptAgent
from config import config
from evaluator.metrics import flexible_match
from logger import get_logger
from schemas.convfinqa import ConvFinEnv, ConvFinQARecord

logger = get_logger(__name__)


class Evaluator:
    """Evaluates agent performance on ConvFinQA dataset."""

    def __init__(self, data_path: Path):
        """Initialize with dataset path."""
        self.env = ConvFinEnv.from_json(data_path)
        self.summary_excel_path = config.summary_excel_path

    def run_evaluation(
        self, agents: list[type[BaseAgent]], num_samples: int = 10
    ) -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
        """Evaluate agents on random sample of records."""
        logger.info(f"Starting evaluation with {num_samples} samples")

        # Sample random records
        sample_records = random.sample(self.env.records, num_samples)

        summary_results = []
        agent_details = {}

        for agent_class in agents:
            # Evaluate agent with the sample records using exact and flexible matching
            agent_results = self.evaluate_agent(sample_records, agent_class)

            # Calculate metrics for this agent
            agent_metrics = self._calculate_metrics(
                agent_results, sample_records, agent_class
            )
            summary_results.append(agent_metrics)
            agent_details[agent_class.__name__] = agent_results["agent_summary_df"]

        return pd.DataFrame(summary_results), agent_details

    def evaluate(
        self, agents: list[type[BaseAgent]] | None = None, num_samples: int = 5
    ) -> pd.DataFrame:
        """Evaluate agents on random sample of records."""
        if agents is None:
            agents = [DirectPromptAgent]

        summary_df, agent_details = self.run_evaluation(agents, num_samples=num_samples)

        # Export results to excel sheets
        export_path = Path(config.summary_excel_path)
        self.export_excel(summary_df, agent_details, export_path=export_path)
        logger.info(f"Evaluation completed - Results saved to {export_path}")

        return summary_df

    @staticmethod
    def evaluate_agent(
        sample_records: list[ConvFinQARecord], agent_class: type[BaseAgent]
    ) -> dict[str, int | pd.DataFrame]:
        """
        Evaluate agent performance on a list of records from the FinQA dataset.
        """
        logger.info(f"Evaluating {agent_class.__name__}...")
        exact_matches = 0
        flexible_matches = 0
        agent_rows = []

        for record in sample_records:
            # Initialize agent with record data
            agent = agent_class(record.doc, record.features)

            # Test all conversation turns
            for question, true_answer in zip(
                record.dialogue.conv_questions, record.dialogue.conv_answers
            ):
                try:
                    predicted_answer = agent.chat(question)
                    exact_match = predicted_answer.strip() == true_answer.strip()
                    flex_match = flexible_match(predicted_answer, true_answer)

                    if not flex_match:
                        logger.warning(
                            f"Answer mismatch - Expected: {true_answer}, Got: {predicted_answer}"
                        )

                    if exact_match:
                        exact_matches += 1
                    if flex_match:
                        flexible_matches += 1
                except Exception as e:
                    logger.error(f"Evaluation failed for record {record.id}: {e}")
                    predicted_answer = config.error_placeholder
                    exact_match = False
                    flex_match = False

                # Collect detailed results
                agent_rows.append(
                    {
                        "document_id": record.id,
                        "question": question,
                        "true_answer": true_answer,
                        "agent_answer": predicted_answer,
                        "num_dialogue_turns": record.features.num_dialogue_turns,
                        "has_type2_question": record.features.has_type2_question,
                        "has_duplicate_columns": record.features.has_duplicate_columns,
                        "has_non_numeric_values": record.features.has_non_numeric_values,
                        "exact_match": exact_match,
                        "flexible_match": flex_match,
                    }
                )

        return {
            "exact_matches": exact_matches,
            "flexible_matches": flexible_matches,
            "agent_summary_df": pd.DataFrame(agent_rows),
        }

    @staticmethod
    def _calculate_metrics(
        agent_results: dict[str, Any],
        sample_records: list[ConvFinQARecord],
        agent_class: type[BaseAgent],
    ) -> dict[str, Any]:
        """Calculate accuracy metrics for an agent."""
        total_questions = sum(
            len(record.dialogue.conv_questions) for record in sample_records
        )
        exact_accuracy = (
            (agent_results["exact_matches"] / total_questions) * 100
            if total_questions > 0
            else 0
        )
        flexible_accuracy = (
            (agent_results["flexible_matches"] / total_questions) * 100
            if total_questions > 0
            else 0
        )

        logger.info(
            f"Agent {agent_class.__name__}: Exact={exact_accuracy:.1f}%, Flexible={flexible_accuracy:.1f}%"
        )

        return {
            "Agent": agent_class.__name__,
            "Sample_Size": total_questions,
            "Exact_Matches": agent_results["exact_matches"],
            "Exact_Accuracy_%": round(exact_accuracy, 1),
            "Flexible_Matches": agent_results["flexible_matches"],
            "Flexible_Accuracy_%": round(flexible_accuracy, 1),
        }

    @staticmethod
    def export_excel(
        summary_df: pd.DataFrame,
        agent_details: dict[str, pd.DataFrame],
        export_path: Path,
    ) -> None:
        """Export evaluation results to Excel file."""
        with pd.ExcelWriter(export_path, engine="openpyxl") as writer:
            # Write summary sheet
            summary_df.to_excel(writer, sheet_name="Summary", index=False)

            # Write agent-specific sheets
            for agent_name, agent_df in agent_details.items():
                agent_df.to_excel(writer, sheet_name=agent_name, index=False)
