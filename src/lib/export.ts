/**
 * Utility functions for exports
 */

export function exportToCSV(results: any[]): string {
  if (results.length === 0) {
    return "";
  }

  // CSV headers
  const headers = [
    "Domain",
    "Verdict",
    "Confidence",
    "IP",
    "RDAP Status",
    "Reasons",
  ];

  const rows = results.map((r) => [
    r.domain,
    r.verdict,
    r.confidence,
    r.ip || "-",
    r.rdapStatus || "-",
    r.reasons.join("; "),
  ]);

  const csv = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csv;
}

export function exportToJSON(results: any[]): string {
  return JSON.stringify(results, null, 2);
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
