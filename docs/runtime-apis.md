# Runtime APIs

## Contract Position

Runtime API method names are compatibility-critical for Phaser scenes and tooling. Update them only with coordinated scene + docs + test changes.

Authoritative source:

- `src/engine/runtime/bridge/register-apis.js`
- Primary scene/runtime path: `game.__ABYSS_RUNTIME__.apis.*`

## Menu API

Runtime source: `runtime.apis.menuActions`

- `startRun()`
- `resumeRun()`
- `openCollection()`
- `hasSavedRun()`

## Run API

Runtime source: `runtime.apis.runApi`

- `getSnapshot()`
- `hit()`
- `stand()`
- `doubleDown()`
- `split()`
- `deal()`
- `confirmIntro()`
- `fireballLaunch()`
- `fireballImpact()`
- `startEnemyDefeatTransition()`
- `card()`
- `goHome()`

## Reward API

Runtime source: `runtime.apis.rewardApi`

- `getSnapshot()`
- `prev()`
- `next()`
- `claim()`
- `selectIndex()`
- `goHome()`

## Shop API

Runtime source: `runtime.apis.shopApi`

- `getSnapshot()`
- `prev()`
- `next()`
- `buy()`
- `continueRun()`
- `selectIndex()`
- `goHome()`

## Overlay API

Runtime source: `runtime.apis.overlayApi`

- `getSnapshot()`
- `prevPage()`
- `nextPage()`
- `backToMenu()`
- `restart()`
- `confirm()`

## Test Hooks

Published during runtime startup:

- `window.render_game_to_text()`
- `window.advanceTime(ms)`

## Test-Only Runtime Controls (Non-Production)

Used by acceptance tests to run deterministic economy scenarios:

- `window.__ABYSS_TEST_FLAGS__`
- `window.__ABYSS_TEST_FLAGS__.economy.startingGold` (`number`, default `0`)
- `window.__ABYSS_TEST_FLAGS__.visual.disableFx` (`boolean`, default `false`)

Notes:

- These controls are ignored in production builds.
- Default behavior with no flags remains normal gameplay flow.
- Acceptance tests follow natural mode transitions and may seed chips with `economy.startingGold` to exercise camp buy paths quickly.
- Visual regression tests set `visual.disableFx = true` to stabilize cosmetic-only motion during baseline snapshots.
- Scene runtime method names and global test hooks are unchanged.

Hook publisher source:

- `src/engine/runtime/bridge/snapshots.js`

## Snapshot Contract Notes

- Snapshot shapes are mode-specific and intentionally optimized for scene rendering.
- `getSnapshot()` methods may return `null` outside their active mode.
- Tooling and smoke scripts should always tolerate mode transitions and null snapshots.
