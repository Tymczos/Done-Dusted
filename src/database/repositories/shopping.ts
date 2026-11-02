import { z } from "zod";
import type { Database } from "../schema";
import type { ShoppingItem, ShoppingList } from "../../types/models";
export const listSchema = z.object({
  name: z.string().trim().min(1, "Enter a list name").max(80),
});
export const itemSchema = z.object({
  name: z.string().trim().min(1, "Enter an item name").max(120),
  quantity: z
    .number()
    .positive("Quantity must be greater than zero")
    .max(99999),
  unit: z.string().trim().max(30),
  category: z.string().trim().max(50),
  shop_id: z.string().nullable().optional(),
  notes: z.string().max(4000).optional(),
});
export type ItemInput = z.infer<typeof itemSchema>;
export class ShoppingRepository {
  constructor(
    private db: Database,
    private householdId: string,
    private uuid: () => string,
  ) {}
  lists() {
    return this.db.getAllAsync<ShoppingList>(
      "SELECT * FROM shopping_lists WHERE household_id=? AND deleted_at IS NULL ORDER BY created_at,id",
      this.householdId,
    );
  }
  items(listId: string) {
    return this.db.getAllAsync<ShoppingItem>(
      `SELECT *, EXISTS(SELECT 1 FROM attachments a WHERE a.owner_id=shopping_items.id AND a.owner_type='shopping_item' AND a.deleted_at IS NULL AND a.household_id=shopping_items.household_id) AS has_photo FROM shopping_items WHERE household_id=? AND list_id=? AND deleted_at IS NULL ORDER BY created_at,id`,
      this.householdId,
      listId,
    );
  }
  async createList(name: string) {
    const value = listSchema.parse({ name });
    const id = this.uuid(),
      now = new Date().toISOString();
    await this.db.runAsync(
      "INSERT INTO shopping_lists (id,household_id,name,created_at,updated_at) VALUES (?,?,?,?,?)",
      id,
      this.householdId,
      value.name,
      now,
      now,
    );
    return id;
  }
  async renameList(id: string, name: string) {
    const value = listSchema.parse({ name });
    await this.db.runAsync(
      "UPDATE shopping_lists SET name=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
      value.name,
      new Date().toISOString(),
      id,
      this.householdId,
    );
  }
  async deleteList(id: string) {
    const now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        "UPDATE shopping_items SET deleted_at=?,updated_at=? WHERE list_id=? AND household_id=? AND deleted_at IS NULL",
        now,
        now,
        id,
        this.householdId,
      );
      await this.db.runAsync(
        "UPDATE shopping_lists SET deleted_at=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
        now,
        now,
        id,
        this.householdId,
      );
    });
  }
  async saveItem(listId: string, input: ItemInput, id?: string) {
    const v = itemSchema.parse(input),
      now = new Date().toISOString();
    if (
      !(await this.db.getFirstAsync(
        "SELECT id FROM shopping_lists WHERE id=? AND household_id=? AND deleted_at IS NULL",
        listId,
        this.householdId,
      ))
    )
      throw new Error("This shopping list no longer exists.");
    if (
      v.shop_id &&
      !(await this.db.getFirstAsync(
        "SELECT id FROM shops WHERE id=? AND household_id=? AND deleted_at IS NULL AND archived_at IS NULL",
        v.shop_id,
        this.householdId,
      ))
    )
      throw new Error("Choose an active shop from this household.");
    if (id)
      await this.db.runAsync(
        "UPDATE shopping_items SET name=?,quantity=?,unit=?,category=?,shop_id=?,notes=?,updated_at=? WHERE id=? AND list_id=? AND household_id=? AND deleted_at IS NULL",
        v.name,
        v.quantity,
        v.unit || null,
        v.category || null,
        v.shop_id ?? null,
        v.notes ?? "",
        now,
        id,
        listId,
        this.householdId,
      );
    else {
      id = this.uuid();
      await this.db.runAsync(
        "INSERT INTO shopping_items (id,household_id,list_id,name,quantity,unit,category,shop_id,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        id,
        this.householdId,
        listId,
        v.name,
        v.quantity,
        v.unit || null,
        v.category || null,
        v.shop_id ?? null,
        v.notes ?? "",
        now,
        now,
      );
    }
    return id;
  }
  async setPurchased(id: string, purchased: boolean) {
    const now = new Date().toISOString();
    await this.db.runAsync(
      "UPDATE shopping_items SET purchased_at=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
      purchased ? now : null,
      now,
      id,
      this.householdId,
    );
  }
  async deleteItem(id: string) {
    const now = new Date().toISOString();
    await this.db.runAsync(
      "UPDATE shopping_items SET deleted_at=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
      now,
      now,
      id,
      this.householdId,
    );
  }
  async clearCompleted(listId: string) {
    const now = new Date().toISOString();
    await this.db.runAsync(
      "UPDATE shopping_items SET deleted_at=?,updated_at=? WHERE list_id=? AND household_id=? AND purchased_at IS NOT NULL AND deleted_at IS NULL",
      now,
      now,
      listId,
      this.householdId,
    );
  }
  async outstandingCount() {
    return (
      (
        await this.db.getFirstAsync<{ count: number }>(
          "SELECT count(*) AS count FROM shopping_items WHERE household_id=? AND deleted_at IS NULL AND purchased_at IS NULL",
          this.householdId,
        )
      )?.count ?? 0
    );
  }
}
