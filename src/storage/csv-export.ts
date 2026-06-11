import type { Snapshot } from './schemas';

/**
 * Escape a CSV field value.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 * Internal double-quotes are escaped by doubling them.
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a number for CSV with fixed decimal places.
 */
function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

/**
 * Export snapshot history as CSV string.
 * Compatible with Google Sheets: UTF-8 BOM for proper encoding,
 * standard comma delimiter, quoted fields where needed.
 *
 * Columns:
 * Date, Total Annual (kg CO2e), Total Monthly (kg CO2e),
 * Transport (kg CO2e/yr), Electricity (kg CO2e/yr),
 * Diet (kg CO2e/yr), Flights (kg CO2e/yr),
 * Top Driver 1, Top Driver 2, Registry Version
 */
export function exportSnapshotsAsCSV(snapshots: Snapshot[]): string {
  const BOM = '\ufeff'; // UTF-8 BOM for Google Sheets
  const headers = [
    'Date',
    'Total Annual (kg CO2e)',
    'Total Monthly (kg CO2e)',
    'Transport (kg CO2e/yr)',
    'Electricity (kg CO2e/yr)',
    'Diet (kg CO2e/yr)',
    'Flights (kg CO2e/yr)',
    'Top Driver 1',
    'Top Driver 2',
    'Registry Version',
  ];

  const rows: string[] = [headers.map(escapeCSVField).join(',')];

  for (const snapshot of snapshots) {
    const { result } = snapshot;
    const categoryMap = new Map(result.breakdown.map((b) => [b.category, b.annualKgCO2e]));

    const row = [
      escapeCSVField(snapshot.date.split('T')[0] ?? snapshot.date),
      formatNumber(result.totalAnnualKgCO2e),
      formatNumber(result.totalMonthlyKgCO2e),
      formatNumber(categoryMap.get('transport') ?? 0),
      formatNumber(categoryMap.get('electricity') ?? 0),
      formatNumber(categoryMap.get('diet') ?? 0),
      formatNumber(categoryMap.get('flights') ?? 0),
      escapeCSVField(result.topDrivers[0]?.reason ?? ''),
      escapeCSVField(result.topDrivers[1]?.reason ?? ''),
      escapeCSVField(result.factorRegistryVersion),
    ];

    rows.push(row.join(','));
  }

  return BOM + rows.join('\r\n') + '\r\n';
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
