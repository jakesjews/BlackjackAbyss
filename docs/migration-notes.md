# Migration Notes

## Migration Goal

Maintain a Phaser-first game where scenes are the primary renderer and runtime modules are the gameplay engine.

## Completed

- Runtime extraction into modular files under `src/engine/runtime/*`.
- Phaser app boot path established in `src/main.js` and `src/engine/app.js`.
- Bridge contract assertions and test hook publication integrated into runtime bootstrap.
- Legacy Phaser host shim removed.
- Broken balance probe tooling removed temporarily.
- Added acceptance test harness with one-hand fast-path coverage for reward/shop/persistence surfaces.
- Replaced procedural generated BGM with MP3-backed runtime soundtrack.

## Transitional / Still Present

- `game.js` remains as a thin compatibility wrapper to bootstrap runtime.
- `src/engine/legacy/legacy-runtime-adapter.js` remains as an integration seam for bridge/input flow.
- Some legacy-oriented naming and pathways remain inside runtime bootstrap for compatibility while parity is maintained.
- One-hand fast-path controls are present in runtime for non-production acceptance execution only.

## Fully Migrated Position

- Phaser is renderer/UI host of record.
- Scene mode transitions are synchronized through bridge mode reporting.
- Runtime modules own state, rules, progression, persistence, and API surface.

## Deferred / Future Work

- Reintroduce a reliable balance probe with bounded execution and cleanup guarantees.
- Continue reducing transitional legacy surfaces only after parity checks.
- Consider moving additional runtime concerns (audio + test controls) into dedicated runtime modules once bootstrap shrink pass starts.

## Cleanup Guardrails

- Do not rename/remove bridge API methods without coordinated scene updates.
- Preserve storage keys unless an explicit migration plan is introduced:
  - `blackjack-abyss.profile.v1`
  - `blackjack-abyss.run.v1`
- Keep `window.render_game_to_text` and `window.advanceTime` stable for tooling unless replacement hooks are shipped concurrently.
