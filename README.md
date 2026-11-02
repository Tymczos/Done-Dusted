# Done & Dusted

A local-first household organizer for iOS and Android. Built on the existing Expo SDK 54 / React Native / strict TypeScript app with Expo Router and expo-sqlite. There is no backend, account server, push notification service or synchronization.

## Milestone 3 — Personalize

Open **Settings → Personalize** (or **Personalize your Home** on the dashboard).

- **Theme & Colour:** eight labelled gradient swatches — Lavender Mist (default), Indigo Night, Graphite, Forest, Copper, Steel Blue, Ocean and Peach. Semantic text, surfaces, actions, borders and gradients share one design system, with spacing/radius/typography tokens and light/dark appearance. Tests check normal text and primary-action contrast at WCAG AA levels across all eight themes and both appearances.
- **Sky & Scenery:** automatic or fixed morning, afternoon, evening and night. Automatic uses device-local time: morning 05:00–11:59; afternoon 12:00–17:59; evening 18:00–20:59; night 21:00–04:59. The clock updates at the next period boundary, midnight and app resume. The greeting always reflects actual local time, even with a fixed sky.
- **Five actual vector scenery packs:** Mountain Skies (layered peaks/lake), Emerald Aurora (ribbons/pine trees), Shepherd’s Delight (pasture/sheep), Mediterranean Glow (coastal houses/bay) and Whale’s Lullaby (whale/ocean). Each uses the selected palette independently of the scenery selection. Lavender Mist has four fully rendered skies; reusable palette-driven layers supply all other theme/time combinations. All artwork is local and original.
- **Motion:** a 1.2-second morning sun rise behind the terrain, gentle 2.4-second star opacity changes at night, and 380 ms scene crossfades. Native-driver animations use non-interaction handles, pause when Home is unfocused or the app is inactive, and never replay the sun opening just for changing tabs. Device Reduce Motion is always respected; an app-level “always reduced” option also disables motion. Until the accessibility preference is known, scenes stay still.
- **Font Style:** six real, offline fonts — Everyday (Inter), The Notebook (Caveat), Soft Script (Dancing Script), The Classic (Libre Baskerville), The Typewriter (Special Elite), Bookish (Lora). Fonts are previewed using their bundled binaries. Decorative styles affect large headings only; body text/forms/controls remain readable. There is no generic cursive substitution. Full font notices are available offline from the font preview screen; source notices are in `assets/licenses/`.
- **Dashboard Layout:** reorder and hide/show the three optional cards, with a default-layout restore. The scene, quick actions, five tabs and Personalize entry stay available even with every optional card hidden.
- **Appearance & Motion:** follow device / light / dark, plus device-controlled or always-reduced motion. Each Personalize category has its own reset; resetting all personalization requires confirmation and never clears household content.

Preferences are validated and stored separately in SQLite per local profile. The current active profile is the first active household owner (there is no profile-switching/account UI). Local task assignees are not remote users and do not automatically change the active profile. Preferences survive reopening and do not alter shopping, shops, tasks, recurrence, attachments or household records. The existing application IDs and database filename are preserved.

[Scenery contact sheet](docs/scenery-preview.png) shows the actual artwork under Lavender Mist’s four periods. It is a renderer-based artwork preview, **not a native app screenshot**. The native camera, SVG rendering, typography metrics, animation smoothness, battery/performance and device accessibility checks still require iPhone/Android testing. Sky Studio, custom font uploads and freeform dashboard widgets are not implemented. No Milestone 4 or backend work is included.

## Existing shopping & task functionality

- **Shopping:** existing list and item CRUD, quantities, units, categories, purchased/undo and clear-completed functionality are preserved. Items now support notes and reusable shop assignments. Move an item by editing its shop.
- **Shops:** create, rename, archive/restore, pin favourites and persist custom ordering. In Manage shops, drag the handle up/down or use the accessible reorder buttons. Pinned shops stay before unpinned shops; ordering operates within each group. Shop counts and active/saved placement are scoped to the selected shopping list. By Shop has collapsible sections and a collapsed Saved Shops section for shops with zero outstanding items. Unassigned items remain visible in All Items (and in the Unassigned section). Archiving a shop unassigns its items; it never hides them.
- **Optional photos:** expand an item's details to see its attachment, take a camera photo, select a library image, replace it or remove it. A camera indicator appears beside shopping items with a photo. Photos are copied into app-managed documents storage, with portable filenames and metadata in SQLite. Tasks reuse this system. Save a new item/task first, then expand its details to attach a photo. Permissions are requested only when using the camera/library; denial does not block the app. Images are limited to 25 MB.
- **Tasks:** create/edit/delete, descriptions, notes, optional civil due dates, priority, category, room and local member assignment. Local member names can be added in the task editor; they are not invitations or online accounts. Today includes undated tasks. Upcoming, Overdue and Completed views operate on separate occurrences.
- **Recurrence:** daily, weekly and monthly. Monthly recurrence uses the original day and clamps to the end of shorter months. Recurrences are materialized from their start through a rolling 90-day horizon when Home or Tasks opens. A future start beyond that horizon still creates its first occurrence. Each completion affects one occurrence. Undo records are retained in completion history. Editing schedule dates/recurrence replaces unfinished occurrences while preserving completed occurrences and history; other task fields apply to the entire series.
- **Home:** actual SQLite counts for remaining shopping, due-today tasks, overdue tasks, upcoming chores and completed-today tasks.

