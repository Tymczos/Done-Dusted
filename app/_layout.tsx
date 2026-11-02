import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme, ThemeProvider } from "../src/theme";
import { DatabaseProvider } from "../src/database/provider";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DatabaseProvider>
          <AppShell />
        </DatabaseProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { dark, colors, ready } = useTheme();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel="Loading your personalization"
        />
      </View>
    );
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "none",
        }}
      />
    </>
  );
}
