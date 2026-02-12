# Blackjack Abyss

Roguelike blackjack combat game built in plain HTML/CSS/JS on a single canvas.

## Features

- Blackjack hands resolve as combat damage (you vs enemy HP).
- Floor/room progression with normal, elite, and boss encounters.
- Relics and shop items with passive effects.
- Run persistence in browser localStorage (resume supported).
- Always-on action button tray (desktop includes keyboard shortcut hints on each button).

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Run the local static server:

```bash
npm run start
```

3. Open:

[http://127.0.0.1:4173](http://127.0.0.1:4173)

## Controls

### Keyboard

- `Enter`: start new run / confirm
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

- `index.html` - page shell and canvas container
- `styles.css` - global styles + bottom action controls
- `game.js` - game logic, rendering, input, persistence
- `test-actions.json` - short Playwright action burst
- `test-actions-long.json` - longer Playwright scenario
