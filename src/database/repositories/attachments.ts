import { z } from "zod";
import type { Database } from "../schema";
import type { Attachment, AttachmentOwner } from "../../types/models";
export const attachmentSchema = z.object({
  filename: z.string().regex(/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|heic|avif)$/),
  mime_type: z.string().regex(/^image\/(jpeg|png|webp|heic|avif)$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
export type AttachmentInput = z.infer<typeof attachmentSchema>;
export class AttachmentRepository {
  constructor(
    private db: Database,
    private householdId: string,
    private uuid: () => string,
  ) {}
  get(ownerType: AttachmentOwner, ownerId: string) {
    return this.db.getFirstAsync<Attachment>(
      "SELECT * FROM attachments WHERE household_id=? AND owner_type=? AND owner_id=? AND deleted_at IS NULL",
      this.householdId,
      ownerType,
      ownerId,
    );
  }
  async replace(
    ownerType: AttachmentOwner,
    ownerId: string,
    input: AttachmentInput,
  ) {
    const v = attachmentSchema.parse(input),
      now = new Date().toISOString(),
      id = this.uuid();
    const table = ownerType === "task" ? "tasks" : "shopping_items";
    await this.db.withTransactionAsync(async () => {
      if (
        !(await this.db.getFirstAsync(
          `SELECT id FROM ${table} WHERE id=? AND household_id=? AND deleted_at IS NULL`,
          ownerId,
          this.householdId,
        ))
      )
        throw new Error("The attachment owner no longer exists.");
      await this.db.runAsync(
        "UPDATE attachments SET deleted_at=?,updated_at=? WHERE household_id=? AND owner_type=? AND owner_id=? AND deleted_at IS NULL",
        now,
        now,
        this.householdId,
        ownerType,
        ownerId,
      );
      await this.db.runAsync(
        "INSERT INTO attachments (id,household_id,owner_type,owner_id,filename,mime_type,width,height,size_bytes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        id,
        this.householdId,
        ownerType,
        ownerId,
        v.filename,
        v.mime_type,
        v.width,
        v.height,
        v.size_bytes,
        now,
        now,
      );
    });
    return id;
  }
  async remove(ownerType: AttachmentOwner, ownerId: string) {
    const now = new Date().toISOString();
    await this.db.runAsync(
      "UPDATE attachments SET deleted_at=?,updated_at=? WHERE household_id=? AND owner_type=? AND owner_id=? AND deleted_at IS NULL",
      now,
      now,
      this.householdId,
      ownerType,
      ownerId,
    );
  }
}
