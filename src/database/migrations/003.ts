/** Presentation only. No household tables or previous migrations are changed. */
export const migration003 = `
CREATE TABLE profile_preferences (
 profile_id TEXT PRIMARY KEY NOT NULL REFERENCES local_profiles(id),
 value_json TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
`;
