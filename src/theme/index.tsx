import { OpeningHistory } from "./motion";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, AppState, useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import { initializeDatabase } from "../database/client";
import type { PreferencesRepository } from "../database/repositories/preferences";
import { useLocalClock } from "../hooks/useLocalClock";
import {
  defaultPreferences,
  motionEnabled,
  preferencesSchema,
  type Appearance,
  type Preferences,
} from "./preferences";
import { semanticColors } from "./palettes";
import { selectedPeriod, greeting } from "./time";
import { fontAssets, fonts } from "./fonts";
export type ThemePreference = Appearance;
function usePresentation() {
  const [preferences, setPreferences] = useState(defaultPreferences),
    [ready, setReady] = useState(false),
    [saving, setSaving] = useState(0),
    [error, setError] = useState("");
  const latest = useRef(preferences),
    repository = useRef<PreferencesRepository | null>(null),
    queue = useRef(Promise.resolve());
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const system = useColorScheme(),
    now = useLocalClock();
  const [systemReduced, setSystemReduced] = useState<boolean | null>(null);
  const seen = useRef(new OpeningHistory());
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setAppActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (active) setSystemReduced(v);
      })
      .catch(() => {
        if (active) setSystemReduced(true);
      });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduced,
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    let active = true;
    initializeDatabase()
      .then(async (data) => {
        repository.current = data.preferences;
        return data.preferences.load();
      })
      .then((value) => {
        if (active) {
          latest.current = value;
          setPreferences(value);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load personalization.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function update(patch: Partial<Preferences>) {
    setSaving((n) => n + 1);
    const next = queue.current.then(async () => {
      if (!repository.current)
        throw new Error("Local preferences are not available yet.");
      const value = preferencesSchema.parse({ ...latest.current, ...patch });
      await repository.current.save(value);
      latest.current = value;
      setPreferences(value);
      setError("");
    });
    queue.current = next.catch(() => {});
    return next
      .catch((e) => {
        setError(
          e instanceof Error ? e.message : "Could not save personalization.",
        );
        throw e;
      })
      .finally(() => setSaving((n) => n - 1));
  }
  const dark =
    (preferences.appearance === "system" ? system : preferences.appearance) ===
    "dark";
  const colors = semanticColors(preferences.theme, dark),
    font = fonts.find((f) => f.id === preferences.font)!;
  return {
    colors,
    preferences,
    update,
    ready,
    saving: saving > 0,
    error,
    dark,
    now,
    greeting: greeting(now),
    period: selectedPeriod(preferences.scenery, now),
    appActive,
    animate: motionEnabled(preferences.motion, systemReduced),
    fontsLoaded,
    fontError,
    headingFamily: fontsLoaded ? font.family : undefined,
    headingSize: font.size,
    bodyFamily: fontsLoaded ? "Everyday" : undefined,
    strongFamily: fontsLoaded ? "EverydaySemiBold" : undefined,
    claimOpening: (date: Date, period: import("./preferences").Period) =>
      seen.current.claim(date, period),
    preference: preferences.appearance,
    setPreference: (appearance: Appearance) => update({ appearance }),
  };
}
type Presentation = ReturnType<typeof usePresentation>;
const ThemeContext = createContext<Presentation | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = usePresentation();
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
/** Database bootstrap is outside this provider's async preference hydration. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is missing");
  return context;
}
