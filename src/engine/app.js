import Phaser from "phaser";
import { BASE_HEIGHT, BASE_WIDTH, SCENE_KEYS } from "./constants.js";
import { LegacyRuntimeAdapter } from "./legacy/legacy-runtime-adapter.js";
import { BootScene } from "./scenes/BootScene.js";
import { LegacyCompatScene } from "./scenes/LegacyCompatScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { RunScene } from "./scenes/RunScene.js";
import { RewardScene } from "./scenes/RewardScene.js";
import { ShopScene } from "./scenes/ShopScene.js";
import { OverlayScene } from "./scenes/OverlayScene.js";
import { AudioService } from "./services/audio.js";
import { EventBus } from "./services/event-bus.js";
import { GameStateService } from "./services/game-state.js";
import { PersistenceService } from "./services/persistence.js";

function createRuntimeContext() {
  const eventBus = new EventBus();
  const persistence = new PersistenceService();
  const gameState = new GameStateService({ eventBus });
  const audio = new AudioService({ eventBus });
  const legacyAdapter = new LegacyRuntimeAdapter();

  return {
    eventBus,
    persistence,
    gameState,
    audio,
    legacyAdapter,
    game: null,
  };
}

function syncPhaserScenesForMode(game, mode) {
  const manager = game?.scene;
  if (!manager) {
    return;
  }
  const activeModes = new Set(["menu", "playing", "reward", "shop", "collection", "gameover", "victory"]);
  const activeSceneKeys = [SCENE_KEYS.menu, SCENE_KEYS.run, SCENE_KEYS.reward, SCENE_KEYS.shop, SCENE_KEYS.overlay, SCENE_KEYS.legacyCompat];
  const desired = new Set();

  if (mode === "menu") {
    desired.add(SCENE_KEYS.menu);
  } else if (mode === "playing") {
    desired.add(SCENE_KEYS.run);
  } else if (mode === "reward") {
    desired.add(SCENE_KEYS.reward);
  } else if (mode === "shop") {
    desired.add(SCENE_KEYS.shop);
  } else if (mode === "collection" || mode === "gameover" || mode === "victory") {
    desired.add(SCENE_KEYS.overlay);
  } else if (!activeModes.has(mode)) {
    desired.add(SCENE_KEYS.legacyCompat);
  }

  activeSceneKeys.forEach((key) => {
    if (desired.has(key)) {
      if (!manager.isActive(key)) {
        manager.start(key);
      }
      return;
    }
    if (manager.isActive(key)) {
      manager.stop(key);
    }
  });
}

export function createPhaserApp() {
  if (window.__ABYSS_PHASER_READY_PROMISE__) {
    return window.__ABYSS_PHASER_READY_PROMISE__;
  }

  const shell = document.getElementById("game-shell");
  if (!shell) {
    throw new Error("Phaser app requires #game-shell");
  }

  const runtime = createRuntimeContext();

  const readyPayloadPromise = new Promise((resolve) => {
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: shell,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      scene: [BootScene, LegacyCompatScene, MenuScene, RunScene, RewardScene, ShopScene, OverlayScene],
      transparent: true,
      backgroundColor: "#000000",
      render: {
        antialias: true,
        roundPixels: true,
        clearBeforeRender: false,
        pixelArt: false,
        transparent: true,
        premultipliedAlpha: false,
      },
      scale: {
        mode: Phaser.Scale.NONE,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
        autoRound: true,
      },
      fps: {
        target: 60,
        forceSetTimeOut: false,
        smoothStep: true,
      },
      callbacks: {
        postBoot: (bootedGame) => {
          const canvas = bootedGame.canvas;
          if (canvas) {
            canvas.id = "game-canvas";
            canvas.setAttribute("aria-label", "Blackjack Abyss game");
          }
          runtime.game = bootedGame;
          bootedGame.__ABYSS_RUNTIME__ = runtime;

          const bridge = runtime.legacyAdapter.attachGame(bootedGame);
          if (typeof bridge.setExternalRenderModes === "function") {
            bridge.setExternalRenderModes(["menu", "playing", "reward", "shop", "collection", "gameover", "victory"]);
          }
          if (typeof bridge.setModeHandler === "function") {
            bridge.setModeHandler((mode) => {
              runtime.gameState.setMode(mode);
              syncPhaserScenesForMode(bootedGame, mode);
            });
          }

          window.__ABYSS_PHASER_GAME__ = bootedGame;
          window.__ABYSS_PHASER_BRIDGE__ = bridge;
          window.__ABYSS_ENGINE_RUNTIME__ = runtime;
          resolve({
            bridge,
            runtime,
            game: bootedGame,
          });
        },
      },
    });

    runtime.game = game;
  });

  window.__ABYSS_PHASER_RUNTIME_PROMISE__ = readyPayloadPromise;
  window.__ABYSS_PHASER_READY_PROMISE__ = readyPayloadPromise.then((payload) => payload.bridge);
  return window.__ABYSS_PHASER_READY_PROMISE__;
}
