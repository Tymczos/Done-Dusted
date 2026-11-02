import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { memory, setup } from "./helpers";
import { migration001 } from "../src/database/migrations/001";
import { migrate, migrations } from "../src/database/schema";
import { ShoppingRepository } from "../src/database/repositories/shopping";
import { ShopRepository } from "../src/database/repositories/shops";
import {
  TaskRepository,
  type TaskInput,
} from "../src/database/repositories/tasks";
import { AttachmentRepository } from "../src/database/repositories/attachments";
import {
  AttachmentService,
  type PhotoStorage,
} from "../src/services/attachments";
import {
  occurrenceDates,
  isDate,
  localDate,
} from "../src/features/tasks/recurrence";
import { moveShop } from "../src/features/shopping/shopOrder";
const input: TaskInput = {
  title: "Clean kitchen",
  description: "Wipe counters",
  notes: "Use gentle cleaner",
  due_date: "2026-01-31",
  recurrence: null,
  category: "Kitchen",
  priority: "high",
  room: "Kitchen",
  assigned_member_id: null,
};
const item = { name: "Milk", quantity: 2, unit: "L", category: "Dairy" };
test("v1 to v2 preserves existing shopping data and applies defaults exactly once", async () => {
  const { db, sql } = memory();
  await db.execAsync(migration001);
  await db.execAsync(
    "PRAGMA user_version=1; INSERT INTO households VALUES ('h','now','now',NULL,'House'); INSERT INTO shopping_lists VALUES ('l','now','now',NULL,'h','Weekly'); INSERT INTO shopping_items VALUES ('i','now','now',NULL,'h','l','Milk',2,'L',NULL,NULL);",
  );
  await migrate(db);
  await migrate(db);
  const row = await db.getFirstAsync<{
    id: string;
    quantity: number;
    shop_id: string | null;
    notes: string;
  }>("SELECT * FROM shopping_items WHERE id=?", "i");
  assert.equal(row?.quantity, 2);
  assert.equal(row?.shop_id, null);
  assert.equal(row?.notes, "");
  assert.equal(
    sql.prepare("PRAGMA user_version").get()?.user_version,
    migrations.length,
  );
  assert.deepEqual(sql.prepare("PRAGMA foreign_key_check").all(), []);
  sql.close();
});
test("migration failure rolls back additive tables and user_version", async () => {
  const { db, sql } = memory();
  await db.execAsync(migration001);
  await db.execAsync(
    "PRAGMA user_version=1; CREATE TABLE attachments (id TEXT);",
  );
  await assert.rejects(migrate(db));
  assert.equal(sql.prepare("PRAGMA user_version").get()?.user_version, 1);
  assert.equal(
    sql.prepare("SELECT name FROM sqlite_master WHERE name='shops'").get(),
    undefined,
  );
  sql.close();
});
test("shop create rename pin reorder archive restore and household scope", async () => {
  const { sql, db, shops } = await setup();
  const a = await shops.create("  Market  "),
    b = await shops.create("Bakery");
  await shops.rename(a, "Supermarket");
  await shops.reorder([b, a]);
  assert.deepEqual(
    (await shops.list()).map((s) => s.id),
    [b, a],
  );
  await shops.pin(a, true);
  assert.equal((await shops.list())[0]?.id, a);
  await assert.rejects(shops.reorder([a, a]));
  const foreign = new ShopRepository(db, "other", randomUUID);
  await foreign.rename(a, "Bad");
  await foreign.archive(a);
  assert.equal((await shops.list())[0]?.name, "Supermarket");
  await shops.archive(b);
  assert.equal((await shops.list()).length, 1);
  await shops.archive(b, false);
  assert.equal((await shops.list()).length, 2);
  assert.equal((await foreign.list()).length, 0);
  await assert.rejects(shops.create(" "));
  sql.close();
});
test("shop active/saved counts follow purchase undo move list deletion and archive", async () => {
  const { sql, repo, shops } = await setup();
  const list = await repo.createList("Weekly"),
    a = await shops.create("Market"),
    b = await shops.create("Bakery");
  const id = await repo.saveItem(list, {
    ...item,
    shop_id: a,
    notes: "Organic",
  });
  assert.equal(
    (await shops.list(list)).find((s) => s.id === a)?.outstanding,
    1,
  );
  await repo.setPurchased(id, true);
  assert.equal(
    (await shops.list(list)).find((s) => s.id === a)?.outstanding,
    0,
  );
  await repo.setPurchased(id, false);
  assert.equal(
    (await shops.list(list)).find((s) => s.id === a)?.outstanding,
    1,
  );
  await repo.saveItem(list, { ...item, shop_id: b }, id);
  assert.equal(
    (await shops.list(list)).find((s) => s.id === a)?.outstanding,
    0,
  );
  assert.equal(
    (await shops.list(list)).find((s) => s.id === b)?.outstanding,
    1,
  );
  await shops.archive(b);
  assert.equal((await repo.items(list))[0]?.shop_id, null);
  assert.equal(await repo.outstandingCount(), 1);
  await assert.rejects(repo.saveItem(list, { ...item, shop_id: b }));
  await repo.saveItem(list, { ...item, shop_id: a }, id);
  await repo.deleteList(list);
  assert.equal((await shops.list()).find((s) => s.id === a)?.outstanding, 0);
  sql.close();
});
test("assignments reject shops from other households", async () => {
  const { sql, db, repo } = await setup();
  const foreign = new ShopRepository(db, "other", randomUUID),
    id = await foreign.create("Other"),
    list = await repo.createList("List");
  await assert.rejects(repo.saveItem(list, { ...item, shop_id: id }));
  assert.equal((await repo.items(list)).length, 0);
  sql.close();
});
test("drag and accessible reorder clamp within pinned groups", () => {
  const shops = [
    { id: "a", pinned: 1 },
    { id: "b", pinned: 0 },
    { id: "c", pinned: 0 },
  ];
  assert.deepEqual(
    moveShop(shops, "c", 0).map((s) => s.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    moveShop(shops, "a", 2).map((s) => s.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(moveShop(shops, "missing", 2), shops);
});
test("daily weekly monthly recurrence handles leap years and original day anchoring", () => {
  assert.deepEqual(occurrenceDates("2026-01-30", "daily", "2026-02-02"), [
    "2026-01-30",
    "2026-01-31",
    "2026-02-01",
    "2026-02-02",
  ]);
  assert.deepEqual(occurrenceDates("2026-01-30", "weekly", "2026-02-14"), [
    "2026-01-30",
    "2026-02-06",
    "2026-02-13",
  ]);
  assert.deepEqual(occurrenceDates("2024-01-31", "monthly", "2024-04-30"), [
    "2024-01-31",
    "2024-02-29",
    "2024-03-31",
    "2024-04-30",
  ]);
  assert.deepEqual(occurrenceDates("2026-01-31", "monthly", "2026-03-31"), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
  ]);
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2024-02-29"), true);
  assert.throws(() => occurrenceDates("wrong", "daily", "2026-01-01"));
});
test("task CRUD validates input, supports local members and undated tasks", async () => {
  const { sql, db, tasks } = await setup();
  const member = await tasks.addMember("Alex");
  const id = await tasks.save(
    { ...input, assigned_member_id: member },
    undefined,
    "2026-01-31",
  );
  assert.equal((await tasks.get(id))?.description, "Wipe counters");
  assert.equal(
    (await tasks.list("Today", "2026-01-31"))[0]?.assignee_name,
    "Alex",
  );
  await tasks.save(
    { ...input, title: "Updated", due_date: "", priority: null },
    id,
    "2026-01-31",
  );
  assert.equal((await tasks.list("Today", "2026-01-31"))[0]?.title, "Updated");
  await assert.rejects(tasks.save({ ...input, title: " " }));
  await assert.rejects(tasks.save({ ...input, due_date: "2026-02-30" }));
  await assert.rejects(
    tasks.save({ ...input, recurrence: "daily", due_date: "" }),
  );
  const foreign = new TaskRepository(db, "other", randomUUID);
  assert.equal(await foreign.get(id), null);
  await assert.rejects(foreign.save({ ...input, assigned_member_id: member }));
  await tasks.remove(id);
  assert.equal(await tasks.get(id), null);
  assert.equal((await tasks.list("Today", "2026-01-31")).length, 0);
  sql.close();
});
test("recurring completions are separate, idempotent, undoable and retain history", async () => {
  const { sql, db, tasks } = await setup();
  const id = await tasks.save(
    { ...input, due_date: "2026-01-01", recurrence: "daily" },
    undefined,
    "2026-01-01",
  );
  const first = (await tasks.list("Today", "2026-01-01"))[0]!;
  await tasks.complete(first.occurrence_id, true);
  await tasks.complete(first.occurrence_id, true);
  assert.equal((await tasks.history(id)).length, 1);
  assert.equal(
    (await tasks.list("Today", "2026-01-02"))[0]?.completed_at,
    null,
  );
  const count = sql
    .prepare("SELECT count(*) AS n FROM task_occurrences")
    .get()?.n;
  await tasks.materialize("2026-01-01");
  assert.equal(
    sql.prepare("SELECT count(*) AS n FROM task_occurrences").get()?.n,
    count,
  );
  await tasks.complete(first.occurrence_id, false);
  assert.ok((await tasks.history(id))[0]?.undone_at);
  await tasks.complete(first.occurrence_id, true);
  assert.equal((await tasks.history(id)).length, 2);
  const foreign = new TaskRepository(db, "other", randomUUID);
  await assert.rejects(foreign.complete(first.occurrence_id, false));
  await tasks.remove(id);
  assert.equal((await tasks.list("Completed", "2026-01-01")).length, 0);
  assert.equal((await tasks.history(id)).length, 2);
  sql.close();
});
test("editing recurrence keeps completions, removes obsolete pending occurrences and extends horizon", async () => {
  const { sql, tasks } = await setup();
  const id = await tasks.save(
    { ...input, due_date: "2026-01-01", recurrence: "daily" },
    undefined,
    "2026-01-01",
  );
  const first = (await tasks.list("Today", "2026-01-01"))[0]!;
  await tasks.complete(first.occurrence_id, true);
  await tasks.save(
    { ...input, due_date: "2026-01-01", recurrence: "weekly" },
    id,
    "2026-01-01",
  );
  assert.equal((await tasks.list("Completed", "2026-01-01")).length, 1);
  assert.equal((await tasks.list("Today", "2026-01-02")).length, 0);
  assert.equal((await tasks.list("Today", "2026-01-08")).length, 1);
  await tasks.materialize("2026-04-01");
  assert.ok((await tasks.list("Upcoming", "2026-04-01")).length > 0);
  sql.close();
});
test("dashboard uses local-date counts and actual upcoming occurrences", async () => {
  const { sql, tasks } = await setup();
  const today = localDate();
  await tasks.save({ ...input, due_date: today }, undefined, today);
  await tasks.save({ ...input, due_date: "2000-01-01" }, undefined, today);
  await tasks.save({ ...input, due_date: "2190-01-01" }, undefined, today);
  let summary = await tasks.dashboard(today);
  assert.equal(summary.today, 1);
  assert.equal(summary.overdue, 1);
  assert.equal(summary.upcoming.length, 1);
  await tasks.complete(
    (await tasks.list("Today", today))[0]!.occurrence_id,
    true,
  );
  summary = await tasks.dashboard(today);
  assert.equal(summary.today, 0);
  assert.equal(summary.completed, 1);
  sql.close();
});
test("attachment metadata validates ownership, replacement tombstones and shopping indicator", async () => {
  const { sql, db, repo, tasks, attachments } = await setup();
  const list = await repo.createList("List"),
    id = await repo.saveItem(list, item);
  const photo = {
    filename: `${randomUUID()}.jpg`,
    mime_type: "image/jpeg",
    width: 20,
    height: 30,
    size_bytes: 100,
  };
  await attachments.replace("shopping_item", id, photo);
  assert.equal((await repo.items(list))[0]?.has_photo, 1);
  await attachments.replace("shopping_item", id, {
    ...photo,
    filename: `${randomUUID()}.jpg`,
  });
  assert.equal(
    sql
      .prepare(
        "SELECT count(*) AS n FROM attachments WHERE deleted_at IS NOT NULL",
      )
      .get()?.n,
    1,
  );
  await assert.rejects(
    attachments.replace("shopping_item", id, {
      ...photo,
      filename: "../bad.jpg",
    }),
  );
  await assert.rejects(
    attachments.replace("shopping_item", id, { ...photo, size_bytes: 0 }),
  );
  await assert.rejects(
    new AttachmentRepository(db, "other", randomUUID).replace(
      "shopping_item",
      id,
      photo,
    ),
  );
  const task = await tasks.save(input, undefined, "2026-01-31");
  await attachments.replace("task", task, photo);
  assert.equal((await attachments.get("task", task))?.width, 20);
  await attachments.remove("shopping_item", id);
  assert.equal(await attachments.get("shopping_item", id), null);
  assert.equal((await repo.items(list))[0]?.has_photo, 0);
  sql.close();
});
test("photo files and metadata survive reopen, failed writes clean up, replacement/removal delete files", async () => {
  mkdirSync(".test-data", { recursive: true });
  const dir = mkdtempSync(join(".test-data", "photos-"));
  const path = join(dir, "app.sqlite");
  const source = join(dir, "source.jpg");
  writeFileSync(source, "test image bytes");
  const storage: PhotoStorage = {
    uri: (n) => join(dir, n),
    copy: async (s, n) => {
      copyFileSync(s, join(dir, n));
      return statSync(join(dir, n)).size;
    },
    remove: async (n) => {
      rmSync(join(dir, n), { force: true });
    },
  };
  let sql: ReturnType<typeof memory>["sql"] | undefined;
  try {
    const first = memory(path);
    sql = first.sql;
    await migrate(first.db);
    await first.db.runAsync(
      "INSERT INTO households (id,name,created_at,updated_at) VALUES (?,?,?,?)",
      "home",
      "Home",
      "now",
      "now",
    );
    const repo = new ShoppingRepository(first.db, "home", randomUUID),
      list = await repo.createList("Trip"),
      id = await repo.saveItem(list, item);
    const attachments = new AttachmentRepository(first.db, "home", randomUUID),
      service = new AttachmentService(attachments, storage, randomUUID);
    await service.replace("shopping_item", id, {
      uri: source,
      mimeType: "image/jpeg",
      width: 20,
      height: 20,
    });
    const original = (await attachments.get("shopping_item", id))!.filename;
    first.sql.close();
    sql = undefined;
    const second = memory(path);
    sql = second.sql;
    await migrate(second.db);
    const restored = new AttachmentRepository(second.db, "home", randomUUID),
      next = new AttachmentService(restored, storage, randomUUID);
    assert.equal(
      readFileSync(
        next.uri((await restored.get("shopping_item", id))!.filename),
        "utf8",
      ),
      "test image bytes",
    );
    await next.replace("shopping_item", id, {
      uri: source,
      mimeType: "image/jpeg",
      width: 10,
      height: 10,
    });
    assert.throws(() => statSync(storage.uri(original)));
    const current = (await restored.get("shopping_item", id))!.filename;
    await next.remove("shopping_item", id);
    assert.throws(() => statSync(storage.uri(current)));
    assert.equal(await restored.get("shopping_item", id), null);
    const fixed = new AttachmentService(
      restored,
      storage,
      () => "failure-file",
    );
    await assert.rejects(
      fixed.replace("task", "nonexistent", {
        uri: source,
        mimeType: "image/jpeg",
        width: 10,
        height: 10,
      }),
    );
    assert.throws(() => statSync(storage.uri("failure-file.jpg")));
    await assert.rejects(
      next.replace("shopping_item", id, {
        uri: source,
        mimeType: "text/plain",
        width: 10,
        height: 10,
      }),
    );
  } finally {
    sql?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("custom shop order, task assignment and completion history survive database reopen", async () => {
  mkdirSync(".test-data", { recursive: true });
  const dir = mkdtempSync(join(".test-data", "records-")),
    path = join(dir, "app.sqlite");
  let connection: ReturnType<typeof memory> | undefined;
  try {
    connection = memory(path);
    await migrate(connection.db);
    await connection.db.runAsync(
      "INSERT INTO households (id,name,created_at,updated_at) VALUES (?,?,?,?)",
      "home",
      "Home",
      "now",
      "now",
    );
    const shops = new ShopRepository(connection.db, "home", randomUUID),
      tasks = new TaskRepository(connection.db, "home", randomUUID);
    const a = await shops.create("Market"),
      b = await shops.create("Bakery");
    await shops.reorder([b, a]);
    const member = await tasks.addMember("Alex");
    const taskId = await tasks.save(
      { ...input, assigned_member_id: member },
      undefined,
      "2026-01-31",
    );
    await tasks.complete(
      (await tasks.list("Today", "2026-01-31"))[0]!.occurrence_id,
      true,
    );
    connection.sql.close();
    connection = memory(path);
    await migrate(connection.db);
    assert.deepEqual(
      (await new ShopRepository(connection.db, "home", randomUUID).list()).map(
        (s) => s.id,
      ),
      [b, a],
    );
    const restored = new TaskRepository(connection.db, "home", randomUUID);
    assert.equal((await restored.get(taskId))?.assigned_member_id, member);
    assert.equal(
      (await restored.list("Completed", "2026-01-31"))[0]?.assignee_name,
      "Alex",
    );
    assert.equal((await restored.history(taskId)).length, 1);
  } finally {
    connection?.sql.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
