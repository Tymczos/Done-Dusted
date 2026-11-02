import { Text } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../../theme";
import { fonts } from "../../theme/fonts";
import { Body, Button, Card, Label, Screen } from "../../components/ui";
export default function FontPreviewScreen() {
  const {
    preferences,
    update,
    ready,
    saving,
    fontsLoaded,
    fontError,
    colors: c,
    error,
  } = useTheme();
  return (
    <Screen
      title="Words with personality"
      subtitle="Font Style · six licensed, locally bundled fonts"
    >
      <Button
        title="Back to Personalize"
        secondary
        onPress={() => router.back()}
      />
      <Body>
        Choose the character of your large headings. Body text, form fields and
        controls stay in Everyday for readability.
      </Body>
      {error && <Body>{error}</Body>}
      {fontError && (
        <Body>
          Bundled fonts could not be loaded. A readable system font is being
          used. Restart the app to retry.
        </Body>
      )}
      {!fontsLoaded && !fontError && <Body>Loading bundled fonts…</Body>}
      {fonts.map((font) => (
        <Card key={font.id}>
          <Label>{font.name}</Label>
          <Body>{font.source}</Body>
          {fontsLoaded && (
            <Text
              style={{
                fontFamily: font.family,
                fontSize: font.size,
                color: c.text,
                lineHeight: font.size * 1.5,
              }}
            >
              A little room for everyday joy
            </Text>
          )}
          <Body>Fresh linen, a favourite meal, and time together.</Body>
          <Button
            title={
              preferences.font === font.id ? "Selected" : `Use ${font.name}`
            }
            secondary={preferences.font !== font.id}
            selected={preferences.font === font.id}
            disabled={!ready || saving || !fontsLoaded}
            onPress={() => void update({ font: font.id }).catch(() => {})}
          />
        </Card>
      ))}
      <Body>
        Inter, Caveat, Dancing Script, Libre Baskerville and Lora use the SIL
        Open Font License. Special Elite uses Apache 2.0. Notices are included
        with the app source.
      </Body>
      <Button
        title="View full font licenses"
        secondary
        onPress={() => router.push("/font-licenses")}
      />
      <Button
        title="Restore Everyday font"
        secondary
        disabled={!ready || saving}
        onPress={() => void update({ font: "everyday" }).catch(() => {})}
      />
    </Screen>
  );
}
