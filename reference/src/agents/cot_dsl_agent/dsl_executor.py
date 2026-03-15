"""
DSL executor for ConvFinQA with Pydantic interface.

Architecture Decisions:
1. Stateless Execution: Each execute() call is independent, memory passed explicitly
2. Safe Evaluation: No eval() - explicit operation parsing for security
3. Flexible Token Parsing: Handles various number formats (negatives, decimals, constants)
4. Memory References: Supports #N syntax for multi-step calculations

Design Rationale:
- Deterministic execution ensures reproducible results
- Explicit operation mapping prevents code injection
- Memory system enables complex multi-hop reasoning (Type II conversations)
- Pydantic models provide type safety and validation
"""

import logging
import re
from collections.abc import Callable

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================


class ExecutionResult(BaseModel):
    """Result of DSL execution."""

    final_value: float | str
    steps_executed: int = Field(ge=0)
    intermediate_results: list[float | str] = Field(default_factory=list)


class DSLExecutor(BaseModel):
    """Executes DSL programs for ConvFinQA."""

    memory: list[float] = Field(default_factory=list)

    # Class-level constants
    _OPERATIONS: dict[str, Callable[[float, float], float | str]] = {
        "add": lambda a, b: a + b,
        "subtract": lambda a, b: a - b,
        "multiply": lambda a, b: a * b,
        "divide": lambda a, b: a / b if b != 0 else float("inf"),
        "greater": lambda a, b: "yes" if a > b else "no",
        "exp": lambda a, b: a**b,
    }
    _OPERATION_PATTERN: re.Pattern[str] = re.compile(r"^(\w+)\((.+),\s*(.+)\)$")

    def execute(self, program: list[str]) -> ExecutionResult:
        """Execute a DSL program and return result."""
        logger.debug(
            f"Executing program with {len(program)} steps, memory={self.memory}"
        )
        results: list[float | str] = []

        for i, step in enumerate(program):
            result = self._execute_step(step.strip(), results)
            results.append(result)
            logger.debug(f"  Step {i}: {step.strip()} → {result}")

        final = results[-1] if results else 0.0
        logger.debug(f"Final result: {final}")

        return ExecutionResult(
            final_value=final,
            steps_executed=len(results),
            intermediate_results=results,
        )

    def _execute_step(self, step: str, results: list[float | str]) -> float | str:
        """Execute a single DSL step."""
        try:
            match = self._OPERATION_PATTERN.match(step)

            # If an operation is included in one of the allowed operations
            if match:
                op_name, arg1, arg2 = match.groups()
                if op_name not in self._OPERATIONS:
                    raise ValueError(f"Unknown operation: {op_name}")

                a = self._resolve_value(arg1.strip(), results)
                b = self._resolve_value(arg2.strip(), results)
                result = self._OPERATIONS[op_name](a, b)
                return result

            return self._resolve_value(step, results)
        except Exception as e:
            raise ValueError(f"Failed at '{step}': {e}") from e

    def _resolve_value(self, token: str, results: list[float | str]) -> float:
        """Resolve a token to its numeric value."""
        # Reference: #0, #1
        if token.startswith("#"):
            idx = int(token[1:])
            combined = list(self.memory) + [
                r for r in results if isinstance(r, (int, float))
            ]
            if idx >= len(combined):
                raise ValueError(f"Reference #{idx} out of range")
            return combined[idx]

        # Constant: const_{value}
        if token.startswith("const_"):
            val = token[6:]
            return -float(val[1:]) if val.startswith("m") else float(val)

        # Numeric value
        cleaned = token.replace(",", "").replace(" ", "")
        if cleaned.startswith("(") and cleaned.endswith(")"):
            return -float(cleaned[1:-1])
        return float(cleaned)

    def format_result(
        self, value: float | str, format_type: str, format_precision: str
    ) -> str:
        """Format the execution result according to specified type and precision."""
        if isinstance(value, str):
            return value

        # Parse precision as number of decimal places, default to appropriate values
        try:
            precision = int(format_precision) if format_precision.isdigit() else None
        except (ValueError, AttributeError):
            precision = None

        if format_type == "percentage":
            # Convert decimal to percentage (e.g., 0.14136 -> 14.1%)
            percentage = value * 100
            if precision is not None:
                return f"{percentage:.{precision}f}%"
            else:
                return f"{percentage:.1f}%"

        elif format_type == "ratio":
            # Keep as decimal (e.g., 0.43)
            if precision is not None:
                return f"{value:.{precision}f}"
            else:
                return f"{value:.2f}"

        elif format_type == "integer":
            # Format as integer, preserve negative sign
            return str(int(round(value)))

        elif format_type == "decimal":
            # Format as decimal with precision
            if precision is not None:
                return f"{value:.{precision}f}"
            else:
                # Smart formatting: if it's a whole number, show as integer
                if isinstance(value, float) and value.is_integer():
                    return str(int(value))
                else:
                    return f"{value:.1f}"

        elif format_type == "yes_no":
            # Return yes/no for comparison operations
            return str(value)

        else:
            # Default formatting - smart integer/decimal detection
            if isinstance(value, float) and value.is_integer():
                return str(int(value))
            else:
                return f"{value:.1f}" if precision is None else f"{value:.{precision}f}"
