# Architecture

## Architecture Position

- Phaser 3 is the host app and renderer of record.
- Phaser scenes are the active presentation and input layer.
- Runtime bootstrap and runtime modules are the gameplay/state engine.
- Raw-canvas and legacy pathways are transitional compatibility surfaces, not the primary rendering model.

## System Overview

Blackjack Abyss runs as a Phaser app that boots scene infrastructure first, then attaches runtime logic through a bridge contract.

- App bootstrap: `src/main.js`
- Phaser host/app setup: `src/engine/app.js`
- Runtime bootstrap: `src/engine/runtime/bootstrap.js`
- Runtime modules: `src/engine/runtime/{state,domain,persistence,audio,bridge}/*`
- Scene layer: `src/engine/scenes/*`

## Boot Flow

1. `src/main.js` calls `createPhaserApp()` from `src/engine/app.js`.
2. `createPhaserApp()` creates the Phaser game and scene manager.
3. `src/main.js` then calls `bootstrapRuntime()`.
4. Runtime bootstrap registers scene-facing bridge APIs and test hooks.
5. Scene mode changes are synchronized via bridge mode reporting.

## Runtime vs Scene Responsibilities

Runtime responsibilities:

- Own canonical run/profile state.
- Resolve combat/progression/reward/shop transitions.
- Persist state and profile snapshots.
- Expose snapshots and mutating actions via bridge contracts.

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

- `game.js` remains a thin compatibility wrapper that calls runtime bootstrap.
- `src/engine/legacy/legacy-runtime-adapter.js` remains as a bridge/adapter seam used by app/runtime integration.
- Legacy compatibility should only be removed after parity is verified in Phaser-first flows.
