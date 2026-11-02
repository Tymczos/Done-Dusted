import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
const icons = {
  index: "home-outline",
  shopping: "basket-outline",
  tasks: "checkmark-circle-outline",
  calendar: "calendar-outline",
  settings: "settings-outline",
} as const;
export default function TabLayout() {
  const { colors: c } = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={icons[route.name as keyof typeof icons] ?? "ellipse-outline"}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="shopping" options={{ title: "Shopping" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
