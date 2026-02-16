import Phaser from "phaser";

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
const HOST_ROOT_ID = "phaser-runtime-root";

class HostScene extends Phaser.Scene {
  constructor() {
    super("host");
  }

  create() {
    // Scene placeholder for incremental migration from legacy runtime.
  }
}

export function createPhaserHost() {
  if (window.__ABYSS_PHASER_GAME__) {
    return window.__ABYSS_PHASER_GAME__;
  }

  let hostRoot = document.getElementById(HOST_ROOT_ID);
  if (!hostRoot) {
    hostRoot = document.createElement("div");
    hostRoot.id = HOST_ROOT_ID;
    Object.assign(hostRoot.style, {
      position: "fixed",
      left: "-10000px",
      top: "-10000px",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
    });
    document.body.appendChild(hostRoot);
  }

  const game = new Phaser.Game({
    // Run Phaser offscreen while legacy renderer remains active during migration.
    type: Phaser.CANVAS,
    parent: hostRoot,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    scene: [HostScene],
    transparent: true,
    backgroundColor: "#000000",
    render: {
      antialias: true,
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
    audio: {
      noAudio: true,
    },
    input: {
      keyboard: false,
      mouse: false,
      touch: false,
      gamepad: false,
    },
  });

  window.__ABYSS_PHASER_GAME__ = game;
  return game;
}
