# Migration Notes

## Migration Goal

Maintain a Phaser-first game where scenes are the primary renderer and runtime modules are the gameplay engine.

## Completed

- Runtime extraction into modular files under `src/engine/runtime/*`.
- Phaser app boot path established in `src/main.js` and `src/engine/app.js`.
- Runtime API contract assertions and test hook publication integrated into runtime startup.
- Legacy Phaser host shim removed.
- Obsolete `game.js` compatibility wrapper removed.
- Dead app service layer removed from host runtime context (`eventBus`, `persistence`, `gameState`, `audio`).
- Scene runtime access normalized via `src/engine/scenes/runtime-access.js`.
- Removed runtime browser-image avatar preloading/cache helpers; Phaser `BootScene` now owns avatar texture loading and runtime only resolves avatar keys.
- Extracted RunScene static config into `src/engine/scenes/run/run-scene-config.js` and shared that config with `BootScene` for avatar/action-icon preload consistency.
- Consolidated shared scene texture processing helpers (`dark`/`gold` icon derivation + watermark recolor) into `src/engine/scenes/ui/texture-processing.js` and removed duplicated texture helper methods from `RunScene`, `RewardScene`, and `ShopScene`.
- Consolidated shared scene brown-theme helpers (graphics patching + text/color conversion) into `src/engine/scenes/ui/brown-theme.js` and removed duplicated theme helper methods from `RunScene`, `RewardScene`, and `ShopScene`.
- Extracted RunScene modal order/state/blocker helpers into `src/engine/scenes/run/run-scene-modals.js` and removed duplicated modal helper methods from `RunScene`.
- Extracted RunScene modal rendering/close-button plumbing into `src/engine/scenes/run/run-scene-modal-renderers.js` and removed duplicated in-class logs/relics modal rendering methods from `RunScene`.
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
- Removed legacy adapter seam (`src/engine/legacy/legacy-runtime-adapter.js`) and switched app/scenes to direct runtime context/tick wiring.
- Removed transitional runtime compatibility facade after scene/runtime contracts moved to direct runtime APIs.
- Renamed runtime helper folder to `src/engine/runtime/core/*`.
- Added dead-reference check script `scripts/check-dead-refs.mjs`.
- Flattened Phaser API registration into a single runtime call (`registerRuntimeApis`) instead of wrapper registries.
- Scenes now consume runtime APIs directly from `game.__ABYSS_RUNTIME__.apis` (bridge fallback removed from scene helpers).
- Runtime engine startup now requires the Phaser runtime payload from app boot (no window-global fallback path).
- Runtime mode synchronization now flows through direct runtime context callbacks in `src/engine/app.js`.
- Removed remaining runtime/app external-renderer branch plumbing (`isExternal*` checks); runtime combat/audio/lifecycle paths now execute Phaser-only logic.
- Removed dead compatibility stubs no longer used by runtime/scenes (`setGame`, `getCanvas`, `setInputHandlers`).
- Runtime frame stepping now uses direct runtime context handlers (`runtime.setStepHandler` + `runtime.tick`).
- Acceptance boot contracts validate runtime API method sets and test hooks.
- Runtime API write-registration wrappers have been removed; runtime APIs are the only contract surface.
- Folded smoke capture into acceptance (`tests/acceptance/visual-smoke.spec.mjs`) and replaced standalone smoke harness script.
- `npm run test:smoke` now intentionally reruns only `tests/acceptance/visual-smoke.spec.mjs` for quick artifact capture; visual smoke is now separated from `test:acceptance`.
- Removed `window.__ABYSS_PHASER_BRIDGE__` publication and deleted `src/engine/runtime/compat/phaser-bridge-compat.js`; runtime APIs are now the only contract surface.
- Added committed visual regression baselines under `tests/visual-baseline/*` with near-strict diff policy (`pixelmatch` + threshold metrics); CI currently runs `test:visual` in warning-only mode while UI refactor churn is active.
- Added test-only visual stabilization flag (`window.__ABYSS_TEST_FLAGS__.visual.disableFx`) for deterministic snapshot capture.
- Removed scene-side native browser viewport/input fallbacks (`window.visualViewport`, `matchMedia`, direct DOM canvas/image paths) from active scene flows.
- Runtime host lifecycle now uses Phaser events for hidden/visible, input unlock, and scale resize wiring; browser lifecycle usage is reduced to explicit compatibility boundaries.
- Runtime loop fallback to browser RAF removed; active runtime stepping is now Phaser scene-driven through runtime step handlers.
- Extracted additional runtime-engine orchestration helpers into `src/engine/runtime/core/runtime-sanitizers.js`, `src/engine/runtime/core/runtime-ui-helpers.js`, and `src/engine/runtime/core/runtime-passive-helpers.js`.
- Extracted run/encounter orchestration helpers into `src/engine/runtime/core/runtime-run-helpers.js` and `src/engine/runtime/core/runtime-encounter-helpers.js`.

## Transitional / Still Present

- `src/engine/runtime/runtime-engine.js` is still the largest runtime file and continues to be the next extraction target.
- Test-only economy seed controls are present in runtime for non-production acceptance execution only.
- Runtime test flags now include visual stabilization controls for acceptance visual snapshots.

## Kept For Compatibility

- Runtime method names in menu/run/reward/shop/overlay APIs.
- `window.render_game_to_text()` and `window.advanceTime(ms)` hooks for smoke/acceptance tooling.
- Existing storage keys:
  - `blackjack-abyss.profile.v1`
  - `blackjack-abyss.run.v1`

## Fully Migrated Position

- Phaser is renderer/UI host of record.
- Scene mode transitions are synchronized through runtime context mode reporting.
- Runtime modules own state, rules, progression, persistence, and API surface.

## Deferred / Future Work

- Reintroduce a reliable balance probe with bounded execution and cleanup guarantees.
- Continue extracting remaining runtime concerns from `runtime-engine.js` into module files.
- Continue trimming runtime-engine orchestration size while avoiding wrapper-only indirection.
- Continue reducing wrapper-only indirection while keeping runtime-engine non-monolithic.

## Cleanup Guardrails

- Do not rename/remove runtime API methods without coordinated scene updates.
- Preserve storage keys unless an explicit migration plan is introduced:
  - `blackjack-abyss.profile.v1`
  - `blackjack-abyss.run.v1`
- Keep `window.render_game_to_text` and `window.advanceTime` stable for tooling unless replacement hooks are shipped concurrently.