The existing five tabs remain. Calendar editing, external calendar integrations, backup/restore and reusable multi-task cleaning routine templates remain unimplemented. Repeating individual cleaning tasks are available.

## Install and run

Use Node.js 24 LTS and npm. From this directory:

```sh
npm ci
npm start
```

The included lockfile pins dependency resolution. No `.env` or credentials are needed. `expo-image-picker`, `expo-file-system`, `expo-linear-gradient` and `react-native-svg` use versions compatible with SDK 54. Font files are bundled offline and do not require additional font packages at runtime. To check SDK compatibility without optional network lookups: `EXPO_OFFLINE=1 npx expo install --check` (this uses bundled metadata, not a current online compatibility check).

On a phone, use an Expo Go version supporting SDK 54 and scan Metro's QR code. Current Expo Go store releases may no longer support SDK 54. In that case, make a development build:

- **iPhone:** on macOS with Xcode and a connected/signed device, `npx expo run:ios --device`. For a simulator, `npm run ios` with a compatible development client.
- **Android:** install Android Studio, Android SDK/JDK and connect a device (USB debugging) or start an emulator. Run `npx expo run:android --device`. With a compatible client already installed, `npm run android` starts Metro for the emulator.

These native toolchains and devices are not provided in the cloud workspace. Camera functionality should be tested on physical devices. After adding the image-picker config plugin, rebuild an existing native development client to apply camera/photo permission descriptions. Native iOS/Android are the supported targets, not web.

The app name is now Done & Dusted; the existing slug, scheme, native application identifiers and **`hometogether.db` filename remain unchanged** to preserve installation and database continuity. Do not uninstall or clear app storage when testing migrations on an existing device. Uninstalling removes local data and photos; backup is not yet available.

## Validation

```sh
npm run typecheck
npm run lint
npm test
EXPO_OFFLINE=1 npx expo export --platform ios --platform android
```

`typecheck` first regenerates typed navigation using the installed Expo Router generator, so a fresh checkout does not depend on Metro having run. Tests use real Node SQLite and project-local temporary directories. Coverage includes existing shopping regressions, safe v1→v2 migration and rollback, shop CRUD/order/active-saved transitions, assignments and household boundaries, attachment validation and persistent files/metadata, task CRUD, daily/weekly/monthly recurrence, leap-year/month-end behavior, occurrence isolation, completion/undo history, and dashboard counts. Personalization tests additionally cover defaults, theme/profile persistence and isolation, scene/time selection, resets preserving household data, dashboard order/visibility, contrast, motion policy, once-per-period opening policy, migration 003, font binaries and complete bundled license notices. These tests and bundle exports do not establish native camera, gesture, app-resume timing, typography or device UI correctness.

### iPhone and Android smoke test

1. Open an existing v1 installation without clearing its data. Confirm its lists, quantities and purchased items survive the upgrade. Force-close/reopen after subsequent steps to check persistence.
2. Create two shops and a shopping list. Assign items to both shops and leave one unassigned. Toggle All Items / By Shop. Collapse/expand sections. Complete every item in one shop: it should move into Saved Shops. Undo a purchase: it should return to active shops. Check the count badges.
3. Pin a shop. In Manage shops, drag handles and test up/down controls. Confirm order survives reopening and pinned favourites stay first. Archive a shop: its items should remain visible as unassigned. Restore it; items remain unassigned until explicitly reassigned.
4. Expand an item, attach a library photo and add notes. Collapse it: only the camera indicator should remain. Expand and replace using the camera, then remove it. Deny permissions and verify that clear guidance appears and normal shopping remains usable.
5. Create a cleaning task with room, local member, notes, priority and a due date. Edit it; test Today/Upcoming/Overdue filters. Add a daily recurring task starting today and complete today's occurrence: tomorrow's occurrence must stay incomplete. Undo and check history. Test monthly January 31 and a leap-year February. Change a series schedule and confirm completed history remains.
6. Expand a task and test the same photo flows. Delete a task with confirmation; its completion history remains available in the history section.
7. Return Home and check counts against Shopping/Tasks. Test light/dark OS appearances, VoiceOver/TalkBack labels, text scaling and keyboard handling on both platforms.

