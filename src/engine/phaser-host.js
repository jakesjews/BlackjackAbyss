import Phaser from "phaser";

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
let stepHandler = null;

class HostScene extends Phaser.Scene {
  constructor() {
    super("host");
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
  }

  update(time, delta) {
    if (typeof stepHandler === "function") {
      stepHandler(Math.max(0, delta) / 1000, time);
    }
  }
}

export function createPhaserHost() {
  if (window.__ABYSS_PHASER_READY_PROMISE__) {
    return window.__ABYSS_PHASER_READY_PROMISE__;
  }

  const shell = document.getElementById("game-shell");
  if (!shell) {
    throw new Error("Phaser host requires #game-shell");
  }

  const readyPromise = new Promise((resolve) => {
    const bridge = {
      setStepHandler(handler) {
        stepHandler = typeof handler === "function" ? handler : null;
      },
      getCanvas() {
        return window.__ABYSS_PHASER_GAME__?.canvas || null;
      },
    };

    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: shell,
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      scene: [HostScene],
      transparent: true,
      backgroundColor: "#000000",
      render: {
        antialias: true,
        clearBeforeRender: false,
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
          }
          window.__ABYSS_PHASER_GAME__ = bootedGame;
          window.__ABYSS_PHASER_BRIDGE__ = bridge;
          resolve(bridge);
        },
      },
    });

    window.__ABYSS_PHASER_GAME__ = game;
  });

  window.__ABYSS_PHASER_READY_PROMISE__ = readyPromise;
  return readyPromise;
}
