import Phaser from "phaser";
import { BASE_HEIGHT, BASE_WIDTH, SCENE_KEYS } from "./constants.js";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { RunScene } from "./scenes/RunScene.js";
import { RewardScene } from "./scenes/RewardScene.js";
import { ShopScene } from "./scenes/ShopScene.js";
import { OverlayScene } from "./scenes/OverlayScene.js";

const EXTERNAL_RENDER_MODES = new Set(["menu", "playing", "reward", "shop", "collection", "gameover", "victory"]);

function createRuntimeContext() {
  let runtimeStepHandler = null;
  const runtime = {
    tick(deltaMs, timeMs) {
      if (typeof runtimeStepHandler !== "function") {
        return;
      }
      const safeDeltaSeconds = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0) / 1000;
      runtimeStepHandler(safeDeltaSeconds, Number.isFinite(timeMs) ? timeMs : performance.now());
    },
    setStepHandler(handler) {
      runtimeStepHandler = typeof handler === "function" ? handler : null;
    },
    apis: {
      menuActions: null,
      runApi: null,
      rewardApi: null,
      shopApi: null,
      overlayApi: null,
    },
    game: null,
    reportMode(mode) {
      syncPhaserScenesForMode(runtime.game, mode);
    },
    isExternalRendererActive(mode) {
      return typeof mode === "string" && EXTERNAL_RENDER_MODES.has(mode);
    },
  };

  return runtime;
}

function syncPhaserScenesForMode(game, mode) {
  if (typeof document !== "undefined" && document.body?.classList) {
    document.body.classList.toggle("menu-screen", mode === "menu");
  }

  const manager = game?.scene;
  if (!manager) {
    return;
  }
  const activeSceneKeys = [SCENE_KEYS.menu, SCENE_KEYS.run, SCENE_KEYS.reward, SCENE_KEYS.shop, SCENE_KEYS.overlay];
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
  if (window.__ABYSS_PHASER_RUNTIME_PROMISE__) {
    return window.__ABYSS_PHASER_RUNTIME_PROMISE__;
  }

  const shell = document.getElementById("game-shell");
  if (!shell) {
    throw new Error("Phaser app requires #game-shell");
  }

  const runtime = createRuntimeContext();
  const rendererResolution = Phaser.Math.Clamp(
    Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1,
    1,
    2
  );

  const readyPayloadPromise = new Promise((resolve) => {
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: shell,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      resolution: rendererResolution,
      scene: [BootScene, MenuScene, RunScene, RewardScene, ShopScene, OverlayScene],
      transparent: true,
      backgroundColor: "#000000",
      render: {
        antialias: true,
        roundPixels: false,
        clearBeforeRender: true,
        pixelArt: false,
        transparent: true,
        premultipliedAlpha: false,
      },
      scale: {
        mode: Phaser.Scale.NONE,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
        autoRound: false,
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
            canvas.style.imageRendering = "auto";
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              if ("imageSmoothingQuality" in ctx) {
                ctx.imageSmoothingQuality = "high";
              }
            }
          }
          runtime.game = bootedGame;
          bootedGame.__ABYSS_RUNTIME__ = runtime;

          window.__ABYSS_PHASER_GAME__ = bootedGame;
          window.__ABYSS_ENGINE_RUNTIME__ = runtime;
          resolve({
            runtime,
            game: bootedGame,
          });
        },
      },
    });

    runtime.game = game;
  });

  window.__ABYSS_PHASER_RUNTIME_PROMISE__ = readyPayloadPromise;
  return readyPayloadPromise;
}
