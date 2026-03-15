"""
Metrics and matching utilities for ConvFinQA evaluation.

This module contains functions for parsing numeric values and comparing
predicted answers against ground truth with various tolerances.

Architecture Decisions:
1. Progressive Tolerance: Multiple matching strategies from strictest to most lenient
2. Financial-Aware Parsing: Handles $, %, commas, and unit suffixes (M, B, K)
3. Scale Factor Detection: Recognizes powers of 1000 differences (common in financial data)
4. Type Preservation: Maintains distinction between text answers ("yes"/"no") and numeric

Design Rationale:
- Financial data has many valid representations (1000 vs 1K vs 1,000)
- Percentage vs decimal is context-dependent (0.141 vs 14.1%)
- Scale mismatches are common when units are subtle and implied
"""

import math
import re

from config import config
from logger import get_logger

logger = get_logger(__name__)


def parse_numeric(value: str) -> tuple[float | None, bool]:
    """Parse a string to numeric value and percentage flag."""
    cleaned = value.strip().replace(",", "").replace("$", "")

    # Remove common units
    units = ["million", "billion", "thousand", "M", "B", "K"]
    for unit in units:
        cleaned = cleaned.replace(unit, "").strip()

    is_percentage = "%" in cleaned
    cleaned = cleaned.replace("%", "")

    # Check if it's a valid number
    if re.match(r"^-?\d+\.?\d*$", cleaned):
        return float(cleaned), is_percentage
    return None, False


def check_exact_match(predicted: str, true: str) -> bool:
    """Check for exact string match after whitespace stripping."""
    return predicted.strip() == true.strip()


def check_case_insensitive_match(predicted: str, true: str) -> bool:
    """Check for case-insensitive text match."""
    return predicted.strip().lower() == true.strip().lower()


def check_opposite_signs(pred_num: float, true_num: float) -> bool:
    """Check if values have opposite signs but sum to near zero."""
    return abs(pred_num + true_num) < config.opposite_sign_tolerance


def check_decimal_percentage_conversion(
    pred_num: float, true_num: float, pred_is_pct: bool, true_is_pct: bool
) -> bool:
    """Check if decimal and percentage values match after conversion."""
    if pred_is_pct == true_is_pct:
        return False

    decimal_val = pred_num if not pred_is_pct else true_num
    pct_val = true_num if true_is_pct else pred_num
    return abs(decimal_val * 100 - pct_val) < config.percentage_tolerance


def check_same_value_different_format(
    pred_num: float, true_num: float, pred_is_pct: bool, true_is_pct: bool
) -> bool:
    """Check if same numeric value with different percentage formatting."""
    if pred_is_pct == true_is_pct:
        return False

    return abs(pred_num - true_num) < config.percentage_tolerance


def check_percentage_tolerance(pred_num: float, true_num: float) -> bool:
    """Check if two percentage values match within tolerance."""
    return abs(pred_num - true_num) < config.percentage_tolerance


def check_scale_factor_difference(pred_num: float, true_num: float) -> bool:
    """
    Check for scale factor differences (powers of 1000).

    This handles cases like: 1 vs 1000, 0.1 vs 100000, etc.
    """
    if pred_num == 0 or true_num == 0:
        return False

    # Always use the larger number divided by smaller to get ratio >= 1
    larger = max(abs(pred_num), abs(true_num))
    smaller = min(abs(pred_num), abs(true_num))
    ratio = larger / smaller

    # Check if ratio is close to a power of 1000
    try:
        log_ratio = math.log10(ratio)
        # Check if log_ratio is close to a multiple of 3 (since log10(1000) = 3)
        power_of_3 = round(log_ratio / 3)
        expected_ratio = 1000**power_of_3

        # Allow some tolerance for floating point precision
        if (
            power_of_3 > 0
            and abs(ratio - expected_ratio) / expected_ratio
            < config.scale_factor_tolerance
        ):
            # Verify the base numbers are the same when scaled
            if (
                abs(smaller * expected_ratio - larger) / larger
                < config.scale_factor_tolerance
            ):
                return True
    except (ValueError, ZeroDivisionError):
        pass

    return False


def check_final_normalized_comparison(
    pred_num: float, true_num: float, pred_is_pct: bool, true_is_pct: bool
) -> bool:
    """Normalize values to same scale and compare with tolerance."""
    pred_val = pred_num / 100 if pred_is_pct else pred_num
    true_val = true_num / 100 if true_is_pct else true_num
    return abs(pred_val - true_val) < config.final_comparison_tolerance


def flexible_match(predicted: str, true: str) -> bool:
    """
    Check if two answers match with formatting tolerance.

    Applies a series of matching checks in order from strictest to most lenient:
    1. Exact string match
    2. Case-insensitive text match (for non-numeric values)
    3. Opposite signs matching
    4. Decimal to percentage conversion
    5. Same value different format
    6. Percentage rounding tolerance
    7. Scale factor differences (powers of 1000)
    8. Final normalized comparison

    Args:
        predicted: The predicted answer string
        true: The true answer string

    Returns:
        bool: True if answers match under any of the tolerance rules
    """
    # Check 1: Exact match
    if check_exact_match(predicted, true):
        return True

    # Parse both values
    pred_num, pred_is_pct = parse_numeric(predicted)
    true_num, true_is_pct = parse_numeric(true)

    # Check 2: Case-insensitive text match for non-numeric values
    if pred_num is None or true_num is None:
        return check_case_insensitive_match(predicted, true)

    # Check 3: Opposite signs
    if check_opposite_signs(pred_num, true_num):
        return True

    # Check 4: Decimal vs percentage conversion
    if check_decimal_percentage_conversion(
        pred_num, true_num, pred_is_pct, true_is_pct
    ):
        return True

    # Check 5: Same value different format
    if check_same_value_different_format(pred_num, true_num, pred_is_pct, true_is_pct):
        return True

    # Check 6: Percentage tolerance for matching percentage types
    if pred_is_pct and true_is_pct and check_percentage_tolerance(pred_num, true_num):
        return True

    # Check 7: Scale factor differences for regular numbers
    if (
        not pred_is_pct
        and not true_is_pct
        and check_scale_factor_difference(pred_num, true_num)
    ):
        return True

    # Check 8: Final normalized comparison
    return check_final_normalized_comparison(
        pred_num, true_num, pred_is_pct, true_is_pct
    )
