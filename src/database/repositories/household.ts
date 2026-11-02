import type { Database } from "../schema";
export async function householdName(db: Database, id: string) {
  return (
    (
      await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM households WHERE id=? AND deleted_at IS NULL",
        id,
      )
    )?.name ?? "Our home"
  );
}
