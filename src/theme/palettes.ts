import type { Period, ThemeId } from "./preferences";
import { surfaces } from "./tokens";
export interface ThemePreset {
  id: ThemeId;
  name: string;
  accent: string;
  secondary: string;
  deep: string;
  primary: string;
}
export const themes: ThemePreset[] = [
  {
    id: "lavender",
    name: "Lavender Mist",
    accent: "#C7B5EA",
    secondary: "#B6D5EE",
    deep: "#25213F",
    primary: "#695097",
  },
  {
    id: "indigo",
    name: "Indigo Night",
    accent: "#9787E5",
    secondary: "#777DBE",
    deep: "#171C3E",
    primary: "#514196",
  },
  {
    id: "graphite",
    name: "Graphite",
    accent: "#9FAAB7",
    secondary: "#BEC7D0",
    deep: "#222830",
    primary: "#4B596B",
  },
  {
    id: "forest",
    name: "Forest",
    accent: "#83BAA2",
    secondary: "#ADCCAE",
    deep: "#153B32",
    primary: "#286447",
  },
  {
    id: "copper",
    name: "Copper",
    accent: "#D8A080",
    secondary: "#DCBCA1",
    deep: "#452B2A",
    primary: "#8C4C31",
  },
  {
    id: "steel",
    name: "Steel Blue",
    accent: "#9EB7CD",
    secondary: "#BDCCD7",
    deep: "#223A4E",
    primary: "#3D607A",
  },
  {
    id: "ocean",
    name: "Ocean",
    accent: "#7BC9C3",
    secondary: "#A5DCE1",
    deep: "#153C4B",
    primary: "#21686D",
  },
  {
    id: "peach",
    name: "Peach",
    accent: "#EBC1AD",
    secondary: "#E6B6C7",
    deep: "#462D3F",
    primary: "#935465",
  },
];
export const themePreset = (id: ThemeId) => themes.find((t) => t.id === id)!;
function channels(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function mix(a: string, b: string, amount: number) {
  const aa = channels(a),
    bb = channels(b);
  return (
    "#" +
    aa
      .map((v, i) =>
        Math.round(v + (bb[i]! - v) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
}
export function contrast(a: string, b: string) {
  const l1 = luminance(a),
    l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export function foreground(background: string) {
  return contrast(background, surfaces.white) >=
    contrast(background, surfaces.ink)
    ? surfaces.white
    : surfaces.ink;
}
export function semanticColors(id: ThemeId, dark: boolean) {
  const p = themePreset(id);
  const primary = dark ? mix(p.accent, surfaces.white, 0.15) : p.primary;
  return {
    background: dark
      ? mix(p.deep, surfaces.black, 0.38)
      : mix(p.accent, surfaces.white, 0.91),
    card: dark ? mix(p.deep, surfaces.black, 0.1) : surfaces.white,
    text: dark
      ? mix(p.accent, surfaces.white, 0.94)
      : mix(p.deep, surfaces.black, 0.25),
    muted: dark
      ? mix(p.accent, surfaces.white, 0.63)
      : mix(p.deep, surfaces.white, 0.24),
    primary,
    onPrimary: foreground(primary),
    border: dark
      ? mix(p.deep, p.accent, 0.3)
      : mix(p.accent, surfaces.white, 0.52),
    soft: dark
      ? mix(p.deep, p.accent, 0.13)
      : mix(p.accent, surfaces.white, 0.76),
    danger: dark ? surfaces.dangerDark : surfaces.dangerLight,
    gradient: [
      primary,
      mix(primary, dark ? surfaces.white : surfaces.black, 0.09),
    ] as const,
  };
}
export function scenePalette(id: ThemeId, period: Period) {
  const p = themePreset(id),
    night = period === "night",
    evening = period === "evening";
  const top = night
    ? mix(p.deep, surfaces.black, 0.28)
    : evening
      ? mix(p.primary, p.accent, 0.35)
      : period === "morning"
        ? mix(p.accent, surfaces.white, 0.45)
        : mix(p.secondary, surfaces.white, 0.13);
  const bottom = night
    ? mix(p.deep, p.accent, 0.28)
    : evening
      ? mix(p.accent, p.secondary, 0.25)
      : period === "morning"
        ? mix(p.secondary, surfaces.white, 0.6)
        : mix(p.accent, surfaces.white, 0.6);
  return {
    top,
    bottom,
    far: mix(p.accent, p.deep, night ? 0.58 : 0.14),
    middle: mix(p.secondary, p.deep, night ? 0.58 : 0.32),
    near: mix(p.accent, p.deep, night ? 0.78 : 0.62),
    sun: mix(p.accent, surfaces.white, 0.88),
    star: mix(p.secondary, surfaces.white, 0.9),
    water: mix(p.secondary, p.deep, night ? 0.65 : 0.26),
    highlight: mix(p.secondary, surfaces.white, 0.55),
    house: mix(p.accent, surfaces.white, 0.86),
    roof: mix(p.accent, p.deep, 0.36),
    aurora: mix(p.accent, p.secondary, 0.55),
  };
}
export type ScenePalette = ReturnType<typeof scenePalette>;
