import type { FontId } from "./preferences";
export const fontAssets = {
  Everyday: require("../../assets/fonts/Inter_400Regular.ttf"),
  EverydaySemiBold: require("../../assets/fonts/Inter_600SemiBold.ttf"),
  Notebook: require("../../assets/fonts/Caveat_500Medium.ttf"),
  SoftScript: require("../../assets/fonts/DancingScript_500Medium.ttf"),
  Classic: require("../../assets/fonts/LibreBaskerville_400Regular.ttf"),
  Typewriter: require("../../assets/fonts/SpecialElite_400Regular.ttf"),
  Bookish: require("../../assets/fonts/Lora_400Regular.ttf"),
};
export const fonts: {
  id: FontId;
  name: string;
  family: keyof typeof fontAssets;
  source: string;
  size: number;
}[] = [
  {
    id: "everyday",
    name: "Everyday",
    family: "EverydaySemiBold",
    source: "Inter · clear & contemporary",
    size: 34,
  },
  {
    id: "notebook",
    name: "The Notebook",
    family: "Notebook",
    source: "Caveat · genuine handwritten letterforms",
    size: 42,
  },
  {
    id: "script",
    name: "Soft Script",
    family: "SoftScript",
    source: "Dancing Script · flowing handwritten lettering",
    size: 40,
  },
  {
    id: "classic",
    name: "The Classic",
    family: "Classic",
    source: "Libre Baskerville · a classic licensed serif",
    size: 30,
  },
  {
    id: "typewriter",
    name: "The Typewriter",
    family: "Typewriter",
    source: "Special Elite · characterful typewritten letters",
    size: 30,
  },
  {
    id: "bookish",
    name: "Bookish",
    family: "Bookish",
    source: "Lora · a warm reading serif",
    size: 32,
  },
];
