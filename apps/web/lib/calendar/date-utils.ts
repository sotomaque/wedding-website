/** Convert any date value (Date object or "YYYY-MM-DD" string) to a "YYYY-MM-DD" string */
export function toDateStr(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
  }
  return String(val).slice(0, 10);
}
