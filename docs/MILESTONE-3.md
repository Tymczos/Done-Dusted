# Milestone 3 delivery

Implemented entirely within `/workspace/Done-Dusted`. The existing Git remote and application/database identity are preserved. No backend, push, data reset or Milestone 4 work is included.

## Themes and scenery

All eight presets are implemented: Lavender Mist (default), Indigo Night, Graphite, Forest, Copper, Steel Blue, Ocean and Peach. Each has semantic light/dark surfaces and actions, gradients and four time-period palettes. All five scenery packs have actual original vector artwork: Mountain Skies, Emerald Aurora, Shepherd’s Delight, Mediterranean Glow and Whale’s Lullaby. Scene selection is independent of colour theme. Automatic/fixed morning/afternoon/evening/night modes persist per profile. The clock refreshes at boundaries, midnight and app resume; greetings always use actual device-local time.

See [the rendered Lavender Mist contact sheet](scenery-preview.png). This previews artwork components through SVG DOM primitives and is not a native app screenshot.

## Motion

Morning sun rise: 1.2 seconds, tracked once per local morning/session rather than replaying on tab changes. Night star twinkle: 2.4-second gentle opacity legs. Scene transitions: 380 ms crossfades. Animations use the native driver with non-interaction handles. Home unfocus/backgrounding pauses them. Device Reduce Motion is always respected; app Always reduced can independently disable motion. Accessibility status defaults to still until known.

## Customization

Settings → Personalize contains Theme & Colour, Sky & Scenery, Font Style, Dashboard Layout and Appearance & Motion. Each category has a reset; resetting all presentation preferences requires confirmation. Optional dashboard sections can be reordered or hidden, with essential tabs/quick actions retained. All choices persist for the current local profile; profile switching is not implemented.

Six real bundled font choices are available: Inter, Caveat, Dancing Script, Libre Baskerville, Special Elite and Lora, under their approved display names. Decorative fonts affect large headings; readable body text remains Inter. Complete original license notices are bundled in the app and available offline through the font previews. Fonts require no runtime downloads or font-package dependencies.

## Files

- `src/theme/`: preferences/schema, semantic palettes, gradient definitions, spacing/radius/type/motion tokens, font registry/notices, time/scene/opening policies and provider.
- `src/hooks/useLocalClock.ts`: boundary/midnight/resume scheduling.
- `src/components/ui.tsx`: centralized typography, semantic gradients, cards, fields and accessible buttons.
- `src/components/scenery/`: five palette-driven SVG packs, static previews and animated Home rendering.
- `src/features/personalize/`: Personalize and six-font preview screens.
- `app/personalize.tsx`, `app/font-preview.tsx`, `app/font-licenses.tsx`: typed routes.
- `app/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/settings.tsx`: hydration/status-bar appearance, configurable dashboard and settings entry.
- `src/database/migrations/003.ts`, `src/database/repositories/preferences.ts`, database client/schema: profile-scoped persistence and active-profile selection.
- `assets/fonts/`, `assets/licenses/`: seven unmodified font files, provenance and original notices.
- `scripts/`: typed-route generation and optional artwork contact-sheet rendering.
- `tests/personalization.test.ts`: preference, scene, time, motion, contrast, font and migration checks. Existing migration tests now check the current migration version.
- `package.json`, lockfile, app configuration, ESLint configuration, README and CONTRIBUTING: compatible dependencies, version 0.3.0, generated-cache exclusions and development/device documentation.

## Database

Migration 003 creates only `profile_preferences`, keyed by `local_profiles.id`, with versioned/validated JSON and timestamps. Migrations 001 and 002 were verified byte-for-byte unchanged. Household records, shopping, shops, tasks, occurrences, history, attachment metadata and existing app settings are preserved. Resetting personalization writes only the current profile’s preference row.

## Verification

- TypeScript: passed, including fresh typed-route generation.
- ESLint: passed.
- Automated tests: 35 passed, none skipped or failed; also passed with `TZ=Europe/Athens`.
- iOS/Android production bundle export: passed.
- Existing migration checksums: unchanged.
- Dependency tree: valid.
- Artwork contact sheet: generated from the actual components and visually inspected.

Tests exercise real SQLite, persistence after reopening, profile isolation, defaults/resets, all themes and time palettes, scene selection, dashboard order/visibility, reduced-motion/opening policy, 4.5:1 contrast for tested text/action pairs, fonts/notices, migration safety and all existing shopping/task regressions. Generated bundle exports are not installed native builds.

## Native-device work remaining

Follow the README’s iPhone/Android and personalization checklists. Native SVG/gradient rendering, font metrics/text scaling, VoiceOver/TalkBack, animation smoothness/performance, immediate system Reduce Motion updates, resume/timezone timing and camera/drag regressions require actual devices or simulators. No such device checks were performed in the cloud workspace. Keep existing app storage when checking migration continuity.

Sky Studio, custom font uploads and freeform dashboard widgets are intentionally outside this milestone. Calendar editing, backup and other previously deferred product features remain deferred.
