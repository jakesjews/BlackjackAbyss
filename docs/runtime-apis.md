# Runtime APIs

## Contract Position

Bridge API method names are compatibility-critical for Phaser scenes and tooling. Update them only with coordinated scene + docs + test changes.

Authoritative source:

- `src/engine/runtime/bridge/register-apis.js`

## Menu API

Registered via `setMenuActions`:

- `startRun()`
- `resumeRun()`
- `openCollection()`
- `hasSavedRun()`

## Run API

Registered via `setRunApi`:

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

Registered via `setRewardApi`:

- `getSnapshot()`
- `prev()`
- `next()`
- `claim()`
- `selectIndex()`
- `goHome()`

## Shop API

Registered via `setShopApi`:

- `getSnapshot()`
- `prev()`
- `next()`
- `buy()`
- `continueRun()`
- `selectIndex()`
- `goHome()`

## Overlay API

Registered via `setOverlayApi`:

- `getSnapshot()`
- `prevPage()`
- `nextPage()`
- `backToMenu()`
- `restart()`
- `confirm()`

## Test Hooks

Published during runtime bootstrap:

- `window.render_game_to_text()`
- `window.advanceTime(ms)`

## Test-Only Runtime Controls (Non-Production)

Used by acceptance tests to run deterministic economy scenarios:

- `window.__ABYSS_TEST_FLAGS__`
- `window.__ABYSS_TEST_FLAGS__.economy.startingGold` (`number`, default `0`)

Notes:

- These controls are ignored in production builds.
- Default behavior with no flags remains normal gameplay flow.
- Acceptance tests follow natural mode transitions and may seed chips with `economy.startingGold` to exercise camp buy paths quickly.
- Scene bridge method names and global test hooks are unchanged.

Hook publisher source:

- `src/engine/runtime/bridge/snapshots.js`

## Snapshot Contract Notes

- Snapshot shapes are mode-specific and intentionally optimized for scene rendering.
- `getSnapshot()` methods may return `null` outside their active mode.
- Tooling and smoke scripts should always tolerate mode transitions and null snapshots.
