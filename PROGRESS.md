# Progress

## Current Status

- Phaser-first runtime migration is active in production, and docs are now split for stable onboarding plus detailed implementation references.
- Last Updated: 2026-02-21 00:28:29 EST

## Current Focus

- Keep architecture docs explicit that Phaser 3 is the renderer/host of record.
- Maintain bridge contract docs as the source of truth for scene/runtime integration.
- Keep `README.md` concise while pushing high-churn details into `docs/`.

## Done Recently

- Extracted runtime logic from monolithic `game.js` into `src/engine/runtime/*`.
- Updated app boot flow so `src/main.js` initializes Phaser then runtime bootstrap.
- Removed obsolete legacy files and compatibility paths.
- Added runtime unit tests and stabilized smoke checks.
- Removed broken balance probe tooling for now.

## Next Up

- Reintroduce a reliable long-run balancing probe with explicit guardrails and bounded runtime behavior.
- Continue trimming transitional legacy code only after parity checks.
- Keep docs synced when bridge contracts or mode flows change.

## Risks / Blockers

- No automated long-run balance regression probe currently exists.
- Runtime and scene contracts are tightly coupled; drift can break UI flow if docs/tests are not updated together.

## Verification Snapshot

- `npm run test:unit`: passing (runtime module tests).
- `npm run test:smoke`: passing (desktop/mobile flow snapshots).
- `npm run build`: passing (Vite production bundle).
- Production deploy: `https://blackjackabyss.vercel.app`.

## Notes for Next Agent

- Treat Phaser scenes as the active renderer and input layer.
- Treat `src/engine/runtime/bootstrap.js` as the gameplay runtime entrypoint and bridge registration source.
- Preserve bridge method names and test hooks (`window.render_game_to_text`, `window.advanceTime`) unless a coordinated migration is planned.
