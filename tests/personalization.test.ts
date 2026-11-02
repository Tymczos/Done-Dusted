import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { memory, setup } from "./helpers";
import { PreferencesRepository } from "../src/database/repositories/preferences";
import { migration001 } from "../src/database/migrations/001";
import { migration002 } from "../src/database/migrations/002";
import { migrate } from "../src/database/schema";
import {
  defaultPreferences,
  preferencesSchema,
  reorderDashboard,
  motionEnabled,
  themeIds,
  periods,
  sceneIds,
} from "../src/theme/preferences";
import {
  timePeriod,
  nextBoundary,
  selectedPeriod,
  greeting,
} from "../src/theme/time";
import {
  themes,
  semanticColors,
  contrast,
  scenePalette,
} from "../src/theme/palettes";
import { sceneSpec, sceneryPacks } from "../src/theme/scenes";
import { OpeningHistory } from "../src/theme/motion";
async function profile(db: ReturnType<typeof memory>["db"], id = "profile") {
  await db.runAsync(
    "INSERT INTO local_profiles (id,display_name,created_at,updated_at) VALUES (?,?,?,?)",
    id,
    id,
    "now",
    "now",
  );
  return new PreferencesRepository(db, id);
}
test("new profiles default to Lavender Mist and independent automatic Mountain Skies", async () => {
  const { db, sql } = await setup();
  const repo = await profile(db);
  assert.deepEqual(await repo.load(), defaultPreferences());
  assert.equal((await repo.load()).theme, "lavender");
  const other = defaultPreferences();
  other.dashboard.reverse();
  assert.deepEqual(
    defaultPreferences().dashboard.map((s) => s.id),
    ["shopping", "tasks", "upcoming"],
  );
  sql.close();
});
test("all eight themes persist without changing scene selection or other profiles", async () => {
  const { db, sql } = await setup();
  const a = await profile(db, "a"),
    b = await profile(db, "b");
  for (const theme of themeIds) {
    const value = { ...defaultPreferences(), theme, scene: "whale" as const };
    await a.save(value);
    assert.deepEqual(await a.load(), value);
    assert.equal((await b.load()).theme, "lavender");
  }
  assert.equal(themes.length, 8);
  sql.close();
});
test("theme, scenery, font, layout and motion preferences survive SQLite reopen", async () => {
  mkdirSync(".test-data", { recursive: true });
  const dir = mkdtempSync(join(".test-data", "personalization-"));
  const path = join(dir, "app.sqlite");
  let connection: ReturnType<typeof memory> | undefined;
  try {
    connection = memory(path);
    await migrate(connection.db);
    const repo = await profile(connection.db);
    const value = preferencesSchema.parse({
      ...defaultPreferences(),
      theme: "ocean",
      scene: "mediterranean",
      scenery: "evening",
      appearance: "dark",
      font: "script",
      motion: "reduced",
      dashboard: [
        { id: "upcoming", visible: false },
        { id: "tasks", visible: true },
        { id: "shopping", visible: true },
      ],
    });
    await repo.save(value);
    connection.sql.close();
    connection = memory(path);
    await migrate(connection.db);
    assert.deepEqual(
      await new PreferencesRepository(connection.db, "profile").load(),
      value,
    );
  } finally {
    connection?.sql.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("preference reset affects only its profile, preserving household records", async () => {
  const { db, sql, repo, shops, tasks, attachments } = await setup();
  const prefs = await profile(db, "a"),
    other = await profile(db, "b");
  const list = await repo.createList("Weekly"),
    shop = await shops.create("Market"),
    item = await repo.saveItem(list, {
      name: "Milk",
      quantity: 2,
      unit: "L",
      category: "Dairy",
      shop_id: shop,
    });
  await attachments.replace("shopping_item", item, {
    filename: `${randomUUID()}.jpg`,
    mime_type: "image/jpeg",
    width: 10,
    height: 10,
    size_bytes: 20,
  });
  const task = await tasks.save(
    {
      title: "Clean",
      description: "",
      notes: "",
      due_date: "2026-01-01",
      recurrence: "weekly",
      category: "Cleaning",
      priority: null,
      room: "",
      assigned_member_id: null,
    },
    undefined,
    "2026-01-01",
  );
  await tasks.complete(
    (await tasks.list("Today", "2026-01-01"))[0]!.occurrence_id,
    true,
  );
  await prefs.save({ ...defaultPreferences(), theme: "peach" });
  await other.save({ ...defaultPreferences(), theme: "indigo" });
  await prefs.reset();
  assert.deepEqual(await prefs.load(), defaultPreferences());
  assert.equal((await other.load()).theme, "indigo");
  assert.equal((await repo.items(list))[0]?.quantity, 2);
  assert.equal((await shops.list())[0]?.id, shop);
  assert.equal((await tasks.get(task))?.recurrence, "weekly");
  assert.equal((await tasks.history(task)).length, 1);
  assert.ok(await attachments.get("shopping_item", item));
  sql.close();
});
test("invalid preferences are rejected and corrupt rows require explicit reset", async () => {
  const { db, sql } = await setup();
  const repo = await profile(db);
  await assert.rejects(
    repo.save({ ...defaultPreferences(), theme: "unknown" } as never),
  );
  await assert.rejects(
    repo.save({
      ...defaultPreferences(),
      dashboard: [
        { id: "shopping", visible: true },
        { id: "shopping", visible: true },
        { id: "tasks", visible: true },
      ],
    }),
  );
  await db.runAsync(
    "INSERT INTO profile_preferences VALUES (?,?,?,?)",
    "profile",
    "not-json",
    "now",
    "now",
  );
  await assert.rejects(repo.load(), /Restore personalization defaults/);
  await repo.reset();
  assert.deepEqual(await repo.load(), defaultPreferences());
  sql.close();
});
test("dashboard reorder and visibility preserve every section and respect bounds", () => {
  const original = defaultPreferences().dashboard;
  const moved = reorderDashboard(original, "upcoming", -1);
  assert.deepEqual(
    moved.map((s) => s.id),
    ["shopping", "upcoming", "tasks"],
  );
  assert.deepEqual(
    original.map((s) => s.id),
    ["shopping", "tasks", "upcoming"],
  );
  assert.deepEqual(reorderDashboard(original, "shopping", -1), original);
  assert.deepEqual(reorderDashboard(original, "upcoming", 1), original);
  assert.ok(
    preferencesSchema.safeParse({
      ...defaultPreferences(),
      dashboard: original.map((s) => ({ ...s, visible: false })),
    }).success,
  );
  assert.equal(
    preferencesSchema.safeParse({
      ...defaultPreferences(),
      dashboard: original.slice(1),
    }).success,
    false,
  );
});
test("time periods use exact device-local boundary hours", () => {
  const cases: [number, number, string][] = [
    [0, 0, "night"],
    [4, 59, "night"],
    [5, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [17, 59, "afternoon"],
    [18, 0, "evening"],
    [20, 59, "evening"],
    [21, 0, "night"],
    [23, 59, "night"],
  ];
  for (const [hour, minute, expected] of cases)
    assert.equal(timePeriod(new Date(2026, 6, 12, hour, minute)), expected);
  assert.equal(greeting(new Date(2026, 6, 12, 21)), "A peaceful night");
});
test("next boundary is in the future, including overnight and local timezone offsets", () => {
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(2026, 9, 25, hour, 30);
    const next = nextBoundary(date);
    assert.ok(next > date);
    assert.ok([5, 12, 18, 21].includes(next.getHours()));
    assert.equal(next.getMinutes(), 0);
    assert.notEqual(timePeriod(date), timePeriod(next));
  }
  const overnight = nextBoundary(new Date(2026, 11, 31, 23, 59));
  assert.equal(overnight.getFullYear(), 2027);
  assert.equal(overnight.getDate(), 1);
  assert.equal(overnight.getHours(), 5);
});
test("automatic and all fixed scene periods remain independent of actual greeting", () => {
  const date = new Date(2026, 6, 12, 7);
  assert.equal(selectedPeriod("automatic", date), "morning");
  for (const period of periods)
    assert.equal(selectedPeriod(period, date), period);
  assert.equal(greeting(date), "Good morning");
});
test("five real pack selections and 32 theme/time palettes generate independent specs", () => {
  assert.deepEqual(
    sceneryPacks.map((s) => s.id),
    [...sceneIds],
  );
  for (const theme of themeIds) {
    const palettes = periods.map((period) =>
      JSON.stringify(scenePalette(theme, period)),
    );
    assert.equal(new Set(palettes).size, 4);
    for (const period of periods)
      for (const pack of sceneIds) {
        const spec = sceneSpec(theme, period, pack);
        assert.equal(spec.theme, theme);
        assert.equal(spec.pack, pack);
        assert.equal(spec.period, period);
        assert.match(spec.palette.top, /^#[0-9a-f]{6}$/i);
      }
  }
});
test("all text and action foregrounds meet WCAG AA across eight themes and both appearances", () => {
  for (const theme of themeIds)
    for (const dark of [true, false]) {
      const c = semanticColors(theme, dark);
      for (const surface of [c.card, c.background, c.soft]) {
        assert.ok(
          contrast(c.text, surface) >= 4.5,
          `${theme}: text on ${surface}`,
        );
        assert.ok(
          contrast(c.muted, surface) >= 4.5,
          `${theme}: secondary text on ${surface}`,
        );
      }
      for (const stop of c.gradient)
        assert.ok(
          contrast(c.onPrimary, stop) >= 4.5,
          `${theme}: button gradient`,
        );
      assert.ok(
        contrast(c.primary, c.background) >= 4.5,
        `${theme}: accent text`,
      );
      assert.ok(contrast(c.danger, c.card) >= 4.5, `${theme}: error text`);
    }
});
test("motion never overrides system reduction or unknown accessibility status", () => {
  assert.equal(motionEnabled("system", false), true);
  assert.equal(motionEnabled("system", true), false);
  assert.equal(motionEnabled("system", null), false);
  assert.equal(motionEnabled("reduced", false), false);
  assert.equal(motionEnabled("reduced", true), false);
});
test("opening sun animation is claimed once per local day/period across tab mounts", () => {
  const history = new OpeningHistory(),
    date = new Date(2026, 6, 12, 8);
  assert.equal(history.claim(date, "morning"), true);
  assert.equal(history.claim(date, "morning"), false);
  assert.equal(history.claim(new Date(2026, 6, 12, 10), "morning"), false);
  assert.equal(history.claim(new Date(2026, 6, 13, 5), "morning"), true);
});
test("v2 to v3 is additive and preserves shopping, tasks and existing settings", async () => {
  const { db, sql } = memory();
  await db.execAsync(migration001);
  await db.execAsync(migration002);
  await db.execAsync(
    "PRAGMA user_version=2; INSERT INTO households VALUES('h','now','now',NULL,'Home'); INSERT INTO app_settings VALUES('existing','keep','now'); INSERT INTO local_profiles VALUES('p','now','now',NULL,'You'); INSERT INTO shopping_lists VALUES('l','now','now',NULL,'h','List'); INSERT INTO shopping_items(id,household_id,list_id,name,quantity,created_at,updated_at) VALUES('i','h','l','Milk',3,'now','now'); INSERT INTO tasks(id,household_id,title,created_at,updated_at) VALUES('t','h','Clean','now','now');",
  );
  await migrate(db);
  await migrate(db);
  assert.equal(sql.prepare("PRAGMA user_version").get()?.user_version, 3);
  assert.equal(
    sql.prepare("SELECT quantity FROM shopping_items").get()?.quantity,
    3,
  );
  assert.equal(sql.prepare("SELECT title FROM tasks").get()?.title, "Clean");
  assert.equal(
    sql.prepare("SELECT value FROM app_settings").get()?.value,
    "keep",
  );
  assert.deepEqual(sql.prepare("PRAGMA foreign_key_check").all(), []);
  sql.close();
});
test("font files are real, distinct, locally bundled binaries with their licenses", () => {
  const names = [
    "Inter_400Regular",
    "Inter_600SemiBold",
    "Caveat_500Medium",
    "DancingScript_500Medium",
    "LibreBaskerville_400Regular",
    "SpecialElite_400Regular",
    "Lora_400Regular",
  ];
  const files = names.map((name) => readFileSync(`assets/fonts/${name}.ttf`));
  for (const file of files) {
    assert.ok(file.length > 10000);
    assert.equal(file.readUInt32BE(0), 0x00010000);
  }
  assert.equal(new Set(files.map((f) => f.toString("base64"))).size, 7);
  for (const font of [
    "inter",
    "caveat",
    "dancing-script",
    "libre-baskerville",
    "lora",
  ])
    assert.match(
      readFileSync(`assets/licenses/${font}-OFL.txt`, "utf8"),
      /SIL OPEN FONT LICENSE/,
    );
  assert.match(
    readFileSync("assets/licenses/special-elite-LICENSE.txt", "utf8"),
    /Apache License/,
  );
});

test("full license notices distributed with the fonts are also bundled in app code", async () => {
  const { fontLicenses } = await import("../src/theme/fontLicenses");
  const paths = [
    "inter-OFL.txt",
    "caveat-OFL.txt",
    "dancing-script-OFL.txt",
    "libre-baskerville-OFL.txt",
    "special-elite-LICENSE.txt",
    "lora-OFL.txt",
  ];
  assert.equal(fontLicenses.length, paths.length);
  paths.forEach((path, index) =>
    assert.equal(
      fontLicenses[index]?.notice,
      readFileSync(`assets/licenses/${path}`, "utf8"),
    ),
  );
});
