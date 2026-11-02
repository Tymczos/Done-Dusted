import { z } from "zod";
import type { Database } from "../schema";
import type { Shop } from "../../types/models";
const nameSchema = z.string().trim().min(1, "Enter a shop name").max(80);
export class ShopRepository {
  constructor(
    private db: Database,
    private householdId: string,
    private uuid: () => string,
  ) {}
  list(listId?: string, includeArchived = false) {
    return this.db.getAllAsync<Shop>(
      `SELECT s.*, (SELECT count(*) FROM shopping_items i JOIN shopping_lists l ON l.id=i.list_id
   WHERE i.shop_id=s.id AND i.household_id=s.household_id AND i.deleted_at IS NULL AND l.deleted_at IS NULL
   AND i.purchased_at IS NULL ${listId ? "AND i.list_id=?" : ""}) AS outstanding
   FROM shops s WHERE s.household_id=? AND s.deleted_at IS NULL ${includeArchived ? "" : "AND s.archived_at IS NULL"}
   ORDER BY s.pinned DESC,s.position,s.created_at,s.id`,
      ...(listId ? [listId, this.householdId] : [this.householdId]),
    );
  }
  async create(name: string) {
    name = nameSchema.parse(name);
    const id = this.uuid(),
      now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO shops (id,household_id,name,position,created_at,updated_at)
   VALUES (?,?,?,(SELECT coalesce(max(position),-1)+1 FROM shops WHERE household_id=?),?,?)`,
      id,
      this.householdId,
      name,
      this.householdId,
      now,
      now,
    );
    return id;
  }
  async rename(id: string, name: string) {
    await this.db.runAsync(
      "UPDATE shops SET name=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
      nameSchema.parse(name),
      new Date().toISOString(),
      id,
      this.householdId,
    );
  }
  async pin(id: string, pinned: boolean) {
    await this.db.runAsync(
      "UPDATE shops SET pinned=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
      pinned ? 1 : 0,
      new Date().toISOString(),
      id,
      this.householdId,
    );
  }
  async archive(id: string, archived = true) {
    const now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      // Unassign active items so archiving never hides outstanding shopping.
      if (archived)
        await this.db.runAsync(
          `UPDATE shopping_items SET shop_id=NULL,updated_at=? WHERE shop_id=? AND household_id=? AND deleted_at IS NULL`,
          now,
          id,
          this.householdId,
        );
      await this.db.runAsync(
        "UPDATE shops SET archived_at=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
        archived ? now : null,
        now,
        id,
        this.householdId,
      );
    });
  }
  async reorder(ids: string[]) {
    const current = await this.list();
    if (
      new Set(ids).size !== ids.length ||
      ids.length !== current.length ||
      current.some((s) => !ids.includes(s.id))
    )
      throw new Error("Shop order changed. Reload and try again.");
    const now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      for (let i = 0; i < ids.length; i++)
        await this.db.runAsync(
          "UPDATE shops SET position=?,updated_at=? WHERE id=? AND household_id=?",
          i,
          now,
          ids[i]!,
          this.householdId,
        );
    });
  }
}
