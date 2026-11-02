import { migration003 } from "./migrations/003";
import { migration002 } from "./migrations/002";
import { migration001 } from "./migrations/001";
export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<unknown>;
  getFirstAsync<T>(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<T | null>;
  getAllAsync<T>(
    sql: string,
    ...params: (string | number | null)[]
  ): Promise<T[]>;
  withTransactionAsync(action: () => Promise<void>): Promise<void>;
}
export const migrations = [migration001, migration002, migration003];
export async function migrate(db: Database) {
  await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const version =
    (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
      ?.user_version ?? 0;
  if (version > migrations.length)
    throw new Error("This database needs a newer version of Done & Dusted.");
  for (let i = version; i < migrations.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[i]!);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}
