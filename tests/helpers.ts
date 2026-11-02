import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { migrate, type Database } from "../src/database/schema";
import { ShoppingRepository } from "../src/database/repositories/shopping";
import { ShopRepository } from "../src/database/repositories/shops";
import { TaskRepository } from "../src/database/repositories/tasks";
import { AttachmentRepository } from "../src/database/repositories/attachments";
export function memory(path = ":memory:") {
  const sql = new DatabaseSync(path);
  const db: Database = {
    execAsync: async (q) => {
      sql.exec(q);
    },
    runAsync: async (q, ...p) => sql.prepare(q).run(...p),
    getFirstAsync: async <T>(q: string, ...p: (string | number | null)[]) =>
      (sql.prepare(q).get(...p) as T) ?? null,
    getAllAsync: async <T>(q: string, ...p: (string | number | null)[]) =>
      sql.prepare(q).all(...p) as T[],
    withTransactionAsync: async (action) => {
      sql.exec("BEGIN");
      try {
        await action();
        sql.exec("COMMIT");
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, sql };
}
export async function setup() {
  const { db, sql } = memory();
  await migrate(db);
  const now = new Date().toISOString();
  for (const id of ["home", "other"])
    await db.runAsync(
      "INSERT INTO households (id,name,created_at,updated_at) VALUES (?,?,?,?)",
      id,
      id,
      now,
      now,
    );
  return {
    db,
    sql,
    repo: new ShoppingRepository(db, "home", randomUUID),
    other: new ShoppingRepository(db, "other", randomUUID),
    shops: new ShopRepository(db, "home", randomUUID),
    tasks: new TaskRepository(db, "home", randomUUID),
    attachments: new AttachmentRepository(db, "home", randomUUID),
  };
}
