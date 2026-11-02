import type { Period, Preferences } from "./preferences";
export function timePeriod(date = new Date()): Period {
  const hour = date.getHours();
  return hour >= 5 && hour < 12
    ? "morning"
    : hour >= 12 && hour < 18
      ? "afternoon"
      : hour >= 18 && hour < 21
        ? "evening"
        : "night";
}
export function selectedPeriod(
  mode: Preferences["scenery"],
  date = new Date(),
): Period {
  return mode === "automatic" ? timePeriod(date) : mode;
}
export function greeting(date = new Date()) {
  return {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "A peaceful night",
  }[timePeriod(date)];
}
/** Recompute on resume too: timezone changes and DST use the device's civil clock. */
export function nextBoundary(date = new Date()): Date {
  const next = new Date(date);
  const hour = date.getHours();
  const target =
    hour < 5 ? 5 : hour < 12 ? 12 : hour < 18 ? 18 : hour < 21 ? 21 : 29;
  next.setHours(target, 0, 0, 0);
  return next;
}
