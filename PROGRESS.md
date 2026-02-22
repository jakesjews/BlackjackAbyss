# Progress

## Current Status

- Phaser-first runtime migration is active in production with acceptance tests in place as a refactor gate.
- Runtime now uses MP3 background music with SFX-priority mixing (ducking + lower BGM baseline).
- GitHub Actions CI is now wired with required quality gate checks and non-blocking smoke coverage.
- Legacy canvas draw/input fallback paths have been removed from active runtime execution.
- Docs-first checkpoint completed and runtime docs are synced to Phaser-native runtime architecture.
- Runtime entry now uses `src/engine/runtime/runtime-engine.js` with direct app/runtime seam wiring.
- Scene runtime access now reads `game.__ABYSS_RUNTIME__.apis` directly; bridge remains compatibility-only for tests/tools.
- Last Updated: 2026-02-21 19:10:11 EST

## Current Focus

- Keep acceptance tests green before each cleanup/modularization pass.
- Continue shrinking `src/engine/runtime/runtime-engine.js` by extracting focused orchestration slices into `src/engine/runtime/core/*`.
- Keep bridge contracts stable while reducing remaining compatibility-facade dependence outside tests/tools.
- Keep docs aligned with runtime contracts and test-only controls.

## Done Recently

- Extracted runtime logic from monolithic `game.js` into `src/engine/runtime/*`.
- Flattened runtime API registration into one direct call path (`registerRuntimeApis`) and removed wrapper-heavy API registration registry flow.
- Switched scene runtime helper consumption to direct runtime APIs (`game.__ABYSS_RUNTIME__.apis`) instead of bridge fallback.
- Tightened runtime startup to require explicit Phaser runtime payload from app boot (removed runtime-engine window-global fallback path).
- Updated app boot flow so `src/main.js` initializes Phaser then runtime bootstrap.
- Removed obsolete compatibility wrapper `game.js` and package export pointer.
- Added runtime unit tests and stabilized smoke checks.
- Removed broken balance probe tooling for now.
- Added one-hand acceptance test harness for core/camp/persistence flows.
- Replaced procedural generated music with MP3 runtime BGM and retained prominent SFX mixing.
- Added GitHub Actions CI (`quality-gate` + scheduled/main smoke artifact job).
- Simplified Phaser host/runtime seam by removing dead app service layer and normalizing scene bridge access.
- Added test-only economy seed control (`window.__ABYSS_TEST_FLAGS__.economy.startingGold`) and updated acceptance camp coverage to use seeded chips.
- Removed test-only fast-path controls from runtime and acceptance harness (`window.__ABYSS_TEST_FLAGS__.fastPath.*`).
- Removed dormant legacy runtime canvas draw pipeline and DOM/input fallback registration.
- Added initial bootstrap helper modules under `src/engine/runtime/core/*` (`api-registry`, `audio-system`, `combat-actions`, `run-lifecycle`, `test-hooks`, `serialization`).
- Extracted large static runtime content from `bootstrap.js` into dedicated modules (`relic-catalog`, `encounter-content`) to keep Phaser runtime orchestration thinner.
- Extracted card/deck/hand utility logic from runtime bootstrap into `src/engine/runtime/domain/combat.js` and expanded unit coverage for those helpers.
- Extracted run/encounter creation flow into bootstrap factories (`run-factory`, `encounter-factory`) and added targeted unit tests for those modules.
- Extracted save/resume hydration sanitizers into `src/engine/runtime/core/state-sanitizers.js` and added sanitizer-specific unit tests.
- Extracted run snapshot persistence/resume orchestration helpers into `src/engine/runtime/core/run-snapshot.js` with dedicated unit tests.
- Extracted run result/profile tally helpers into `src/engine/runtime/core/run-results.js` and added dedicated unit tests.
- Extracted passive/relic collection presentation helpers into `src/engine/runtime/core/passive-view.js` with dedicated unit tests.
- Extracted runtime UI state helpers into `src/engine/runtime/core/runtime-ui-state.js` with dedicated unit tests.
- Extracted combat effect primitives into `src/engine/runtime/core/combat-effects.js` and moved hand-tackle + defeat-transition orchestration there with dedicated tests.
- Extracted encounter intro flow helpers into `src/engine/runtime/core/encounter-intro.js` and wired bootstrap to delegate typing/reveal/confirm/advance behavior through that module.
- Extracted turn-action orchestration into `src/engine/runtime/core/combat-turn-actions.js` (player action gating, hit/stand/double/split flow, split-hand queue progression, dealer showdown resolution) with dedicated unit tests.
- Extracted hand resolution settlement math/effects/logging into `src/engine/runtime/core/combat-resolution.js` and reduced bootstrap `resolveHand(...)` to a delegation wrapper with dedicated unit tests.
- Extracted encounter win progression/camp transition handling into `src/engine/runtime/core/encounter-outcome.js` and reduced bootstrap `onEncounterWin(...)` to a delegation wrapper with dedicated unit tests.
- Extracted reward/shop relic roll tables, stock generation, and camp purchase/continue orchestration into `src/engine/runtime/core/reward-shop.js` and reduced bootstrap reward/shop functions to delegation wrappers with dedicated unit tests.
- Extracted reward/shop Phaser snapshot builders into `src/engine/runtime/core/shop-reward-snapshots.js` and reduced bootstrap snapshot builders to delegation wrappers with dedicated unit tests.
- Extracted runtime frame update loop into `src/engine/runtime/core/runtime-update.js` and reduced bootstrap `update(dt)` to a delegation wrapper with dedicated unit tests.
- Extracted Phaser run snapshot builder into `src/engine/runtime/core/phaser-run-snapshot.js` and reduced bootstrap `buildPhaserRunSnapshot()` to a delegation wrapper with dedicated unit tests.
- Extracted mode-driven action tray + runtime text snapshot serialization into `src/engine/runtime/core/runtime-text-snapshot.js` and reduced bootstrap `availableActions()`/`renderGameToText()` to delegation wrappers with dedicated unit tests.
- Extracted overlay snapshot builder into `src/engine/runtime/core/overlay-snapshot.js` and reduced bootstrap `buildPhaserOverlaySnapshot()` to a delegation wrapper with dedicated unit tests.
- Extracted Phaser bridge API registration blocks into `src/engine/runtime/core/phaser-bridge-apis.js` and reduced bootstrap menu/run/reward/shop/overlay API registration functions to delegation wrappers with dedicated unit tests.
- Extracted runtime loop orchestration into `src/engine/runtime/core/runtime-loop.js` and reduced bootstrap `advanceTime`/resize/start-loop handling to delegation wrappers with dedicated unit tests.
- Extracted lifecycle visibility/unload handlers into `src/engine/runtime/core/runtime-lifecycle.js` and reduced bootstrap lifecycle wiring to a delegation wrapper with dedicated unit tests.
- Extracted runtime audio stack into `src/engine/runtime/core/runtime-audio.js` and reduced bootstrap audio/sfx/music methods to delegation wrappers with dedicated unit tests.
- Extracted encounter run/hand lifecycle orchestration into `src/engine/runtime/core/encounter-lifecycle.js` and reduced bootstrap shoe/deal/hand/start-run flow to delegation wrappers with dedicated unit tests.
- Extracted combat impact settlement helpers into `src/engine/runtime/core/combat-impact.js` and reduced bootstrap `finalizeResolveState`/`applyImpactDamage` to delegation wrappers with dedicated unit tests.
- Restored explicit `handBounds(...)` bridge helper (now delegated through encounter lifecycle module) to keep defeat-transition fallback math safe.
- Extracted enemy avatar loading/cache helpers into `src/engine/runtime/core/enemy-avatars.js` and removed that implementation detail from `bootstrap.js` with dedicated unit tests.
- Extracted runtime startup orchestration into `src/engine/runtime/core/runtime-startup.js` and reduced bootstrap final boot wiring to a single delegation call with dedicated unit tests.
- Collapsed wrapper-heavy runtime delegates in `bootstrap.js` by binding directly to handler/module methods (audio, combat impact, encounter lifecycle, combat turn actions, reward/shop handlers), preserving only required forward-reference wrappers.
- Fixed a persistence regression introduced during wrapper collapse by restoring direct bindings for resume-hydration helpers (`generateCampRelicDraftStock`, etc.) used by `resumeSavedRun`.
- Extracted profile/stat normalization + profile persistence helpers into `src/engine/runtime/core/runtime-profile.js` and replaced inlined bootstrap logic with a handler module.
- Extracted saved-run persistence/resume orchestration into `src/engine/runtime/core/runtime-save-resume.js` and replaced inlined bootstrap logic with a handler module.
- Added dedicated unit coverage for both new modules in `src/engine/runtime/__tests__/runtime-profile.test.mjs` and `src/engine/runtime/__tests__/runtime-save-resume.test.mjs`.
- Reduced `src/engine/runtime/runtime-engine.js` from 1293 lines to 1112 lines in this slice.
- Updated docs before runtime refactor to explicitly mark Phaser-first architecture, compatibility bridge role, and in-flight bootstrap/legacy-seam removals.
- Removed the former runtime bootstrap entry file and switched startup to `src/engine/runtime/runtime-engine.js` in `src/main.js`.
- Removed `src/engine/legacy/legacy-runtime-adapter.js` and rewired `src/engine/app.js` + `src/engine/scenes/runtime-bridge.js` to a direct runtime bridge/tick seam.
- Added `src/engine/runtime/compat/phaser-bridge-compat.js` as the thin compatibility facade for scenes/tests/tools.
- Renamed the runtime helper module folder to `src/engine/runtime/core/*` and updated source/test imports.
- Added `npm run test:dead-refs` (`scripts/check-dead-refs.mjs`) to fail on stale bootstrap-entry and legacy-adapter symbol references.
- Added dedicated bridge facade unit tests in `src/engine/runtime/__tests__/phaser-bridge-compat.test.mjs` (mode callbacks, tick routing, API mapping, canvas accessor).
- Cleaned runtime entry constants in `src/engine/runtime/runtime-engine.js` to use shared exports from `src/engine/runtime/constants.js` and removed dead local symbols.
- Extracted runtime mode-property bridge installation into `src/engine/runtime/core/runtime-mode-bridge.js` and removed the inline mode-bridge block from `src/engine/runtime/runtime-engine.js`.
- Added targeted tests for mode bridging in `src/engine/runtime/__tests__/runtime-mode-bridge.test.mjs`.
- Reduced `src/engine/runtime/runtime-engine.js` from 1116 lines to 1096 lines in this slice.
- Extracted runtime visual seed/audio source configuration into `src/engine/runtime/core/runtime-content-seeds.js` (ambient orbs, menu motes, grunt/card/music source lists).
- Added focused tests for runtime seed generation and source lists in `src/engine/runtime/__tests__/runtime-content-seeds.test.mjs`.
- Reduced `src/engine/runtime/runtime-engine.js` from 1096 lines to 1076 lines in this slice.
- Extracted runtime resource boot wiring (enemy avatar loader + passive-thumb cache setup) into `src/engine/runtime/core/runtime-resources.js`.
- Added focused tests for runtime resource creation/fallback behavior in `src/engine/runtime/__tests__/runtime-resources.test.mjs`.
- Extracted Phaser run/reward/shop/overlay snapshot wiring into `src/engine/runtime/core/runtime-snapshot-registry.js` and added focused registry tests in `src/engine/runtime/__tests__/runtime-snapshot-registry.test.mjs`.
- Extracted runtime combat/visual effect wrapper wiring into `src/engine/runtime/core/runtime-effects.js` and added focused wrapper tests in `src/engine/runtime/__tests__/runtime-effects.test.mjs`.
- Reduced `src/engine/runtime/runtime-engine.js` from 1078 lines to 928 lines across the snapshot-registry + runtime-effects extraction slices.
- Extracted Phaser bridge API wrapper wiring into `src/engine/runtime/core/runtime-bridge-registry.js` and added focused registry tests in `src/engine/runtime/__tests__/runtime-bridge-registry.test.mjs`.
- Reduced `src/engine/runtime/runtime-engine.js` from 928 lines to 878 lines in this slice.
- Collapsed additional trivial pass-through wrappers in `src/engine/runtime/runtime-engine.js` (module alias + inline callback use for split lifecycle/resolve hookups) to reduce non-essential indirection.
- Reduced `src/engine/runtime/runtime-engine.js` from 878 lines to 875 lines in this slice.
- Consolidated wrapper-only runtime resource wiring into `src/engine/runtime/core/enemy-avatars.js` (`createRuntimeResources`) and removed `src/engine/runtime/core/runtime-resources.js`.
- Consolidated wrapper-only bridge and snapshot registry wiring into `src/engine/runtime/core/phaser-bridge-apis.js` (`createRuntimeBridgeRegistry`, `createRuntimeSnapshotRegistry`) and removed `src/engine/runtime/core/runtime-bridge-registry.js` and `src/engine/runtime/core/runtime-snapshot-registry.js`.
- Kept `src/engine/runtime/runtime-engine.js` lean while removing extra indirection layers; current size is 867 lines.

