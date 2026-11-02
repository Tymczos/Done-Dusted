import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, Text, View, Pressable } from "react-native";
import { initializeDatabase } from "./client";
import { useTheme } from "../theme";
type Data = Awaited<ReturnType<typeof initializeDatabase>>;
const Context = createContext<Data | null>(null);
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const { colors } = useTheme();
  useEffect(() => {
    let active = true;
    initializeDatabase()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to open local data",
          );
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (!data)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          padding: 30,
          gap: 20,
        }}
      >
        {error ? (
          <>
            <Text style={{ color: colors.text }} accessibilityRole="alert">
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError("");
                setAttempt((a) => a + 1);
              }}
            >
              <Text style={{ color: colors.primary }}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator
            accessibilityLabel="Opening your household"
            color={colors.primary}
          />
        )}
      </View>
    );
  return <Context.Provider value={data}>{children}</Context.Provider>;
}
export function useDatabase() {
  const value = useContext(Context);
  if (!value) throw new Error("DatabaseProvider is missing");
  return value;
}
