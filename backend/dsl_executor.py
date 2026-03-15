"""
DSL executor for financial calculations.

Separates reasoning (LLM) from calculation (deterministic).
Operations are explicit — no eval() — preventing code injection.
Memory references (#N) enable multi-step and multi-turn calculations.
"""

import re
from collections.abc import Callable

from pydantic import BaseModel, Field


class ExecutionResult(BaseModel):
    """Result of DSL execution."""

    final_value: float | str
    steps_executed: int = Field(ge=0)
    intermediate_results: list[float | str] = Field(default_factory=list)


class DSLExecutor(BaseModel):
    """Stateless DSL executor. Memory is passed in, not mutated."""

    memory: list[float] = Field(default_factory=list)

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
        """Execute a DSL program and return the result."""
        results: list[float | str] = []

        for step in program:
            result = self._execute_step(step.strip(), results)
            results.append(result)

        final = results[-1] if results else 0.0
        return ExecutionResult(
            final_value=final,
            steps_executed=len(results),
            intermediate_results=results,
        )

    def _execute_step(self, step: str, results: list[float | str]) -> float | str:
        """Execute a single DSL step."""
        try:
            match = self._OPERATION_PATTERN.match(step)
            if match:
                op_name, arg1, arg2 = match.groups()
                if op_name not in self._OPERATIONS:
                    raise ValueError(f"Unknown operation: {op_name}")
                a = self._resolve_value(arg1.strip(), results)
                b = self._resolve_value(arg2.strip(), results)
                return self._OPERATIONS[op_name](a, b)
            return self._resolve_value(step, results)
        except Exception as e:
            raise ValueError(f"Failed at '{step}': {e}") from e

    def _resolve_value(self, token: str, results: list[float | str]) -> float:
        """Resolve a token to a numeric value."""
        # Memory reference: #0, #1, etc.
        if token.startswith("#"):
            idx = int(token[1:])
            combined = list(self.memory) + [
                r for r in results if isinstance(r, (int, float))
            ]
            if idx >= len(combined):
                raise ValueError(f"Reference #{idx} out of range")
            return combined[idx]

        # Constant: const_1, const_100, const_m1 (m = minus)
        if token.startswith("const_"):
            val = token[6:]
            return -float(val[1:]) if val.startswith("m") else float(val)

        # Numeric literal
        cleaned = token.replace(",", "").replace(" ", "")
        if cleaned.startswith("(") and cleaned.endswith(")"):
            return -float(cleaned[1:-1])
        return float(cleaned)

    def format_result(
        self, value: float | str, format_type: str, format_precision: str
    ) -> str:
        """Format the execution result for display."""
        if isinstance(value, str):
            return value

        try:
            precision = int(format_precision) if format_precision.isdigit() else None
        except (ValueError, AttributeError):
            precision = None

        if format_type == "percentage":
            pct = value * 100
            p = precision if precision is not None else 1
            return f"{pct:.{p}f}%"

        if format_type == "ratio":
            p = precision if precision is not None else 2
            return f"{value:.{p}f}"

        if format_type == "integer":
            return str(int(round(value)))

        if format_type == "decimal":
            if precision is not None:
                return f"{value:.{precision}f}"
            if isinstance(value, float) and value.is_integer():
                return str(int(value))
            return f"{value:.1f}"

        if format_type == "yes_no":
            return str(value)

        # Default
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        p = precision if precision is not None else 1
        return f"{value:.{p}f}"


if __name__ == "__main__":
    # Basic tests
    executor = DSLExecutor()

    # Direct value
    r = executor.execute(["206588"])
    assert r.final_value == 206588.0, f"Expected 206588, got {r.final_value}"
    print(f"Direct value: {executor.format_result(r.final_value, 'integer', '0')}")

    # Percentage change
    r = executor.execute(["divide(25587, 181001)"])
    formatted = executor.format_result(r.final_value, "percentage", "1")
    assert formatted == "14.1%", f"Expected 14.1%, got {formatted}"
    print(f"Percentage: {formatted}")

    # Subtraction (negative)
    r = executor.execute(["subtract(72, 78)"])
    formatted = executor.format_result(r.final_value, "integer", "0")
    assert formatted == "-6", f"Expected -6, got {formatted}"
    print(f"Negative: {formatted}")

    # Multi-step with references
    r = executor.execute(["add(const_1, 0.0275)", "exp(#0, const_10)", "multiply(400, #1)"])
    formatted = executor.format_result(r.final_value, "decimal", "1")
    print(f"Compound: {formatted}")

    # Memory reference
    executor_with_mem = DSLExecutor(memory=[206588.0, 181001.0, 25587.0])
    r = executor_with_mem.execute(["divide(#2, #1)"])
    formatted = executor_with_mem.format_result(r.final_value, "percentage", "1")
    assert formatted == "14.1%", f"Expected 14.1%, got {formatted}"
    print(f"Memory ref: {formatted}")

    # Ratio
    r = executor.execute(["divide(273, 643)"])
    formatted = executor.format_result(r.final_value, "ratio", "2")
    assert formatted == "0.42", f"Expected 0.42, got {formatted}"
    print(f"Ratio: {formatted}")

    # Comparison
    r = executor.execute(["greater(34, 52)"])
    assert r.final_value == "no", f"Expected 'no', got {r.final_value}"
    print(f"Comparison: {r.final_value}")

    print("\nAll tests passed!")