## Database and architecture

`001` and `002` remain unchanged for Milestone 3. New additive migration `003` creates only `profile_preferences` (`profile_id`, validated JSON, creation/update timestamps); no household tables are modified. Additive migration `002` creates `shops`, `attachments` and `task_completion_history`; adds item `shop_id`/`notes` and task `description`/`notes`/`room`/`assigned_member_id`; and creates indexes. Migrations run transactionally and advance `user_version` only on success. Existing tables, IDs, shopping rows and the database filename are preserved. No reset or seed shopping data is introduced.

- `src/database/repositories/`: household-scoped SQL and validation. UI modules do not execute SQL.
- `src/features/shopping/`: shopping forms, collapsible shop views, drag and accessible ordering.
- `src/features/tasks/`: task forms/views and local civil-date recurrence calculations (1970–2199).
- `src/components/AttachmentPanel.tsx`, `src/services/`: reusable UI, persistent file storage and compensated metadata writes.
- `src/types/`: stable UUID/timestamp/tombstone record contracts for future synchronization. No remote adapter is connected.
- `src/theme/`: semantic palettes/gradients/tokens, preference schema, clock policy, fonts and motion policy.
- `src/features/personalize/`, `src/components/scenery/`: personalization screens and reusable vector artwork/animations.
- `src/hooks/useLocalClock.ts`: resume-aware local clock and boundary/midnight scheduling.
- `scripts/generate-routes.cjs`: route declarations generated by the pinned Expo Router toolchain.
- `tests/`: migration, repository, recurrence, presentation and file-service coverage.

Each task owns at most one active photo, shared across its occurrences. Replacing/removing a photo deletes its local file after committing the metadata change. If file cleanup fails, orphan files may remain. Soft-deleting an item/list/task retains its existing photo files and metadata for now; a storage cleanup facility is deferred. All data and photos remain device-only. Completion history retains timestamps and occurrence dates; task names in history reflect the current task title, not a historical title snapshot.

## Repository workflow

Work only in `/workspace/Done-Dusted`. Preserve `origin` (`https://github.com/Tymczos/Done-Dusted.git`). Do not access other repositories, change the remote or push without explicit approval. Databases, photos generated by the app, dependency folders, project caches and build outputs must not be committed. No GitHub push is performed by this milestone.

## Personalization device checklist

1. Upgrade an existing installation without uninstalling or clearing storage. Confirm existing lists, shops, recurring tasks, history and photos remain available. Check that a fresh profile defaults to Lavender Mist + Mountain Skies + automatic time + Everyday font.
2. Select each of the eight labelled swatches. Verify all five tabs, sheets, fields, actions and error states use the chosen palette in both light and dark appearances. Restart the app to verify persistence.
3. Preview every scenery pack in all four fixed periods. Change theme without changing the pack, and change pack without changing the theme. Automatic scenery and greeting should update at 05:00, 12:00, 18:00 and 21:00 local time and on app resume, including after a timezone change. Test midnight dashboard counts separately. Use a dedicated test device/simulator for clock manipulation.
4. With motion allowed, open morning Home: the sun rises once behind terrain. Switch tabs repeatedly: it must not replay. At night, stars should gently twinkle. Change period/theme/pack: expect a restrained crossfade. Background the app: motion should pause. Enable system Reduce Motion (and separately app Always reduced): all scene motion should stop immediately and scenery remain visible. Check low-end Android performance and iOS accessibility while navigating.
5. Open Font Style and verify six visibly distinct **actual** fonts; Inter body text must remain readable with every selection. Test large accessibility text sizes, VoiceOver/TalkBack, small screens, dark mode and offline launch. Verify full licenses remain available offline.
6. Reorder and hide dashboard cards; restart and check order/visibility. Hide every optional card and confirm quick actions and all five tabs still work. Restore dashboard defaults without changing the selected theme. Reset each Personalize category, then all preferences with confirmation; household records and attachments must remain intact.
7. Repeat the shopping/task/photo smoke tests above under several themes to catch regressions.

## Optional artwork contact sheet

The preview generator renders the same vector components with DOM SVG primitives; it cannot validate native rendering or motion. Its optional tools and all generated caches stay inside this project:

```sh
mkdir -p .cache/tmp
npm install --prefix .cache/visual-tools --cache .cache/npm @resvg/resvg-js
TMPDIR="$PWD/.cache/tmp" node scripts/render-scenery.cjs
```

This creates `docs/scenery-preview.png`. `scripts/svg-primitives.tsx` is used only by that generator; native builds use `react-native-svg`.
