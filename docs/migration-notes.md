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
- Added acceptance test harness with one-hand fast-path coverage for reward/shop/persistence surfaces.
- Replaced procedural generated BGM with MP3-backed runtime soundtrack.
- Added GitHub Actions CI workflow with required `quality-gate` and non-required smoke job.

## Transitional / Still Present

- `src/engine/legacy/legacy-runtime-adapter.js` remains as an integration seam for bridge/input flow.
- Some legacy-oriented naming and pathways remain inside runtime bootstrap for compatibility while parity is maintained.
- One-hand fast-path controls are present in runtime for non-production acceptance execution only.

## Fully Migrated Position

- Phaser is renderer/UI host of record.
- Scene mode transitions are synchronized through bridge mode reporting.
- Runtime modules own state, rules, progression, persistence, and API surface.

## Deferred / Future Work

- Reintroduce a reliable balance probe with bounded execution and cleanup guarantees.
- Continue reducing transitional legacy canvas surfaces only after parity checks.
- Consider moving additional runtime concerns (audio + test controls) into dedicated runtime modules once bootstrap shrink pass starts.

## Legacy Canvas Call Graph (Prepared for Next Removal Pass)

Current guard in `src/engine/runtime/bootstrap.js`:

1. `render()`
2. `if (isExternalModeRendering()) return;`

Legacy draw path only executes when external mode rendering is false:

- `drawBackground()`
- `drawMenu()` / `drawMenuParticles()` for `menu`/`collection`
- `drawHud()` + `drawEncounter()` for run HUD/gameplay
- `drawRewardScreen()` for `reward`
- `drawShopScreen()` for `shop`
- `drawEndOverlay()` for `gameover`/`victory`
- `drawEffects()` + `drawFlashOverlays()`

## Cleanup Guardrails

- Do not rename/remove bridge API methods without coordinated scene updates.
- Preserve storage keys unless an explicit migration plan is introduced:
  - `blackjack-abyss.profile.v1`
  - `blackjack-abyss.run.v1`
- Keep `window.render_game_to_text` and `window.advanceTime` stable for tooling unless replacement hooks are shipped concurrently.
