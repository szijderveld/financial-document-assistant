"""
ConvFinQA schemas package.

This package organizes all Pydantic schemas used throughout the project into
logical modules:
- convfinqa: Raw JSON ingestion schemas (what you ingest from dataset)
"""

# ConvFinQA dataset schemas
from .convfinqa import ConvFinEnv, ConvFinQARecord, Dialogue, Document, Features

__all__ = [
    # ConvFinQA dataset
    "ConvFinQARecord",
    "Document",
    "Dialogue",
    "Features",
    "ConvFinEnv",
]
