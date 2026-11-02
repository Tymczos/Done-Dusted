const base = `id TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT`;
const scoped = `${base}, household_id TEXT NOT NULL REFERENCES households(id)`;
export const migration001 = `
CREATE TABLE local_profiles (${base}, display_name TEXT NOT NULL);
CREATE TABLE households (${base}, name TEXT NOT NULL);
CREATE TABLE household_members (${scoped}, profile_id TEXT NOT NULL REFERENCES local_profiles(id), role TEXT NOT NULL DEFAULT 'owner');
CREATE TABLE shopping_lists (${scoped}, name TEXT NOT NULL CHECK(length(trim(name)) > 0));
CREATE TABLE shopping_items (${scoped}, list_id TEXT NOT NULL REFERENCES shopping_lists(id), name TEXT NOT NULL CHECK(length(trim(name)) > 0), quantity REAL NOT NULL DEFAULT 1 CHECK(quantity > 0), unit TEXT, category TEXT, purchased_at TEXT);
CREATE INDEX shopping_items_list ON shopping_items(household_id, list_id, deleted_at);
CREATE TABLE tasks (${scoped}, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Other', priority TEXT, due_date TEXT, recurrence TEXT CHECK(recurrence IN ('daily','weekly','monthly') OR recurrence IS NULL));
CREATE TABLE task_occurrences (${scoped}, task_id TEXT NOT NULL REFERENCES tasks(id), due_date TEXT NOT NULL, completed_at TEXT, UNIQUE(task_id, due_date));
CREATE TABLE household_events (${scoped}, title TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT, all_day INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'local', external_id TEXT, external_calendar_id TEXT);
CREATE TABLE app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);
`;