## Next Up

- Reintroduce a reliable long-run balancing probe with explicit guardrails and bounded runtime behavior.
- Continue trimming wrapper-only indirection while keeping `src/engine/runtime/runtime-engine.js` as a thin Phaser runtime orchestrator (avoid both monolith growth and over-abstraction).
- Decide whether to keep or reduce the global bridge compatibility facade in production once tooling contracts are revisited.
- Keep docs synced when bridge contracts, test hooks, or mode flows change.

## Risks / Blockers

- No automated long-run balance regression probe currently exists.
- Runtime and scene contracts are tightly coupled; bridge drift can break UI flow if docs/tests are not updated together.
- Audio balance tuning (BGM vs SFX) may need iteration based on play feedback on different devices.

## Verification Snapshot

- `npm run test:unit`: passing (runtime module tests).
- `npm run test:acceptance`: passing (contracts + one-hand core/camp flow + seeded economy + persistence/resume).
- `npm run test:smoke`: passing (desktop/mobile flow snapshots).
- `npm run build`: passing (Vite production bundle).
- `npm run test:dead-refs`: passing (no stale bootstrap/legacy-adapter symbol references).
- Production deploy: `https://blackjackabyss.vercel.app`.

## Notes for Next Agent

- Treat Phaser scenes as the active renderer and input layer.
- Treat `src/engine/runtime/runtime-engine.js` as the gameplay runtime entrypoint and bridge registration source.
- Preserve bridge method names and test hooks (`window.render_game_to_text`, `window.advanceTime`) unless a coordinated migration is planned.
- Preserve non-production economy seed interface (`window.__ABYSS_TEST_FLAGS__.economy.startingGold`) used by acceptance tests.
- Keep branch protection on `main` requiring the `quality-gate` workflow check.
