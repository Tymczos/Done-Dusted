import { router } from "expo-router";
import { Text } from "react-native";
import { Screen, Card, Label, Button } from "../src/components/ui";
import { fontLicenses } from "../src/theme/fontLicenses";
import { useTheme } from "../src/theme";
import { typography } from "../src/theme/tokens";
export default function FontLicenses() {
  const { colors, bodyFamily } = useTheme();
  return (
    <Screen
      title="Font licenses"
      subtitle="Original notices · available offline"
    >
      <Button
        title="Back to font previews"
        secondary
        onPress={() => router.back()}
      />
      {fontLicenses.map((font) => (
        <Card key={font.name}>
          <Label>{font.name}</Label>
          <Text
            selectable
            style={{
              fontFamily: bodyFamily,
              fontSize: typography.caption,
              lineHeight: 20,
              color: colors.text,
            }}
          >
            {font.notice}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
