import type { Recurrence } from "../../types/models";
/** Civil dates deliberately avoid UTC conversion, DST shifts and month rollover. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  if (y < 1970 || y > 2199) return false;
  return localDate(new Date(y, m - 1, d, 12)) === value;
}
export function addDays(value: string, days: number) {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return localDate(new Date(y, m - 1, d + days, 12));
}
export function occurrenceDates(
  start: string,
  recurrence: Recurrence | null,
  through: string,
): string[] {
  if (!isDate(start) || !isDate(through))
    throw new Error("Invalid recurrence date");
  if (!recurrence) return [start];
  const result: string[] = [];
  const [y, m, d] = start.split("-").map(Number) as [number, number, number];
  for (let i = 0; ; i++) {
    let next: string;
    if (recurrence === "monthly") {
      const end = new Date(y, m + i, 0, 12).getDate();
      next = localDate(new Date(y, m - 1 + i, Math.min(d, end), 12));
    } else next = addDays(start, i * (recurrence === "weekly" ? 7 : 1));
    if (next > through) break;
    result.push(next);
  }
  return result;
}
