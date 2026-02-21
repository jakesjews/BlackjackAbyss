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
- Added bootstrap helper modules under `src/engine/runtime/bootstrap/*` for API wiring, lifecycle, audio/listeners, combat transition shaping, and test-hook publication.
- Extracted static relic catalog and encounter dialogue/enemy content into `src/engine/runtime/bootstrap/relic-catalog.js` and `src/engine/runtime/bootstrap/encounter-content.js`.
- Moved reusable card/deck/hand helpers (`shuffle`, `createDeck`, totals/blackjack utilities, dealer-visible total) into `src/engine/runtime/domain/combat.js`.
- Extracted run/encounter creation lifecycle from bootstrap into `src/engine/runtime/bootstrap/run-factory.js` and `src/engine/runtime/bootstrap/encounter-factory.js`.
- Extracted run snapshot hydration/sanitization logic into `src/engine/runtime/bootstrap/state-sanitizers.js`.
- Extracted run snapshot persistence/resume orchestration helpers into `src/engine/runtime/bootstrap/run-snapshot.js`.
- Extracted run-result/profile tally helpers (`updateProfileBest`, `finalizeRun`, chip delta handling) into `src/engine/runtime/bootstrap/run-results.js`.
- Extracted passive/relic view formatting and collection list helpers into `src/engine/runtime/bootstrap/passive-view.js`.
- Replaced procedural generated BGM with MP3-backed runtime soundtrack.
- Added GitHub Actions CI workflow with required `quality-gate` and non-required smoke job.

## Transitional / Still Present

- `src/engine/legacy/legacy-runtime-adapter.js` remains as an integration seam for bridge/tick flow.
- `src/engine/runtime/bootstrap.js` is still the largest runtime file and continues to be the next extraction target.
- Test-only economy seed controls are present in runtime for non-production acceptance execution only.

## Fully Migrated Position

- Phaser is renderer/UI host of record.
- Scene mode transitions are synchronized through bridge mode reporting.
- Runtime modules own state, rules, progression, persistence, and API surface.

## Deferred / Future Work

- Reintroduce a reliable balance probe with bounded execution and cleanup guarantees.
- Continue extracting remaining runtime concerns from `bootstrap.js` into module files.
- Re-evaluate adapter removal once scene/runtime bridge parity remains stable across acceptance and smoke gates.

## Cleanup Guardrails

- Do not rename/remove bridge API methods without coordinated scene updates.
- Preserve storage keys unless an explicit migration plan is introduced:
  - `blackjack-abyss.profile.v1`
  - `blackjack-abyss.run.v1`
- Keep `window.render_game_to_text` and `window.advanceTime` stable for tooling unless replacement hooks are shipped concurrently.
