"""Table formatting utility for converting table dicts to markdown."""


def format_table(table: dict[str, dict[str, float | str | int]]) -> str:
    """Format a table dict as a markdown table string.

    The table format is {column_header: {row_label: value}},
    where columns are the outer keys and rows are the inner keys.
    """
    if not table:
        return "No table data"

    headers = list(table.keys())

    # Collect all unique row keys across columns
    all_rows: set[str] = set()
    for col_data in table.values():
        all_rows.update(col_data.keys())

    # Header row
    lines = []
    lines.append("| " + " | ".join([""] + headers) + " |")
    lines.append("|" + " --- |" * (len(headers) + 1))

    # Data rows
    for row in sorted(all_rows):
        values = [row]
        for header in headers:
            values.append(str(table[header].get(row, "")))
        lines.append("| " + " | ".join(values) + " |")

    return "\n".join(lines)


if __name__ == "__main__":
    test_table = {
        "2009": {"sales": 36853, "cost": 30049},
        "2008": {"sales": 37522, "cost": 30572},
    }
    print(format_table(test_table))
