import type { SceneId, ThemeId, Period } from "./preferences";
import { scenePalette } from "./palettes";
export const sceneryPacks: {
  id: SceneId;
  name: string;
  description: string;
}[] = [
  {
    id: "mountains",
    name: "Mountain Skies",
    description: "Layered peaks, a quiet lake and open sky.",
  },
  {
    id: "aurora",
    name: "Emerald Aurora",
    description: "Flowing aurora ribbons over a pine forest.",
  },
  {
    id: "shepherd",
    name: "Shepherd’s Delight",
    description: "Rolling pastures, soft clouds and a little flock.",
  },
  {
    id: "mediterranean",
    name: "Mediterranean Glow",
    description: "Sunlit coastal terraces above a sheltered bay.",
  },
  {
    id: "whale",
    name: "Whale’s Lullaby",
    description: "A gentle whale beneath an ocean sky.",
  },
];
export function sceneSpec(theme: ThemeId, period: Period, pack: SceneId) {
  return { theme, period, pack, palette: scenePalette(theme, period) };
}
export type SceneSpec = ReturnType<typeof sceneSpec>;
