interface FinancialTableProps {
  table: Record<string, Record<string, string | number>>;
}

function FinancialTable({ table }: FinancialTableProps) {
  const columns = Object.keys(table);
  if (columns.length === 0) return null;

  // Extract all unique row keys from all columns
  const rowKeys = Array.from(
    new Set(columns.flatMap((col) => Object.keys(table[col])))
  );

  const formatValue = (value: string | number | undefined): string => {
    if (value === undefined) return '—';
    if (typeof value === 'string') return value;
    // Format numbers with comma separators
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isNumeric = (value: string | number | undefined): boolean => {
    if (value === undefined) return false;
    return typeof value === 'number';
  };

  return (
    <div className="financial-table-wrapper">
      <table className="financial-table">
        <thead>
          <tr>
            <th className="financial-table-label-col"></th>
            {columns.map((col) => (
              <th key={col} className="financial-table-value-col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((rowKey) => (
            <tr key={rowKey}>
              <td className="financial-table-label">{rowKey}</td>
              {columns.map((col) => {
                const value = table[col][rowKey];
                return (
                  <td
                    key={col}
                    className={`financial-table-value${isNumeric(value) ? ' numeric' : ''}`}
                  >
                    {formatValue(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FinancialTable;
