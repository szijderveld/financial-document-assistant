"""
ConvFinQA dataset ingestion schemas.

This module contains the Pydantic models that match the exact structure of the
ConvFinQA JSON dataset. These schemas are used to parse and validate the raw
dataset files.
"""

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field
from rich import print as rich_print

from logger import get_logger

logger = get_logger(__name__)


class Document(BaseModel):
    pre_text: str = Field(description="The text before the table in the document")
    post_text: str = Field(description="The text after the table in the document")
    table: dict[str, dict[str, float | str | int]] = Field(
        description="The table of the document as a dictionary "
    )


class Dialogue(BaseModel):
    conv_questions: list[str] = Field(
        description="The questions in the conversation dialogue, originally called 'dialogue_break'"
    )
    conv_answers: list[str] = Field(
        description="The answers to each question turn, derived from 'answer_list' and original FinQA answers"
    )
    turn_program: list[str] = Field(
        description="The DSL turn program for each question turn"
    )
    executed_answers: list[float | str] = Field(
        description="The golden program execution results for each question turn"
    )
    qa_split: list[bool] = Field(
        description="This field indicates the source of each question turn - 0 if from the decomposition of the first FinQA question, 1 if from the second. For the Type I simple conversations, this field is all 0s."
    )


class Features(BaseModel):
    num_dialogue_turns: int = Field(
        description="The number of turns in the dialogue, calculated from the length of conv_questions"
    )
    has_type2_question: bool = Field(
        description="Whether the dialogue has a type 2 question, calculated if qa_split contains a 1 this will return true"
    )
    has_duplicate_columns: bool = Field(
        description="Whether the table has duplicate column names not fully addressed during cleaning. We suffix the duplicate column headers with a number if there was no algorithmic fix. e.g. 'Revenue (1)' or 'Revenue (2) "
    )
    has_non_numeric_values: bool = Field(
        description="Whether the table has non-numeric values"
    )


class ConvFinQARecord(BaseModel):
    id: str = Field(description="The id of the record")
    doc: Document = Field(description="The document")
    dialogue: Dialogue = Field(description="The conversational dialogue")
    features: Features = Field(
        description="The features of the record to help understand the data"
    )


class ConvFinEnv(BaseModel):
    name: str = Field(description="The name of the environment")
    records: list[ConvFinQARecord] = Field(description="The list of records")

    @classmethod
    def from_json(
        cls, json_path: Path, split: Literal["train", "dev"] = "train"
    ) -> "ConvFinEnv":
        """Load and parse the ConvFinQA dataset into a ConvFinEnv.

        Args:
            json_path: Path to the ConvFinQA dataset JSON file
            split: Which data split to load ('train' or 'dev')

        Returns:
            ConvFinEnv containing the parsed records

        Raises:
            FileNotFoundError: If the JSON file doesn't exist
            ValueError: If the split doesn't exist or data is malformed
            ValidationError: If records don't match the expected schema
        """
        logger.info(f"Loading ConvFinQA dataset from {json_path}, split={split}")

        if not json_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {json_path}")

        try:
            with open(json_path) as f:
                data: dict[str, Any] = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to load dataset: {e}")
            raise ValueError(f"Invalid JSON file: {e}") from e

        if split not in data:
            raise ValueError(f"Split '{split}' not found in dataset")

        # Parse all records from the specified split
        records = [ConvFinQARecord(**record) for record in data[split]]

        logger.info(f"Successfully loaded {len(records)} records")
        rich_print(f"[green]Loaded {len(records)} {split} records[/green]")
        rich_print(f"[blue]Environment ID: {split}[/blue]")

        return cls(name=split, records=records)

    def find_record(self, record_id: str) -> ConvFinQARecord | None:
        """Find a record by its ID.

        Args:
            record_id: The ID of the record to find

        Returns:
            The matching record or None if not found
        """
        return next((r for r in self.records if r.id == record_id), None)
