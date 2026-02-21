# Progress

## Current Status

- Phaser-first runtime migration is active in production with acceptance tests in place as a refactor gate.
- Runtime now uses MP3 background music with SFX-priority mixing (ducking + lower BGM baseline).
- GitHub Actions CI is now wired with required quality gate checks and non-blocking smoke coverage.
- Legacy canvas draw/input fallback paths have been removed from active runtime execution.
- Last Updated: 2026-02-21 17:12:42 EST

## Current Focus

- Keep acceptance tests green before each cleanup/modularization pass.
- Continue shrinking `src/engine/runtime/bootstrap.js` via extraction into focused runtime modules.
- Keep docs aligned with runtime contracts and test-only controls.

## Done Recently

- Extracted runtime logic from monolithic `game.js` into `src/engine/runtime/*`.
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
- Added initial bootstrap helper modules under `src/engine/runtime/bootstrap/*` (`api-registry`, `audio-system`, `combat-actions`, `run-lifecycle`, `test-hooks`, `serialization`).
- Extracted large static runtime content from `bootstrap.js` into dedicated modules (`relic-catalog`, `encounter-content`) to keep Phaser runtime orchestration thinner.
- Extracted card/deck/hand utility logic from runtime bootstrap into `src/engine/runtime/domain/combat.js` and expanded unit coverage for those helpers.
- Extracted run/encounter creation flow into bootstrap factories (`run-factory`, `encounter-factory`) and added targeted unit tests for those modules.
- Extracted save/resume hydration sanitizers into `src/engine/runtime/bootstrap/state-sanitizers.js` and added sanitizer-specific unit tests.
- Extracted run snapshot persistence/resume orchestration helpers into `src/engine/runtime/bootstrap/run-snapshot.js` with dedicated unit tests.
- Extracted run result/profile tally helpers into `src/engine/runtime/bootstrap/run-results.js` and added dedicated unit tests.
- Extracted passive/relic collection presentation helpers into `src/engine/runtime/bootstrap/passive-view.js` with dedicated unit tests.
- Extracted runtime UI state helpers into `src/engine/runtime/bootstrap/runtime-ui-state.js` with dedicated unit tests.
- Extracted combat effect primitives into `src/engine/runtime/bootstrap/combat-effects.js` and moved hand-tackle + defeat-transition orchestration there with dedicated tests.
- Extracted encounter intro flow helpers into `src/engine/runtime/bootstrap/encounter-intro.js` and wired bootstrap to delegate typing/reveal/confirm/advance behavior through that module.
- Extracted turn-action orchestration into `src/engine/runtime/bootstrap/combat-turn-actions.js` (player action gating, hit/stand/double/split flow, split-hand queue progression, dealer showdown resolution) with dedicated unit tests.
- Extracted hand resolution settlement math/effects/logging into `src/engine/runtime/bootstrap/combat-resolution.js` and reduced bootstrap `resolveHand(...)` to a delegation wrapper with dedicated unit tests.
- Extracted encounter win progression/camp transition handling into `src/engine/runtime/bootstrap/encounter-outcome.js` and reduced bootstrap `onEncounterWin(...)` to a delegation wrapper with dedicated unit tests.
- Extracted reward/shop relic roll tables, stock generation, and camp purchase/continue orchestration into `src/engine/runtime/bootstrap/reward-shop.js` and reduced bootstrap reward/shop functions to delegation wrappers with dedicated unit tests.
- Extracted reward/shop Phaser snapshot builders into `src/engine/runtime/bootstrap/shop-reward-snapshots.js` and reduced bootstrap snapshot builders to delegation wrappers with dedicated unit tests.
- Extracted runtime frame update loop into `src/engine/runtime/bootstrap/runtime-update.js` and reduced bootstrap `update(dt)` to a delegation wrapper with dedicated unit tests.
- Extracted Phaser run snapshot builder into `src/engine/runtime/bootstrap/phaser-run-snapshot.js` and reduced bootstrap `buildPhaserRunSnapshot()` to a delegation wrapper with dedicated unit tests.
- Extracted mode-driven action tray + runtime text snapshot serialization into `src/engine/runtime/bootstrap/runtime-text-snapshot.js` and reduced bootstrap `availableActions()`/`renderGameToText()` to delegation wrappers with dedicated unit tests.
- Extracted overlay snapshot builder into `src/engine/runtime/bootstrap/overlay-snapshot.js` and reduced bootstrap `buildPhaserOverlaySnapshot()` to a delegation wrapper with dedicated unit tests.
- Extracted Phaser bridge API registration blocks into `src/engine/runtime/bootstrap/phaser-bridge-apis.js` and reduced bootstrap menu/run/reward/shop/overlay API registration functions to delegation wrappers with dedicated unit tests.
- Extracted runtime loop orchestration into `src/engine/runtime/bootstrap/runtime-loop.js` and reduced bootstrap `advanceTime`/resize/start-loop handling to delegation wrappers with dedicated unit tests.
- Extracted lifecycle visibility/unload handlers into `src/engine/runtime/bootstrap/runtime-lifecycle.js` and reduced bootstrap lifecycle wiring to a delegation wrapper with dedicated unit tests.
- Extracted runtime audio stack into `src/engine/runtime/bootstrap/runtime-audio.js` and reduced bootstrap audio/sfx/music methods to delegation wrappers with dedicated unit tests.
- Extracted encounter run/hand lifecycle orchestration into `src/engine/runtime/bootstrap/encounter-lifecycle.js` and reduced bootstrap shoe/deal/hand/start-run flow to delegation wrappers with dedicated unit tests.
- Extracted combat impact settlement helpers into `src/engine/runtime/bootstrap/combat-impact.js` and reduced bootstrap `finalizeResolveState`/`applyImpactDamage` to delegation wrappers with dedicated unit tests.
- Restored explicit `handBounds(...)` bridge helper (now delegated through encounter lifecycle module) to keep defeat-transition fallback math safe.
- Extracted enemy avatar loading/cache helpers into `src/engine/runtime/bootstrap/enemy-avatars.js` and removed that implementation detail from `bootstrap.js` with dedicated unit tests.
- Extracted runtime startup orchestration into `src/engine/runtime/bootstrap/runtime-startup.js` and reduced bootstrap final boot wiring to a single delegation call with dedicated unit tests.

## Next Up

- Reintroduce a reliable long-run balancing probe with explicit guardrails and bounded runtime behavior.
- Continue extracting remaining runtime sections out of `bootstrap.js` (remaining thin wrapper clusters and bootstrap entry segmentation) into focused modules.
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
- Production deploy: `https://blackjackabyss.vercel.app`.

## Notes for Next Agent

- Treat Phaser scenes as the active renderer and input layer.
- Treat `src/engine/runtime/bootstrap.js` as the gameplay runtime entrypoint and bridge registration source.
- Preserve bridge method names and test hooks (`window.render_game_to_text`, `window.advanceTime`) unless a coordinated migration is planned.
- Preserve non-production economy seed interface (`window.__ABYSS_TEST_FLAGS__.economy.startingGold`) used by acceptance tests.
- Keep branch protection on `main` requiring the `quality-gate` workflow check.
