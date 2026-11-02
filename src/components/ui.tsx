import type { ReactNode } from "react";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  StyleSheet,
  type TextInputProps,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { spacing, radii, typography } from "../theme/tokens";
export function Screen({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const {
    colors: c,
    headingFamily,
    headingSize,
    bodyFamily,
    strongFamily,
  } = useTheme();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[c.soft, c.background]}
        style={[StyleSheet.absoluteFill, { height: 300 }]}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.xl,
          paddingBottom: spacing.section,
        }}
      >
        <Text
          style={{
            fontFamily: strongFamily,
            fontSize: typography.caption,
            letterSpacing: 3,
            color: c.primary,
          }}
        >
          DONE & DUSTED
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: headingFamily,
            fontSize: headingSize,
            color: c.text,
            lineHeight: headingSize * 1.35,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontFamily: bodyFamily,
              color: c.muted,
              fontSize: typography.body,
              lineHeight: typography.lineHeight,
            }}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Card({ children }: { children: ReactNode }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.card,
        borderRadius: radii.card,
        padding: spacing.xl,
        gap: spacing.lg,
        borderWidth: 1,
        borderColor: c.border,
        boxShadow: `0px 4px 16px ${c.border}35`,
      }}
    >
      {children}
    </View>
  );
}
export function Label({ children }: { children: ReactNode }) {
  const { colors: c, strongFamily } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: strongFamily,
        color: c.text,
        fontSize: typography.label,
        fontWeight: strongFamily ? undefined : "600",
      }}
    >
      {children}
    </Text>
  );
}
export function Body({ children }: { children: ReactNode }) {
  const { colors: c, bodyFamily } = useTheme();
  return (
    <Text
      style={{
        fontFamily: bodyFamily,
        color: c.muted,
        fontSize: typography.body,
        lineHeight: typography.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  selected,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors: c, strongFamily } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: radii.control,
        overflow: "hidden",
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        backgroundColor: secondary ? c.soft : c.primary,
      })}
    >
      <LinearGradient
        colors={secondary ? [c.soft, c.soft] : c.gradient}
        style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          minHeight: 50,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontFamily: strongFamily,
            color: secondary ? c.text : c.onPrimary,
            fontWeight: strongFamily ? undefined : "700",
            fontSize: typography.body,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors: c, bodyFamily, strongFamily } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontFamily: strongFamily, color: c.text }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={{
          fontFamily: bodyFamily,
          color: c.text,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: radii.small,
          padding: spacing.lg,
          minHeight: 50,
          fontSize: typography.body,
        }}
      />
    </View>
  );
}
