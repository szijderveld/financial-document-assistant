export interface FormattedAnswer {
  value: string;
  type: 'number' | 'percentage' | 'text';
  formatted: string;
}

/**
 * Detect if an answer is a number, percentage, or text, and format accordingly.
 */
export function formatAnswer(raw: string): FormattedAnswer {
  const trimmed = raw.trim();

  // Check for percentage: e.g. "12.5%", "-3.2%", "12.5 %"
  const pctMatch = trimmed.match(/^(-?[\d,]+\.?\d*)\s*%$/);
  if (pctMatch) {
    const num = parseFloat(pctMatch[1].replace(/,/g, ''));
    return {
      value: trimmed,
      type: 'percentage',
      formatted: `${formatNumber(num)}%`,
    };
  }

  // Check for plain number: e.g. "206588", "-1,234.56", "1234.5"
  const numMatch = trimmed.match(/^-?[\d,]+\.?\d*$/);
  if (numMatch) {
    const num = parseFloat(trimmed.replace(/,/g, ''));
    return {
      value: trimmed,
      type: 'number',
      formatted: formatNumber(num),
    };
  }

  return {
    value: trimmed,
    type: 'text',
    formatted: trimmed,
  };
}

function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface TableForDisplay {
  headers: string[];
  rows: { label: string; values: (string | number)[] }[];
}

/**
 * Convert the nested dict-of-dicts table format into flat rows for rendering.
 */
export function formatTableForDisplay(
  table: Record<string, Record<string, string | number>>
): TableForDisplay {
  const columns = Object.keys(table);
  const rowKeys = Array.from(
    new Set(columns.flatMap((col) => Object.keys(table[col])))
  );

  return {
    headers: columns,
    rows: rowKeys.map((key) => ({
      label: key,
      values: columns.map((col) => table[col][key] ?? ''),
    })),
  };
}
