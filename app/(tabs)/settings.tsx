import { router } from "expo-router";
import { Screen, Card, Label, Body, Button } from "../../src/components/ui";
import { useTheme } from "../../src/theme";
import { themes } from "../../src/theme/palettes";
export default function Settings() {
  const { preferences } = useTheme();
  return (
    <Screen
      title="Your everyday, your way"
      subtitle="Done & Dusted · On this device"
    >
      <Card>
        <Label>Personalize</Label>
        <Body>
          {themes.find((t) => t.id === preferences.theme)?.name} ·{" "}
          {preferences.appearance} appearance
        </Body>
        <Body>
          Theme & Colour · Sky & Scenery · Font Style · Dashboard Layout ·
          Appearance & Motion
        </Body>
        <Button
          title="Open Personalize"
          onPress={() => router.push("/personalize")}
        />
      </Card>
      <Card>
        <Label>On this device only</Label>
        <Body>
          Your household data is stored locally in SQLite. No account,
          invitations or cross-device synchronization. Backup and household
          profile editing remain future work.
        </Body>
      </Card>
      <Body>Done & Dusted 0.3.0 · A little more room for life</Body>
    </Screen>
  );
}
