import { useEffect, useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { randomUUID } from "expo-crypto";
import { useDatabase } from "../database/provider";
import type { Attachment, AttachmentOwner } from "../types/models";
import { AttachmentService } from "../services/attachments";
import { photoStorage, pickPhoto } from "../services/nativePhotos";
import { Body, Button } from "./ui";
import { useTheme } from "../theme";
export function AttachmentPanel({
  ownerType,
  ownerId,
  onChanged,
}: {
  ownerType: AttachmentOwner;
  ownerId: string;
  onChanged?: () => void;
}) {
  const { attachments } = useDatabase(),
    { colors: c } = useTheme();
  const service = useMemo(
    () => new AttachmentService(attachments, photoStorage, randomUUID),
    [attachments],
  );
  const [photo, setPhoto] = useState<Attachment | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    attachments
      .get(ownerType, ownerId)
      .then((p) => {
        if (active) setPhoto(p);
      })
      .catch(() => {
        if (active) setError("Could not load the attachment.");
      });
    return () => {
      active = false;
    };
  }, [attachments, ownerType, ownerId]);
  async function change(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setPhoto(await attachments.get(ownerType, ownerId));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update photo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Body>Optional photo · stored on this device</Body>
      {photo && (
        <Image
          accessibilityLabel="Attached photo"
          source={{ uri: service.uri(photo.filename) }}
          style={{ width: "100%", height: 220, borderRadius: 16 }}
          resizeMode="contain"
          onError={() =>
            setError(
              "This photo file is unavailable. Replace it or remove its reference.",
            )
          }
        />
      )}
      <Button
        title={photo ? "Replace with camera photo" : "Take photo"}
        secondary
        disabled={busy}
        onPress={() =>
          void change(async () => {
            const p = await pickPhoto(true);
            if (p) await service.replace(ownerType, ownerId, p);
          })
        }
      />
      <Button
        title={photo ? "Replace from library" : "Choose from library"}
        secondary
        disabled={busy}
        onPress={() =>
          void change(async () => {
            const p = await pickPhoto(false);
            if (p) await service.replace(ownerType, ownerId, p);
          })
        }
      />
      {photo && (
        <Button
          title="Remove photo"
          secondary
          disabled={busy}
          onPress={() => void change(() => service.remove(ownerType, ownerId))}
        />
      )}
      {busy && <Body>Saving photo…</Body>}
      {error && (
        <Text accessibilityRole="alert" style={{ color: c.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}
