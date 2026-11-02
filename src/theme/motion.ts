import type { Period } from "./preferences";
export class OpeningHistory {
  private seen = new Set<string>();
  claim(date: Date, period: Period) {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}:${period}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
}
