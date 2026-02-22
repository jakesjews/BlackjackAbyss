# Architecture

## Architecture Position

- Phaser 3 is the host app and renderer of record.
- Phaser scenes are the active presentation and input layer.
- Runtime modules are the gameplay/state engine.
- Legacy raw-canvas rendering paths have been removed from active runtime execution.

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
- Runtime orchestration helper modules: `src/engine/runtime/core/{runtime-sanitizers,runtime-ui-helpers,runtime-passive-helpers}.js`
- Runtime run/encounter orchestration helpers: `src/engine/runtime/core/{runtime-run-helpers,runtime-encounter-helpers}.js`
- Scene layer: `src/engine/scenes/*`
- Scene run config module: `src/engine/scenes/run/run-scene-config.js` (RunScene/BootScene shared run asset keys + style constants).
- Scene run modal state helper: `src/engine/scenes/run/run-scene-modals.js` (RunScene modal order/state/blocker synchronization helpers).
- Scene run modal renderer helper: `src/engine/scenes/run/run-scene-modal-renderers.js` (RunScene logs/relics modal rendering and close-button plumbing).
- Scene brown-theme utility: `src/engine/scenes/ui/brown-theme.js` (shared blue-to-brown palette conversion for text + graphics across scenes).
- Scene shared texture helpers: `src/engine/scenes/ui/texture-processing.js` (tight alpha trims + icon/watermark derived textures via Phaser texture manager).
- Scene asset host: `src/engine/scenes/BootScene.js` preloads shared textures (including enemy avatars/icons) into Phaser's texture manager.

## Boot Flow

1. `src/main.js` calls `createPhaserApp()` from `src/engine/app.js`.
2. `createPhaserApp()` creates the Phaser game and scene manager.
3. `src/main.js` starts runtime state/logic entry.
4. Runtime entry registers scene-facing APIs and test hooks.
5. Scene mode changes are synchronized through direct runtime context mode reporting.

## Runtime Seam

- `src/engine/app.js` exposes a direct runtime context: `game`, runtime API slots (`runtime.apis.*`), and runtime tick function.
- Runtime frame stepping is scene-driven through runtime context handlers (`runtime.tick` + `runtime.setStepHandler`) rather than legacy shim plumbing.
- Scenes consume runtime APIs through `src/engine/scenes/runtime-access.js` by reading `game.__ABYSS_RUNTIME__.apis`.

## Runtime vs Scene Responsibilities

Runtime responsibilities:

- Own canonical run/profile state.
- Resolve combat/progression/reward/shop transitions.
- Provide reusable combat/card primitives in runtime domain modules (`domain/combat.js`).
- Persist state and profile snapshots.
- Expose snapshots and mutating actions via runtime API contracts.
- Own runtime audio behavior (MP3 BGM + SFX mixing policy).

Scene responsibilities:

- Render UI and visual effects.
- Poll snapshots from runtime APIs (`runtime.apis.*`).
- Call runtime actions in response to user input.
- Manage Phaser-specific layout, animations, and modal presentation.

## Host API Policy

Phaser is the host of record for runtime loop/input/resize/visibility handling.

- Runtime loop/ticks: scene-driven through `runtime.setStepHandler` + `runtime.tick`.
- Lifecycle wiring: Phaser game/scale/input events via `src/engine/runtime/core/runtime-phaser-host.js`.
- Scene sizing/layout decisions use Phaser scale/device/input APIs.
- Runtime no longer carries an external-renderer switch; Phaser is always the active host/render path.

Browser APIs are intentionally limited to compatibility/host boundaries:

- `localStorage` persistence.
- Global test hooks and test flags.
- `beforeunload` save guard.
- App boot DOM mount (`#game-shell`) and shell mode class toggle in `src/engine/app.js`.

## Data Flow

Read path:

1. Runtime computes canonical state.
2. Runtime `getSnapshot` APIs expose scene-specific state views.
3. Scenes render from snapshots each frame/tick.

Write path:

1. User input in scene (button/key/pointer).
2. Scene calls runtime action (`hit`, `claim`, `buy`, etc.) on `runtime.apis.*`.
3. Runtime mutates state and emits updated snapshots.
4. Scene reflects new state on the next render/update cycle.

## Legacy Boundary

- Legacy adapter seam has been removed.

## Verification Gate

- Refactors should clear: `test:unit`, `test:acceptance`, and `build`.
- `test:visual` remains required for local visual validation, but CI currently treats visual diffs as warning-only during active UI churn.
- `test:acceptance` excludes `tests/acceptance/visual-smoke.spec.mjs`; run `test:visual` for golden-image validation.
- `test:smoke` remains available as a focused rerun of that same smoke spec when artifact-only refresh is needed.
- Acceptance tests use one-hand core + natural camp flows, non-production economy seeding for faster buy-path verification, and desktop/mobile smoke artifact capture.
