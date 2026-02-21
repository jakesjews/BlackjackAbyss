# Blackjack Abyss

Roguelike blackjack combat game hosted in Phaser 3, with gameplay/runtime logic extracted into modular engine files.

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

- `src/main.js` boots Phaser and initializes runtime bootstrap.
- `src/engine/runtime/bootstrap.js` is the runtime entrypoint and bridge registration source.
- `src/engine/runtime/state/*`, `domain/*`, `persistence/*`, `bridge/*`, `audio/*` contain extracted runtime modules.
- `game.js` is a thin compatibility wrapper that calls runtime bootstrap.

## Controls

- `Enter`: start new run / confirm / next deal when result lock is active
- `R`: resume saved run from menu
- `A`: hit
- `B`: stand
- `Space`: double down (and buy in shop)
- `Left` / `Right`: pick reward/shop items
- `F`: toggle fullscreen
- `Esc`: exit fullscreen

## Persistence

Game state is saved in localStorage while in run/reward/shop states and on tab hide/unload.

Storage keys:

- `blackjack-abyss.profile.v1`
- `blackjack-abyss.run.v1`

## Test Commands

- `npm run test:unit`: fast vitest coverage for extracted runtime logic modules.
- `npm run test:smoke`: Playwright smoke flow (desktop/mobile snapshots and bridge checks).

## Build / Deploy

- Vite outputs static assets to `dist/`.
- Vercel uses `vercel.json` with Vite output directory `dist`.
