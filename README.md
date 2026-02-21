# Blackjack Abyss

Roguelike blackjack combat game with a modular runtime and Phaser 3 host.

## Features

- Blackjack hands resolve as combat damage (you vs enemy HP).
- Floor/room progression with normal, elite, and boss encounters.
- Relics and shop items with passive effects.
- Run persistence in browser localStorage (resume supported).
- Always-on action button tray (desktop includes keyboard shortcut hints on each button).
- Phaser 3 host runtime added for incremental migration to a maintained game engine.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run the local dev server:

```bash
npm run start
```

3. Open:

[http://127.0.0.1:4173](http://127.0.0.1:4173)

## Controls

### Keyboard

- `Enter`: start new run / confirm
- `Enter`: next deal (when result lock is active)
- `R`: resume saved run (from menu)
- `A`: hit
- `B`: stand
- `Space`: double down (and buy in shop)
- `Left` / `Right`: pick reward/shop items
- `F`: toggle fullscreen
- `Esc`: exit fullscreen

### Action Buttons (All Devices)

Use the bottom button tray on desktop and mobile:

- Combat: `Hit`, `Stand`, `Double`
- Reward/shop: `Left`, `Right`, `Confirm` (and `Buy` in shop)
- Menu: `Resume` / `New Run`
- Desktop only: each button also shows its keyboard shortcut hint.

## Persistence

Game state is saved in localStorage while playing/reward/shop and on tab hide/unload.

Storage keys:

- `blackjack-abyss.profile.v1`
- `blackjack-abyss.run.v1`

## Project Files

- `index.html` - page shell and UI overlays
- `styles.css` - global styles + responsive controls
- `src/main.js` - module entrypoint
- `src/engine/app.js` - Phaser application bootstrap + runtime context
- `src/engine/phaser-host.js` - compatibility re-export for existing host import paths
- `game.js` - current gameplay implementation (legacy module loaded by `src/main.js`)
- `scripts/visual-smoke.js` - Playwright screenshot sweep for key UI states (desktop + mobile)
- `test-actions.json` - short Playwright action burst
- `test-actions-long.json` - longer Playwright scenario

## Visual Smoke Check

Run the app (`npm run start`) and in another terminal capture screenshots:

```bash
node scripts/visual-smoke.js --url http://127.0.0.1:4173 --out /tmp/abyss-visual-smoke
```

## Build / Deploy

```bash
npm run build
```

- Vite outputs static assets to `dist/`.
- Vercel uses `vercel.json` (`framework: vite`, output `dist`).
