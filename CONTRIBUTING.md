# Contributing

Use Node 24 LTS. Install dependencies with `npm ci` when a lockfile is available, or `npm install` for the initial install. Run typecheck, lint, tests and native Expo export before submitting changes. Run the native device smoke test documented in README for user-visible behavior.

Keep SQL in repositories or migrations, preserve strict TypeScript, validate inputs, and maintain household scoping. Never commit device databases, credentials or generated native/build artifacts. Add versioned migrations rather than changing an already released schema. Use stable UUIDs, updated timestamps and tombstones for synchronized entities. Future recurrence must use separate occurrences and tests. Backups must be versioned, validated and transactionally restored after confirmation.

Use focused commits such as `feat: add shopping item editing`. Do not introduce a backend or push changes without explicit authorization. Cloud tasks already have isolated checkouts: use the existing checkout, without creating worktrees unless requested.

## Milestone 2 conventions

Work exclusively inside `/workspace/Done-Dusted`. Verify the directory and expected Git remote before changes. Obtain permission before accessing another directory/repository, modifying the remote or pushing. Keep temporary test data under `.test-data/` and tool caches under `.cache/`; both are ignored.

Preserve migration 001 and the existing database/application identifiers. Add versioned migrations, never reset device data. Recurrence uses local civil dates and a rolling horizon; test month-end anchors, leap years, schedule edits and independent completions. Attachment storage saves portable filenames, validates metadata and compensates file copies if database writes fail. The same attachment infrastructure serves shopping items and tasks. Device permission, camera and drag interactions require manual testing on iPhone and Android in addition to automated tests.

## Milestone 3 presentation conventions

Do not modify migrations 001 or 002. Presentation preferences belong in the profile-scoped repository and migration 003, never in household data. Keep preference updates validated and serialized; appearance resets must never clear household records.

Use semantic colours, gradients, spacing, radii and typography from `src/theme/`. Keep scene choice independent of theme choice. New scene packs must include actual local artwork; do not add placeholder choices. Use unique SVG gradient IDs across previews. Test local time boundaries and resume handling; respect device Reduce Motion and avoid interaction-blocking animation loops. Opening animations are tracked at provider lifetime so tab changes cannot replay them.

Preserve readable body typography. New font binaries must have an appropriate license, source provenance and complete bundled notices. Font preview labels must represent actual fonts, never generic cursive substitutes. Optional renderer tooling stays under `.cache/`; generated caches are not lint targets. Run the native-device checklist as well as typecheck, lint, tests and native bundle exports. Do not begin another milestone without approval.
