/** Additive only: v1 shopping data and identifiers remain untouched. */
export const migration002 = `
CREATE TABLE shops (
 id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id),
 name TEXT NOT NULL CHECK(length(trim(name))>0), position INTEGER NOT NULL DEFAULT 0,
 pinned INTEGER NOT NULL DEFAULT 0, archived_at TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE INDEX shops_order ON shops(household_id, deleted_at, archived_at, position);
ALTER TABLE shopping_items ADD COLUMN shop_id TEXT REFERENCES shops(id);
ALTER TABLE shopping_items ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN room TEXT;
ALTER TABLE tasks ADD COLUMN assigned_member_id TEXT REFERENCES household_members(id);
CREATE INDEX occurrences_due ON task_occurrences(household_id, deleted_at, due_date, completed_at);
CREATE TABLE task_completion_history (
 id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id),
 task_id TEXT NOT NULL REFERENCES tasks(id), occurrence_id TEXT NOT NULL REFERENCES task_occurrences(id),
 completed_at TEXT NOT NULL, undone_at TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE TABLE attachments (
 id TEXT PRIMARY KEY NOT NULL, household_id TEXT NOT NULL REFERENCES households(id),
 owner_type TEXT NOT NULL CHECK(owner_type IN ('shopping_item','task')), owner_id TEXT NOT NULL,
 filename TEXT NOT NULL, mime_type TEXT NOT NULL, width INTEGER NOT NULL CHECK(width>0),
 height INTEGER NOT NULL CHECK(height>0), size_bytes INTEGER NOT NULL CHECK(size_bytes>0),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);
CREATE UNIQUE INDEX attachment_owner ON attachments(household_id,owner_type,owner_id) WHERE deleted_at IS NULL;
`;
