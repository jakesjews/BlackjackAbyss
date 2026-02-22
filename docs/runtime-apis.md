# Runtime APIs

## Contract Position

Bridge API method names are compatibility-critical for Phaser scenes and tooling. Update them only with coordinated scene + docs + test changes.

Authoritative source:

- `src/engine/runtime/bridge/register-apis.js`
- Primary scene/runtime path: `game.__ABYSS_RUNTIME__.apis.*`

Compatibility facade surface (current transitional endpoint):

- `window.__ABYSS_PHASER_BRIDGE__`
- This bridge is maintained for test/tool compatibility while scenes consume direct runtime APIs.
- Bridge getters are now read-only compatibility views over `runtime.apis.*` (runtime remains source-of-truth).

## Menu API

Runtime source: `runtime.apis.menuActions`  
Compatibility getter: `window.__ABYSS_PHASER_BRIDGE__.getMenuActions()`

- `startRun()`
- `resumeRun()`
- `openCollection()`
- `hasSavedRun()`

## Run API

Runtime source: `runtime.apis.runApi`  
Compatibility getter: `window.__ABYSS_PHASER_BRIDGE__.getRunApi()`

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
Compatibility getter: `window.__ABYSS_PHASER_BRIDGE__.getRewardApi()`

- `getSnapshot()`
- `prev()`
- `next()`
- `claim()`
- `selectIndex()`
- `goHome()`

## Shop API

Runtime source: `runtime.apis.shopApi`  
Compatibility getter: `window.__ABYSS_PHASER_BRIDGE__.getShopApi()`

- `getSnapshot()`
- `prev()`
- `next()`
- `buy()`
- `continueRun()`
- `selectIndex()`
- `goHome()`

## Overlay API

Runtime source: `runtime.apis.overlayApi`  
Compatibility getter: `window.__ABYSS_PHASER_BRIDGE__.getOverlayApi()`

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
