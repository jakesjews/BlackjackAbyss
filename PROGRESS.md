# Progress

## Current Status

- Phaser-first runtime migration is active in production with acceptance tests in place as a refactor gate.
- Runtime now uses MP3 background music with SFX-priority mixing (ducking + lower BGM baseline).
- GitHub Actions CI is now wired with required quality gate checks and non-blocking smoke coverage.
- Last Updated: 2026-02-21 01:39:24 EST

## Current Focus

- Keep acceptance tests green before each cleanup/modularization pass.
- Continue Phaser migration with behavior parity guarded by unit + acceptance + smoke + build checks.
- Keep docs aligned with runtime contracts and test-only controls.

## Done Recently

- Extracted runtime logic from monolithic `game.js` into `src/engine/runtime/*`.
- Updated app boot flow so `src/main.js` initializes Phaser then runtime bootstrap.
- Removed obsolete compatibility wrapper `game.js` and package export pointer.
- Added runtime unit tests and stabilized smoke checks.
- Removed broken balance probe tooling for now.
- Added one-hand acceptance test harness with test-only fast-path flags (`reward`/`shop`) for safe refactors.
- Replaced procedural generated music with MP3 runtime BGM and retained prominent SFX mixing.
- Added GitHub Actions CI (`quality-gate` + scheduled/main smoke artifact job).
- Simplified Phaser host/runtime seam by removing dead app service layer and normalizing scene bridge access.
- Added test-only economy seed control (`window.__ABYSS_TEST_FLAGS__.economy.startingGold`) and updated acceptance camp coverage to use seeded chips.

## Next Up

- Reintroduce a reliable long-run balancing probe with explicit guardrails and bounded runtime behavior.
- Continue trimming transitional legacy canvas pathways only after parity checks.
- Keep docs synced when bridge contracts, test hooks, or mode flows change.

## Risks / Blockers

- No automated long-run balance regression probe currently exists.
- Runtime and scene contracts are tightly coupled; drift can break UI flow if docs/tests are not updated together.
- Audio balance tuning (BGM vs SFX) may need iteration based on play feedback on different devices.

## Verification Snapshot

- `npm run test:unit`: passing (runtime module tests).
- `npm run test:acceptance`: passing (contracts + one-hand flow + forced reward/shop + persistence/resume).
- `npm run test:smoke`: passing (desktop/mobile flow snapshots).
- `npm run build`: passing (Vite production bundle).
- Production deploy: `https://blackjackabyss.vercel.app`.

## Notes for Next Agent

- Treat Phaser scenes as the active renderer and input layer.
- Treat `src/engine/runtime/bootstrap.js` as the gameplay runtime entrypoint and bridge registration source.
- Preserve bridge method names and test hooks (`window.render_game_to_text`, `window.advanceTime`) unless a coordinated migration is planned.
- Preserve non-production test fast-path interface (`window.__ABYSS_TEST_FLAGS__.fastPath`) used by acceptance tests.
- Keep branch protection on `main` requiring the `quality-gate` workflow check.
