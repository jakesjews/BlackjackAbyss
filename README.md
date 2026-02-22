# Blackjack Abyss

Blackjack Abyss is a Phaser 3 app: a roguelike blackjack combat game where Phaser scenes are the active renderer/input layer and runtime modules own gameplay/state logic.

## Features

- Blackjack hands resolve as combat damage (player HP vs enemy HP).
- Floor and room progression with normal, elite, and boss encounters.
- Relics, rewards, and shop choices that modify run strategy.
- Run and profile persistence via browser localStorage.
- Phaser-first rendering and scene flow, with runtime logic consumed directly by scenes.
- Mode-driven action button tray with desktop keyboard shortcut hints.
- MP3 background soundtrack with SFX-priority mixing so combat/UI sounds stay prominent.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run the local dev server:

```bash
npm run start
```

3. Open `http://127.0.0.1:4173`.

## Runtime Architecture

- `src/main.js` boots Phaser (`createPhaserApp`) and then boots runtime state/logic startup.
- Phaser scenes in `src/engine/scenes/*` are the renderer/UI state machine and input host.
- Runtime modules in `src/engine/runtime/*` own gameplay state, progression, persistence, and scene-facing APIs.
- Runtime entrypoint is `src/engine/runtime/runtime-engine.js`.
- `src/engine/runtime/core/*` contains extracted runtime helpers, factories, snapshot/persistence helpers, run-results/profile helpers, passive/collection view helpers, sanitizers, and content catalogs.
- Host/runtime seam in `src/engine/app.js` is direct (`game` + runtime APIs + runtime tick), with no legacy adapter class.

## Controls

### Keyboard

- `Enter`: start run, confirm, deal/continue, restart (context dependent)
- `R`: resume saved run from menu
- `A` or `Z`: hit
- `B` or `X`: stand
- `C` or `Space`: double down (`Space` also buys in shop)
- `S`: split (when legal)
- `Left` / `Right`: reward/shop selection
- `F`: toggle fullscreen
- `Esc`: close overlays, leave collection, or exit fullscreen

### Action Button Tray (Mode-Driven)

The action tray is mode-aware and updates labels/actions as the run state changes.

- `menu`: `Resume`, `New Run`, `Collections`
- `playing` intro/deal gates: `Continue` or `Deal`
- `playing` action phase: `Hit`, `Stand`, `Double`, optional `Split`
- `reward`: selection + `Claim`
- `shop`: `Prev`/`Next`, `Buy`, `Continue` (leave camp)
- `gameover` / `victory`: `New Run`

Tray button actions route through runtime APIs on `game.__ABYSS_RUNTIME__.apis` consumed by Phaser scenes.

## Persistence

Game state is saved in localStorage while in run/reward/shop states and on tab hide/unload.

Storage keys:

- `blackjack-abyss.profile.v1`
- `blackjack-abyss.run.v1`

## Documentation Map

- [`PROGRESS.md`](./PROGRESS.md): rolling project state and handoff context
- [`docs/architecture.md`](./docs/architecture.md): Phaser-first system architecture and data flow
- [`docs/controls-and-modes.md`](./docs/controls-and-modes.md): mode-specific controls and tray behavior
- [`docs/runtime-apis.md`](./docs/runtime-apis.md): runtime API contracts and test hooks
- [`docs/migration-notes.md`](./docs/migration-notes.md): migration status, transitional boundaries, cleanup notes

## CI

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Required check for PR merge to `main`: `quality-gate` (`test:unit`, `test:acceptance`, `build`).
- `test:visual` runs in CI as warning-only during active UI refactor churn (diff artifacts are still uploaded when it fails).
- `test:acceptance` excludes `tests/acceptance/visual-smoke.spec.mjs` so gameplay/browser-flow checks stay stable during UI churn.
- `test:visual` remains the strict golden-diff command for local/intentional validation.
- Informational smoke job: runs on `main` pushes, nightly schedule, and manual dispatch; reruns the same visual smoke spec for artifact capture (`artifacts/visual-smoke/latest`).

## Test Commands

- `npm run test:unit`: fast vitest coverage for extracted runtime logic modules.
- `npm run test:acceptance`: primary Playwright gate (contracts + one-hand core/camp progression + seeded economy + persistence), excluding visual-smoke snapshots.
- `npm run test:visual`: strict golden-image regression check for desktop/mobile smoke shots.
- `npm run test:visual:update`: intentional golden refresh (`VISUAL_UPDATE=1`) after approved visual changes.
- `npm run test:smoke`: focused rerun of `tests/acceptance/visual-smoke.spec.mjs` for desktop/mobile snapshots and artifact refresh.
- If `test:acceptance` has already passed in a cycle, running `test:smoke` again is optional unless you specifically want fresh smoke artifacts.

## Build / Deploy

- Vite outputs static assets to `dist/`.
- Vercel uses `vercel.json` with Vite output directory `dist`.
