# Architecture

## Architecture Position

- Phaser 3 is the host app and renderer of record.
- Phaser scenes are the active presentation and input layer.
- Runtime modules are the gameplay/state engine.
- Legacy raw-canvas rendering paths have been removed from active runtime execution.
- `window.__ABYSS_PHASER_BRIDGE__` is currently a compatibility facade for scene/test/tool contracts.

## System Overview

Blackjack Abyss runs as a Phaser app that boots scene infrastructure first, then attaches runtime logic/state through a runtime entrypoint.

- App bootstrap: `src/main.js`
- Phaser host/app setup: `src/engine/app.js`
- Runtime entry: `src/engine/runtime/runtime-engine.js`
- Runtime modules: `src/engine/runtime/{state,domain,persistence,bridge,testing,core}/*`
- Runtime content modules: `src/engine/runtime/core/{relic-catalog,encounter-content}.js`
- Runtime factory modules: `src/engine/runtime/core/{run-factory,encounter-factory}.js`
- Runtime hydration/sanitization module: `src/engine/runtime/core/state-sanitizers.js`
- Runtime snapshot/persistence module: `src/engine/runtime/core/run-snapshot.js`
- Runtime run-result/profile module: `src/engine/runtime/core/run-results.js`
- Runtime passive/collection view module: `src/engine/runtime/core/passive-view.js`
- Scene layer: `src/engine/scenes/*`

## Boot Flow

1. `src/main.js` calls `createPhaserApp()` from `src/engine/app.js`.
2. `createPhaserApp()` creates the Phaser game and scene manager.
3. `src/main.js` starts runtime state/logic entry.
4. Runtime entry registers scene-facing APIs and test hooks.
5. Scene mode changes are synchronized via bridge mode reporting.

## Runtime Seam

- `src/engine/app.js` exposes a direct runtime context: `game`, runtime bridge facade, and runtime tick function.
- `window.__ABYSS_PHASER_BRIDGE__` is kept as a thin compatibility facade.
- Scenes consume bridge APIs through `src/engine/scenes/runtime-bridge.js`, which reads from the direct runtime context.

## Runtime vs Scene Responsibilities

Runtime responsibilities:

- Own canonical run/profile state.
- Resolve combat/progression/reward/shop transitions.
- Provide reusable combat/card primitives in runtime domain modules (`domain/combat.js`).
- Persist state and profile snapshots.
- Expose snapshots and mutating actions via bridge contracts.
- Own runtime audio behavior (MP3 BGM + SFX mixing policy).

Scene responsibilities:

- Render UI and visual effects.
- Poll snapshots from bridge APIs.
- Call bridge actions in response to user input.
- Manage Phaser-specific layout, animations, and modal presentation.

## Data Flow

Read path:

1. Runtime computes canonical state.
2. Bridge `getSnapshot` APIs expose scene-specific state views.
3. Scenes render from snapshots each frame/tick.

Write path:

1. User input in scene (button/key/pointer).
2. Scene calls bridge action (`hit`, `claim`, `buy`, etc.).
3. Runtime mutates state and emits updated snapshots.
4. Scene reflects new state on the next render/update cycle.

## Legacy Boundary

- Legacy adapter seam has been removed.
- Bridge compatibility remains intentionally in `window.__ABYSS_PHASER_BRIDGE__` for scene/tool stability.

## Verification Gate

- Refactors should clear: `test:unit`, `test:acceptance`, `test:smoke`, and `build`.
- Acceptance tests use one-hand core + natural camp flows, with non-production economy seeding for faster buy-path verification.
