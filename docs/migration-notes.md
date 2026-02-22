# Migration Notes

## Migration Goal

Maintain a Phaser-first game where scenes are the primary renderer and runtime modules are the gameplay engine.

## Completed

- Runtime extraction into modular files under `src/engine/runtime/*`.
- Phaser app boot path established in `src/main.js` and `src/engine/app.js`.
- Bridge contract assertions and test hook publication integrated into runtime bootstrap.
- Legacy Phaser host shim removed.
- Obsolete `game.js` compatibility wrapper removed.
- Dead app service layer removed from host runtime context (`eventBus`, `persistence`, `gameState`, `audio`).
- Scene runtime/bridge access normalized via `src/engine/scenes/runtime-bridge.js`.
- Dead runtime audio shim removed (`src/engine/runtime/audio/audio-engine.js`, `MUSIC_STEP_SECONDS`, `audio.stepTimer`, `audio.stepIndex`).
- Broken balance probe tooling removed temporarily.
- Added acceptance test harness with one-hand core/camp/persistence coverage.
- Added test-only economy seed flag for acceptance camp-buy scenarios (`window.__ABYSS_TEST_FLAGS__.economy.startingGold`).
- Removed obsolete fast-path test controls from runtime (`window.__ABYSS_TEST_FLAGS__.fastPath.*`).
- Removed dormant legacy canvas draw pipeline from runtime bootstrap (Phaser scenes are renderer of record).
- Removed dormant legacy DOM/canvas input fallback wiring from runtime bootstrap.
- Added bootstrap helper modules under `src/engine/runtime/core/*` for API wiring, lifecycle, audio/listeners, combat transition shaping, and test-hook publication.
- Extracted static relic catalog and encounter dialogue/enemy content into `src/engine/runtime/core/relic-catalog.js` and `src/engine/runtime/core/encounter-content.js`.
- Moved reusable card/deck/hand helpers (`shuffle`, `createDeck`, totals/blackjack utilities, dealer-visible total) into `src/engine/runtime/domain/combat.js`.
- Extracted run/encounter creation lifecycle from bootstrap into `src/engine/runtime/core/run-factory.js` and `src/engine/runtime/core/encounter-factory.js`.
- Extracted run snapshot hydration/sanitization logic into `src/engine/runtime/core/state-sanitizers.js`.
- Extracted run snapshot persistence/resume orchestration helpers into `src/engine/runtime/core/run-snapshot.js`.
- Extracted run-result/profile tally helpers (`updateProfileBest`, `finalizeRun`, chip delta handling) into `src/engine/runtime/core/run-results.js`.
- Extracted passive/relic view formatting and collection list helpers into `src/engine/runtime/core/passive-view.js`.
- Replaced procedural generated BGM with MP3-backed runtime soundtrack.
- Added GitHub Actions CI workflow with required `quality-gate` and non-required smoke job.
- Replaced runtime entrypoint with `src/engine/runtime/runtime-engine.js` and removed the former runtime bootstrap entry file.
- Removed legacy adapter seam (`src/engine/legacy/legacy-runtime-adapter.js`) and switched app/scenes to direct runtime bridge/tick wiring.
- Added runtime compatibility bridge module `src/engine/runtime/compat/phaser-bridge-compat.js`.
- Renamed runtime helper folder to `src/engine/runtime/core/*`.
- Added dead-reference check script `scripts/check-dead-refs.mjs`.
- Flattened Phaser API registration into a single runtime call (`registerRuntimeApis`) instead of wrapper registries.
- Scenes now consume runtime APIs directly from `game.__ABYSS_RUNTIME__.apis` (bridge fallback removed from scene helpers).
- Runtime engine startup now requires the Phaser runtime payload from app boot (no window-global fallback path).
- Runtime mode synchronization now flows through direct runtime context callbacks in `src/engine/app.js` (bridge report forwarding retained for compatibility only).
- Removed dead bridge compatibility stubs no longer used by runtime/scenes (`setGame`, `getCanvas`, `setInputHandlers`).
- Runtime frame stepping now uses direct runtime context handlers (`runtime.setStepHandler` + `runtime.tick`) instead of bridge step-handler plumbing.
- Acceptance boot contracts now validate runtime API method sets and bridge API method sets independently (no runtime contract fallback to bridge).
- Bridge API write-registration has been removed; bridge getters now read runtime APIs directly as a compatibility view.
- Folded smoke capture into acceptance (`tests/acceptance/visual-smoke.spec.mjs`) and replaced standalone smoke harness script.

## Transitional / Still Present

- `src/engine/runtime/runtime-engine.js` is still the largest runtime file and continues to be the next extraction target.
- Test-only economy seed controls are present in runtime for non-production acceptance execution only.

## Kept For Compatibility

- `window.__ABYSS_PHASER_BRIDGE__` as a thin compatibility facade for tests/tools.
- Bridge method names in menu/run/reward/shop/overlay APIs.
- `window.render_game_to_text()` and `window.advanceTime(ms)` hooks for smoke/acceptance tooling.
- Existing storage keys:
  - `blackjack-abyss.profile.v1`
  - `blackjack-abyss.run.v1`

## Fully Migrated Position

- Phaser is renderer/UI host of record.
- Scene mode transitions are synchronized through runtime context mode reporting (bridge-forwarded for compatibility).
- Runtime modules own state, rules, progression, persistence, and API surface.

## Deferred / Future Work

- Reintroduce a reliable balance probe with bounded execution and cleanup guarantees.
- Continue extracting remaining runtime concerns from `runtime-engine.js` into module files.
- Re-evaluate long-term bridge facade reduction once scene/runtime parity remains stable across acceptance and smoke gates.

## Cleanup Guardrails

- Do not rename/remove bridge API methods without coordinated scene updates.
- Preserve storage keys unless an explicit migration plan is introduced:
  - `blackjack-abyss.profile.v1`
  - `blackjack-abyss.run.v1`
- Keep `window.render_game_to_text` and `window.advanceTime` stable for tooling unless replacement hooks are shipped concurrently.
