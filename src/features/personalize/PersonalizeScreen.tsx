import { Alert, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme";
import { themes } from "../../theme/palettes";
import {
  defaultPreferences,
  periods,
  reorderDashboard,
  sectionNames,
  type Preferences,
} from "../../theme/preferences";
import { sceneryPacks, sceneSpec } from "../../theme/scenes";
import { fonts } from "../../theme/fonts";
import { spacing, radii, typography } from "../../theme/tokens";
import { useDatabase } from "../../database/provider";
import { Screen, Card, Label, Body, Button } from "../../components/ui";
import { ScenePreview } from "../../components/scenery/SceneHero";
export default function PersonalizeScreen() {
  const {
    preferences: p,
    colors: c,
    period,
    update,
    ready,
    saving,
    error,
    strongFamily,
    bodyFamily,
  } = useTheme();
  const { activeProfileName } = useDatabase();
  const disabled = !ready || saving;
  function apply(patch: Partial<Preferences>) {
    void update(patch).catch(() => {});
  }
  return (
    <Screen
      title="Make room for you"
      subtitle={`Personalize · ${activeProfileName} · saved on this device`}
    >
      <Button
        title="Back to Settings"
        secondary
        onPress={() => router.back()}
      />
      {error && (
        <Card>
          <Text accessibilityRole="alert" style={{ color: c.danger }}>
            {error}
          </Text>
        </Card>
      )}
      {!ready && <Body>Loading your preferences…</Body>}
      {saving && <Body>Saving your preferences…</Body>}
      <Card>
        <Label>Theme & Colour</Label>
        <Body>
          A little colour, a different mood. Your household stays just as it is.
        </Body>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}
        >
          {themes.map((theme) => (
            <Pressable
              key={theme.id}
              accessibilityRole="button"
              accessibilityLabel={theme.name}
              accessibilityState={{ selected: p.theme === theme.id, disabled }}
              disabled={disabled}
              onPress={() => apply({ theme: theme.id })}
              style={{
                width: "47%",
                minHeight: 112,
                gap: spacing.sm,
                padding: spacing.sm,
                borderRadius: radii.control,
                borderWidth: p.theme === theme.id ? 2 : 1,
                borderColor: p.theme === theme.id ? c.primary : c.border,
              }}
            >
              <LinearGradient
                colors={[theme.accent, theme.secondary, theme.deep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 64, borderRadius: radii.small }}
              />
              <Text
                style={{
                  fontFamily: strongFamily,
                  color: c.text,
                  fontSize: typography.caption,
                  textAlign: "center",
                }}
              >
                {theme.name}
                {p.theme === theme.id ? " ✓" : ""}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          title="Reset colour to Lavender Mist"
          secondary
          disabled={disabled}
          onPress={() => apply({ theme: defaultPreferences().theme })}
        />
      </Card>
      <Card>
        <Label>Sky & Scenery</Label>
        <Body>
          Your colour palette and scenery pack are independent. Automatic skies
          follow the device’s local time; a fixed sky does not change the
          greeting.
        </Body>
        <ScenePreview spec={sceneSpec(p.theme, period, p.scene)} height={190} />
        <Button
          title="Automatic scenery"
          secondary={p.scenery !== "automatic"}
          selected={p.scenery === "automatic"}
          disabled={disabled}
          onPress={() => apply({ scenery: "automatic" })}
        />
        <View style={{ gap: spacing.sm }}>
          {periods.map((time) => (
            <Button
              key={time}
              title={`Fixed ${time}`}
              secondary={p.scenery !== time}
              selected={p.scenery === time}
              disabled={disabled}
              onPress={() => apply({ scenery: time })}
            />
          ))}
        </View>
        <Body>
          Morning 05:00–11:59 · Afternoon 12:00–17:59 · Evening 18:00–20:59 ·
          Night 21:00–04:59
        </Body>
        <View style={{ gap: spacing.lg }}>
          {sceneryPacks.map((pack) => (
            <Pressable
              key={pack.id}
              accessibilityRole="button"
              accessibilityState={{ selected: p.scene === pack.id, disabled }}
              accessibilityLabel={`${pack.name}. ${pack.description}`}
              disabled={disabled}
              onPress={() => apply({ scene: pack.id })}
              style={{
                gap: spacing.sm,
                padding: spacing.sm,
                borderWidth: p.scene === pack.id ? 2 : 1,
                borderColor: p.scene === pack.id ? c.primary : c.border,
                borderRadius: radii.card,
              }}
            >
              <ScenePreview spec={sceneSpec(p.theme, period, pack.id)} />
              <Text
                style={{
                  fontFamily: strongFamily,
                  color: c.text,
                  fontSize: typography.body,
                }}
              >
                {pack.name}
                {p.scene === pack.id ? " ✓" : ""}
              </Text>
              <Body>{pack.description}</Body>
            </Pressable>
          ))}
        </View>
        <Button
          title="Reset sky & scenery"
          secondary
          disabled={disabled}
          onPress={() => apply({ scenery: "automatic", scene: "mountains" })}
        />
      </Card>
      <Card>
        <Label>Font Style</Label>
        <Body>
          Current: {fonts.find((f) => f.id === p.font)?.name}. Decorative styles
          are reserved for large headings. Body text stays clear and readable.
        </Body>
        <Button
          title="Preview all six font styles"
          disabled={disabled}
          onPress={() => router.push("/font-preview")}
        />
        <Button
          title="Reset to Everyday"
          secondary
          disabled={disabled}
          onPress={() => apply({ font: "everyday" })}
        />
      </Card>
      <Card>
        <Label>Dashboard Layout</Label>
        <Body>
          Arrange your Home cards. Hide any optional card; the five navigation
          tabs and quick actions remain available.
        </Body>
        {p.dashboard.map((section, index) => (
          <View
            key={section.id}
            style={{
              gap: spacing.sm,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontFamily: strongFamily, color: c.text, flex: 1 }}
              >
                {index + 1}. {sectionNames[section.id]}
              </Text>
              <Switch
                accessibilityLabel={`Show ${sectionNames[section.id]}`}
                value={section.visible}
                disabled={disabled}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor={c.card}
                onValueChange={(visible) =>
                  apply({
                    dashboard: p.dashboard.map((s) =>
                      s.id === section.id ? { ...s, visible } : s,
                    ),
                  })
                }
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                flexWrap: "wrap",
              }}
            >
              <Button
                title="↑ Move up"
                accessibilityLabel={`Move ${sectionNames[section.id]} up`}
                secondary
                disabled={disabled || index === 0}
                onPress={() =>
                  apply({
                    dashboard: reorderDashboard(p.dashboard, section.id, -1),
                  })
                }
              />
              <Button
                title="↓ Move down"
                accessibilityLabel={`Move ${sectionNames[section.id]} down`}
                secondary
                disabled={disabled || index === p.dashboard.length - 1}
                onPress={() =>
                  apply({
                    dashboard: reorderDashboard(p.dashboard, section.id, 1),
                  })
                }
              />
            </View>
          </View>
        ))}
        <Button
          title="Restore default dashboard"
          secondary
          disabled={disabled}
          onPress={() => apply({ dashboard: defaultPreferences().dashboard })}
        />
      </Card>
      <Card>
        <Label>Appearance & Motion</Label>
        <Body>
          Appearance changes the app surfaces. Your chosen scene period and
          colour theme stay selected.
        </Body>
        {(["system", "light", "dark"] as const).map((appearance) => (
          <Button
            key={appearance}
            title={
              appearance === "system"
                ? "Follow device appearance"
                : `${appearance === "light" ? "Light" : "Dark"} appearance`
            }
            secondary={p.appearance !== appearance}
            selected={p.appearance === appearance}
            disabled={disabled}
            onPress={() => apply({ appearance })}
          />
        ))}
        <Body>
          Device Reduce Motion is always respected. You can also keep the app
          still independently.
        </Body>
        {(["system", "reduced"] as const).map((motion) => (
          <Button
            key={motion}
            title={
              motion === "system"
                ? "Motion: follow accessibility setting"
                : "Motion: always reduced"
            }
            selected={p.motion === motion}
            secondary={p.motion !== motion}
            disabled={disabled}
            onPress={() => apply({ motion })}
          />
        ))}
        <Button
          title="Reset appearance & motion"
          secondary
          disabled={disabled}
          onPress={() => apply({ appearance: "system", motion: "system" })}
        />
      </Card>
      <Card>
        <Label>A fresh start, just for the look</Label>
        <Text
          style={{
            fontFamily: bodyFamily,
            color: c.muted,
            lineHeight: typography.lineHeight,
          }}
        >
          Restore all personalization defaults for this local profile. Shopping,
          shops, tasks, photos and household data are preserved.
        </Text>
        <Button
          title="Reset all personalization"
          secondary
          disabled={disabled}
          onPress={() =>
            Alert.alert(
              "Reset personalization?",
              "This restores Lavender Mist, Mountain Skies, automatic scenery, Everyday font, the default dashboard and device appearance/motion settings. Household data is preserved.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset preferences",
                  onPress: () => apply(defaultPreferences()),
                },
              ],
            )
          }
        />
      </Card>
    </Screen>
  );
}
