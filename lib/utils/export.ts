// lib/utils/export.ts
// Browser-side CSV generation utility

/**
 * Converts an array of objects to a CSV string.
 * All values are safely quoted.
 */
export function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const escape = (v: unknown): string => {
    if (v == null) return '';
    const str = String(v).replace(/"/g, '""');
    return `"${str}"`;
  };
  const rows = [
    headers.map(escape).join(','),
    ...data.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return rows.join('\r\n');
}

/**
 * Triggers a browser CSV download.
 * @param data    Array of flat objects to export
 * @param filename  File name without extension
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) {
    alert('No data to export.');
    return;
  }
  const csv = toCSV(data);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Format a Date to a readable string for CSV export */
export function formatExportDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
