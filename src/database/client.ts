import { PreferencesRepository } from "./repositories/preferences";
import * as SQLite from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import { migrate, type Database } from "./schema";
import { ShopRepository } from "./repositories/shops";
import { TaskRepository } from "./repositories/tasks";
import { AttachmentRepository } from "./repositories/attachments";
import { ShoppingRepository } from "./repositories/shopping";
let initialization:
  | Promise<{
      db: Database;
      activeProfileId: string;
      activeProfileName: string;
      preferences: PreferencesRepository;
      householdId: string;
      shopping: ShoppingRepository;
      shops: ShopRepository;
      tasks: TaskRepository;
      attachments: AttachmentRepository;
    }>
  | undefined;
export function initializeDatabase() {
  return (initialization ??= initialize().catch((error) => {
    initialization = undefined;
    throw error;
  }));
}
async function initialize() {
  const db = await SQLite.openDatabaseAsync("hometogether.db");
  // Focus changes can request materialization while another screen is still loading.
  // Queue transactions to avoid nested BEGINs on the single local connection.
  const nativeTransaction = db.withTransactionAsync.bind(db);
  let pending: Promise<void> = Promise.resolve();
  db.withTransactionAsync = (action) => {
    const next = pending.then(() => nativeTransaction(action));
    pending = next.catch(() => {});
    return next;
  };
  await migrate(db);
  let household = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM households WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1",
  );
  if (!household) {
    const id = randomUUID(),
      profile = randomUUID(),
      now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT INTO households (id,name,created_at,updated_at) VALUES (?,?,?,?)",
        id,
        "Our home",
        now,
        now,
      );
      await db.runAsync(
        "INSERT INTO local_profiles (id,display_name,created_at,updated_at) VALUES (?,?,?,?)",
        profile,
        "You",
        now,
        now,
      );
      await db.runAsync(
        "INSERT INTO household_members (id,household_id,profile_id,created_at,updated_at) VALUES (?,?,?,?,?)",
        randomUUID(),
        id,
        profile,
        now,
        now,
      );
    });
    household = { id };
  }
  const profile = await db.getFirstAsync<{ id: string; display_name: string }>(
    `SELECT p.id,p.display_name FROM local_profiles p JOIN household_members m ON m.profile_id=p.id WHERE m.household_id=? AND m.deleted_at IS NULL AND p.deleted_at IS NULL ORDER BY CASE WHEN m.role='owner' THEN 0 ELSE 1 END,p.created_at,p.id LIMIT 1`,
    household.id,
  );
  if (!profile)
    throw new Error("No local profile is available for this household.");
  return {
    db,
    activeProfileId: profile.id,
    activeProfileName: profile.display_name,
    preferences: new PreferencesRepository(db, profile.id),
    householdId: household.id,
    shopping: new ShoppingRepository(db, household.id, randomUUID),
    shops: new ShopRepository(db, household.id, randomUUID),
    tasks: new TaskRepository(db, household.id, randomUUID),
    attachments: new AttachmentRepository(db, household.id, randomUUID),
  };
}
