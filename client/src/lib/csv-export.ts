type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
};

export function exportToCsv<T>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = col.accessor(row);
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );

  const bom = "\uFEFF";
  const csvContent = bom + [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
