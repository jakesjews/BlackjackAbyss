# Architecture

## Architecture Position

- Phaser 3 is the host app and renderer of record.
- Phaser scenes are the active presentation and input layer.
- Runtime bootstrap and runtime modules are the gameplay/state engine.
- Legacy raw-canvas rendering paths have been removed from active runtime execution.

## System Overview

Blackjack Abyss runs as a Phaser app that boots scene infrastructure first, then attaches runtime logic through a bridge contract.

- App bootstrap: `src/main.js`
- Phaser host/app setup: `src/engine/app.js`
- Runtime bootstrap: `src/engine/runtime/bootstrap.js`
- Runtime modules: `src/engine/runtime/{state,domain,persistence,bridge,testing,bootstrap}/*`
- Runtime content modules: `src/engine/runtime/bootstrap/{relic-catalog,encounter-content}.js`
- Runtime factory modules: `src/engine/runtime/bootstrap/{run-factory,encounter-factory}.js`
- Runtime hydration/sanitization module: `src/engine/runtime/bootstrap/state-sanitizers.js`
- Runtime snapshot/persistence module: `src/engine/runtime/bootstrap/run-snapshot.js`
- Runtime run-result/profile module: `src/engine/runtime/bootstrap/run-results.js`
- Scene layer: `src/engine/scenes/*`

## Boot Flow

1. `src/main.js` calls `createPhaserApp()` from `src/engine/app.js`.
2. `createPhaserApp()` creates the Phaser game and scene manager.
3. `src/main.js` then calls `bootstrapRuntime()`.
4. Runtime bootstrap registers scene-facing bridge APIs and test hooks.
5. Scene mode changes are synchronized via bridge mode reporting.

## Host Runtime Seam

- `src/engine/app.js` keeps runtime context intentionally minimal: `legacyAdapter` and `game`.
- `window.__ABYSS_ENGINE_RUNTIME__` mirrors that seam for diagnostics, without deprecated app service objects.
- Scenes consume bridge APIs via the runtime seam and remain decoupled from runtime internals.

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

- `src/engine/legacy/legacy-runtime-adapter.js` remains as a bridge/tick adapter seam used by app/runtime integration.
- Legacy compatibility should only be removed after parity is verified in Phaser-first flows.

## Verification Gate

- Refactors should clear: `test:unit`, `test:acceptance`, `test:smoke`, and `build`.
- Acceptance tests use one-hand core + natural camp flows, with non-production economy seeding for faster buy-path verification.
