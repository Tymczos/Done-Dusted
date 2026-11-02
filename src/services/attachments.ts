import type { AttachmentOwner } from "../types/models";
import type { AttachmentRepository } from "../database/repositories/attachments";
export interface PhotoSource {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
}
export interface PhotoStorage {
  copy(source: string, filename: string): Promise<number>;
  remove(filename: string): Promise<void>;
  uri(filename: string): string;
}
/** File operations are compensated if the database write fails. References stay portable. */
export class AttachmentService {
  constructor(
    private repository: AttachmentRepository,
    private storage: PhotoStorage,
    private uuid: () => string,
  ) {}
  async replace(type: AttachmentOwner, id: string, photo: PhotoSource) {
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
      "image/avif": "avif",
    };
    const ext = extensions[photo.mimeType];
    if (!ext) throw new Error("Choose a JPEG, PNG, WebP, HEIC or AVIF image.");
    const filename = `${this.uuid()}.${ext}`,
      old = await this.repository.get(type, id);
    try {
      const size = await this.storage.copy(photo.uri, filename);
      await this.repository.replace(type, id, {
        filename,
        mime_type: photo.mimeType,
        width: photo.width,
        height: photo.height,
        size_bytes: size,
      });
    } catch (error) {
      await this.storage.remove(filename).catch(() => {});
      throw error;
    }
    if (old) await this.storage.remove(old.filename).catch(() => {});
  }
  async remove(type: AttachmentOwner, id: string) {
    const old = await this.repository.get(type, id);
    await this.repository.remove(type, id);
    if (old) await this.storage.remove(old.filename).catch(() => {});
  }
  uri(filename: string) {
    return this.storage.uri(filename);
  }
}
