import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";

import { join } from "node:path";
import { migrate, migrations, type Database } from "../src/database/schema";
import { ShoppingRepository } from "../src/database/repositories/shopping";
function memory(path = ":memory:") {
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
async function setup() {
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
  };
}
test("migrations create all tables and are repeatable", async () => {
  const { db, sql } = memory();
  await migrate(db);
  await migrate(db);
  assert.equal(
    sql.prepare("PRAGMA user_version").get()?.user_version,
    migrations.length,
  );
  const tables = sql
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  for (const table of [
    "local_profiles",
    "households",
    "household_members",
    "shopping_lists",
    "shopping_items",
    "tasks",
    "task_occurrences",
    "household_events",
    "app_settings",
  ])
    assert.ok(tables.includes(table));
  assert.equal(sql.prepare("PRAGMA foreign_keys").get()?.foreign_keys, 1);
  sql.close();
});
test("newer database versions are rejected", async () => {
  const { db, sql } = memory();
  sql.exec("PRAGMA user_version=99");
  await assert.rejects(migrate(db), /newer/);
  sql.close();
});
test("shopping CRUD, completion, clearing and tombstones", async () => {
  const { db, sql, repo } = await setup();
  const id = await repo.createList("  Weekly  ");
  assert.equal((await repo.lists())[0]?.name, "Weekly");
  await repo.renameList(id, "Pantry");
  assert.equal((await repo.lists())[0]?.name, "Pantry");
  const item = await repo.saveItem(id, {
    name: "Milk",
    quantity: 2,
    unit: "L",
    category: "Dairy",
  });
  await repo.saveItem(
    id,
    { name: "Oat milk", quantity: 3, unit: "L", category: "Dairy" },
    item,
  );
  assert.equal((await repo.items(id))[0]?.name, "Oat milk");
  assert.equal(await repo.outstandingCount(), 1);
  await repo.setPurchased(item, true);
  assert.equal(await repo.outstandingCount(), 0);
  await repo.setPurchased(item, false);
  assert.equal(await repo.outstandingCount(), 1);
  await repo.setPurchased(item, true);
  await repo.clearCompleted(id);
  assert.equal((await repo.items(id)).length, 0);
  assert.ok(
    (
      await db.getFirstAsync<{ deleted_at: string }>(
        "SELECT deleted_at FROM shopping_items WHERE id=?",
        item,
      )
    )?.deleted_at,
  );
  const second = await repo.saveItem(id, {
    name: "Bread",
    quantity: 1,
    unit: "",
    category: "",
  });
  await repo.deleteItem(second);
  assert.equal((await repo.items(id)).length, 0);
  await repo.saveItem(id, {
    name: "Eggs",
    quantity: 6,
    unit: "",
    category: "",
  });
  await repo.deleteList(id);
  assert.equal((await repo.lists()).length, 0);
  assert.equal((await repo.items(id)).length, 0);
  sql.close();
});
test("validation and household boundaries", async () => {
  const { sql, repo, other } = await setup();
  await assert.rejects(repo.createList(" "));
  const id = await repo.createList("Groceries");
  await assert.rejects(
    repo.saveItem(id, { name: "Milk", quantity: 0, unit: "", category: "" }),
  );
  await assert.rejects(
    other.saveItem(id, { name: "Milk", quantity: 1, unit: "", category: "" }),
  );
  await other.renameList(id, "Intruder");
  await other.deleteList(id);
  assert.equal((await repo.lists())[0]?.name, "Groceries");
  assert.equal((await other.lists()).length, 0);
  sql.close();
});

test("shopping data persists after closing and reopening SQLite", async () => {
  mkdirSync(".test-data", { recursive: true });
  const dir = mkdtempSync(join(".test-data", "hometogether-"));
  const path = join(dir, "local.sqlite");
  try {
    const first = memory(path);
    await migrate(first.db);
    const now = new Date().toISOString();
    await first.db.runAsync(
      "INSERT INTO households (id,name,created_at,updated_at) VALUES (?,?,?,?)",
      "home",
      "Home",
      now,
      now,
    );
    const repo = new ShoppingRepository(first.db, "home", randomUUID);
    const id = await repo.createList("Weekend");
    await repo.saveItem(id, {
      name: "Apples",
      quantity: 4,
      unit: "",
      category: "Fruit",
    });
    first.sql.close();
    const second = memory(path);
    await migrate(second.db);
    const restored = new ShoppingRepository(second.db, "home", randomUUID);
    assert.equal((await restored.lists())[0]?.name, "Weekend");
    assert.equal((await restored.items(id))[0]?.quantity, 4);
    second.sql.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
