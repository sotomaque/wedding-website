/**
 * Serialize an export matrix (header + string cells) to CSV or XLSX bytes.
 *
 * CSV follows RFC 4180 quoting and is prefixed with a UTF-8 BOM so Excel opens
 * non-ASCII names correctly. XLSX is produced with ExcelJS (server-side only).
 */

import ExcelJS from "exceljs";
import type { ExportMatrix } from "./guest-columns";

export type ExportFormat = "csv" | "xlsx";

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Neutralize spreadsheet formula injection. A cell beginning with `=`, `+`,
 * `-`, `@`, TAB, or CR is executed as a formula by Excel/Sheets/LibreOffice, so
 * a guest-supplied value like `=HYPERLINK(...)` would run when the couple opens
 * the export. Prefix such values with a single quote so they render as literal
 * text. Exported for reuse by both the CSV and XLSX serializers.
 */
export function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Quote a single CSV field if it contains a comma, quote, or newline. */
function escapeCsvField(value: string): string {
  const safe = neutralizeFormula(value);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/** Serialize to a CSV string (UTF-8 BOM prefixed for Excel compatibility). */
export function toCsv(matrix: ExportMatrix): string {
  const lines = [matrix.header, ...matrix.rows].map((row) =>
    row.map(escapeCsvField).join(","),
  );
  return `﻿${lines.join("\r\n")}`;
}

/** Serialize to XLSX bytes with a bold, frozen header row and sized columns. */
export async function toXlsx(
  matrix: ExportMatrix,
  sheetName = "Guests",
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  // Sheet names are capped at 31 chars and can't contain certain characters.
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

  const headerRow = sheet.addRow(matrix.header.map(neutralizeFormula));
  headerRow.font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of matrix.rows) {
    // Neutralize formula injection before ExcelJS interprets a leading `=`.
    sheet.addRow(row.map(neutralizeFormula));
  }

  // Size each column to the widest cell in it (capped) for a readable file.
  matrix.header.forEach((label, i) => {
    const widest = matrix.rows.reduce(
      (max, row) => Math.max(max, row[i]?.length ?? 0),
      label.length,
    );
    const col = sheet.getColumn(i + 1);
    col.width = Math.min(Math.max(widest + 2, 10), 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

/** Build a safe, dated export filename, e.g. `guest-list-helen-2026-05-31.csv`. */
export function exportFilename(slug: string, format: ExportFormat): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "wedding";
  const date = new Date().toISOString().slice(0, 10);
  return `guest-list-${safeSlug}-${date}.${format}`;
}
