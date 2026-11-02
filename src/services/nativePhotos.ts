import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import type { PhotoSource, PhotoStorage } from "./attachments";
const directory = () => {
  if (!FileSystem.documentDirectory)
    throw new Error("Persistent photo storage is unavailable on this device.");
  return `${FileSystem.documentDirectory}attachments/`;
};
export const photoStorage: PhotoStorage = {
  uri(filename) {
    if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|heic|avif)$/.test(filename))
      throw new Error("Invalid image reference");
    return directory() + filename;
  },
  async copy(source, filename) {
    await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
    const uri = this.uri(filename);
    await FileSystem.copyAsync({ from: source, to: uri });
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory)
      throw new Error("Could not save the photo.");
    return info.size;
  },
  async remove(filename) {
    await FileSystem.deleteAsync(this.uri(filename), { idempotent: true });
  },
};
export async function pickPhoto(camera: boolean): Promise<PhotoSource | null> {
  const permission = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      `${camera ? "Camera" : "Photo library"} access was not granted. You can continue without a photo or allow access in device Settings.`,
    );
  const result = camera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error("No image was selected.");
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? "image/jpeg",
  };
}
