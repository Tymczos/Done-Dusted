import type { ReactNode } from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { Label, Button } from "./ui";
export function FormSheet({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 18 }}
          >
            <Label>{title}</Label>
            {children}
            <Button title="Close" secondary disabled={busy} onPress={onClose} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
