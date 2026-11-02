import type { Database } from "../schema";
import {
  defaultPreferences,
  preferencesSchema,
  type Preferences,
} from "../../theme/preferences";
export class PreferencesRepository {
  constructor(
    private db: Database,
    readonly profileId: string,
  ) {}
  async load(): Promise<Preferences> {
    const row = await this.db.getFirstAsync<{ value_json: string }>(
      "SELECT value_json FROM profile_preferences WHERE profile_id=?",
      this.profileId,
    );
    if (!row) return defaultPreferences();
    try {
      return preferencesSchema.parse(JSON.parse(row.value_json));
    } catch {
      throw new Error(
        "Saved personalization could not be read. Restore personalization defaults to repair it; household data will be preserved.",
      );
    }
  }
  async save(value: Preferences) {
    const parsed = preferencesSchema.parse(value),
      now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO profile_preferences (profile_id,value_json,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(profile_id) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`,
      this.profileId,
      JSON.stringify(parsed),
      now,
      now,
    );
    return parsed;
  }
  reset() {
    return this.save(defaultPreferences());
  }
}
