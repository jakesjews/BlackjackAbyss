# Phaser Migration Plan

This project now boots through a Phaser-first entrypoint while keeping the current gameplay runtime intact through a compatibility adapter.

## Phase 1 (Completed in this step)

- Added Phaser scene skeletons:
  - `BootScene`
  - `LegacyCompatScene`
  - `MenuScene`
  - `RunScene`
  - `RewardScene`
  - `ShopScene`
  - `OverlayScene`
- Added core runtime services:
  - `EventBus`
  - `GameStateService`
  - `PersistenceService`
  - `AudioService`
- Added `LegacyRuntimeAdapter` that preserves `window.__ABYSS_PHASER_BRIDGE__` behavior (`setStepHandler`, `getCanvas`) so `game.js` keeps running without visual/layout changes.
- Switched `src/main.js` to boot from `src/engine/app.js`.

## Phase 2 (Next)

- Move mode transitions and core loop ownership into Phaser scenes.
- Move gameplay input ownership from ad hoc listeners to Phaser Input Manager.
- Extract rules/state mutation into pure `src/core/*` modules.
- Keep visual parity by rendering current UI through legacy path until scene-by-scene replacement is ready.

### Phase 2 progress

- Legacy update loop is Phaser-owned through `LegacyCompatScene.update(...)` calling the legacy adapter tick.
- Legacy input callbacks are now wired from Phaser Input Manager to existing handlers via adapter dispatch:
  - pointer down/move/up/cancel
  - keyboard keydown
- Legacy mode changes are now mirrored into Phaser runtime and mapped to skeleton scenes (`menu`, `run`, `reward`, `shop`, `overlay`) without changing visuals.

## Phase 3 (Full Cutover)

- Replace legacy canvas draw code with Phaser-native rendering + UI containers.
- Move audio playback fully to Phaser sound management.
- Remove compatibility adapter and direct `game.js` runtime bootstrap.
- Keep `game.js` only as source material until parity is confirmed, then retire it.

### Phase 3 progress

- Legacy rendering now targets a compatibility render surface and is composited through Phaser as a canvas texture in `LegacyCompatScene`.
- Phaser owns the final frame composition path while visuals/layout behavior remains driven by existing legacy draw logic.
- `menu` mode is now Phaser-native:
  - legacy compatibility scene is stopped while in menu mode
  - `MenuScene` owns menu rendering and input flow
  - menu actions dispatch to legacy gameplay logic through bridge action callbacks
- `playing` mode (`run`) is now Phaser-native:
  - `RunScene` owns run-mode rendering and run-mode input controls
  - run actions and run snapshot state are pulled from legacy logic through bridge APIs
  - legacy draw path is bypassed for `playing` mode via external-render mode gating
- `reward` mode is now Phaser-native:
  - `RewardScene` owns reward selection rendering and reward input controls
  - reward actions and reward snapshot state are pulled from legacy logic through bridge APIs
  - legacy draw path is bypassed for `reward` mode via external-render mode gating
- `shop` mode is now Phaser-native:
  - `ShopScene` owns shop rendering and shop input controls
  - shop actions and shop snapshot state are pulled from legacy logic through bridge APIs
  - legacy draw path is bypassed for `shop` mode via external-render mode gating
- `collection` and end overlay modes are now Phaser-native:
  - `OverlayScene` owns `collection`, `gameover`, and `victory` rendering + input
  - overlay actions and snapshot state are pulled from legacy logic through bridge APIs
  - legacy draw path is bypassed for `collection`, `gameover`, and `victory`
- Next cutover work:
  - Migrate legacy audio generation to Phaser sound ownership.
  - Remove `game.js` bootstrap dependency after parity checks.
