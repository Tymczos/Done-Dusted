import { z } from "zod";
export const themeIds = [
  "lavender",
  "indigo",
  "graphite",
  "forest",
  "copper",
  "steel",
  "ocean",
  "peach",
] as const;
export const periods = ["morning", "afternoon", "evening", "night"] as const;
export const sceneIds = [
  "mountains",
  "aurora",
  "shepherd",
  "mediterranean",
  "whale",
] as const;
export const fontIds = [
  "everyday",
  "notebook",
  "script",
  "classic",
  "typewriter",
  "bookish",
] as const;
export const dashboardIds = ["shopping", "tasks", "upcoming"] as const;
export type ThemeId = (typeof themeIds)[number];
export type Period = (typeof periods)[number];
export type SceneId = (typeof sceneIds)[number];
export type FontId = (typeof fontIds)[number];
export type DashboardId = (typeof dashboardIds)[number];
const sectionSchema = z.object({
  id: z.enum(dashboardIds),
  visible: z.boolean(),
});
export const preferencesSchema = z.object({
  version: z.literal(1),
  theme: z.enum(themeIds),
  appearance: z.enum(["system", "light", "dark"]),
  scenery: z.enum(["automatic", ...periods]),
  scene: z.enum(sceneIds),
  font: z.enum(fontIds),
  motion: z.enum(["system", "reduced"]),
  dashboard: z
    .array(sectionSchema)
    .length(dashboardIds.length)
    .refine(
      (rows) => new Set(rows.map((r) => r.id)).size === dashboardIds.length,
      "Dashboard sections must occur exactly once",
    ),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export type Appearance = Preferences["appearance"];
export const defaultPreferences = (): Preferences => ({
  version: 1,
  theme: "lavender",
  appearance: "system",
  scenery: "automatic",
  scene: "mountains",
  font: "everyday",
  motion: "system",
  dashboard: dashboardIds.map((id) => ({ id, visible: true })),
});
export const sectionNames: Record<DashboardId, string> = {
  shopping: "Shopping essentials",
  tasks: "Today at home",
  upcoming: "Upcoming chores",
};
export function reorderDashboard(
  rows: Preferences["dashboard"],
  id: DashboardId,
  direction: -1 | 1,
) {
  const result = rows.map((row) => ({ ...row })),
    from = result.findIndex((row) => row.id === id),
    to = from + direction;
  if (from < 0 || to < 0 || to >= result.length) return result;
  [result[from], result[to]] = [result[to]!, result[from]!];
  return result;
}
export function motionEnabled(
  preference: Preferences["motion"],
  systemReduced: boolean | null,
) {
  return preference === "system" && systemReduced === false;
}
