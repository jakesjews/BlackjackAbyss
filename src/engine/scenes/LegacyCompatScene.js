import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";

export class LegacyCompatScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.legacyCompat);
    this.detachInputListeners = null;
    this.surfaceTextureKey = "__legacy-runtime-surface__";
    this.surfaceTexture = null;
    this.surfaceImage = null;
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    this.detachInputListeners = this.attachLegacyInput();
    this.attachLegacyRenderSurface();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (typeof this.detachInputListeners === "function") {
        this.detachInputListeners();
      }
      this.detachInputListeners = null;
      this.scale.off("resize", this.onScaleResize, this);
      if (this.surfaceImage) {
        this.surfaceImage.destroy();
        this.surfaceImage = null;
      }
      this.surfaceTexture = null;
    });
  }

  update(time, delta) {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    if (runtime?.legacyAdapter) {
      runtime.legacyAdapter.tick(delta, time);
    }
    if (this.surfaceTexture) {
      this.surfaceTexture.refresh();
    }
  }

  attachLegacyInput() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const adapter = runtime?.legacyAdapter || null;
    if (!adapter) {
      return null;
    }

    const unsubs = [];
    const on = (emitter, eventName, handler) => {
      emitter.on(eventName, handler);
      unsubs.push(() => emitter.off(eventName, handler));
    };

    on(this.input, "pointerdown", (pointer) => adapter.dispatchPointerDown(pointer));
    on(this.input, "pointermove", (pointer) => adapter.dispatchPointerMove(pointer));
    on(this.input, "pointerup", (pointer) => adapter.dispatchPointerUp(pointer));
    on(this.input, "pointerupoutside", (pointer) => adapter.dispatchPointerUp(pointer));
    on(this.input, "gameout", (pointer) => adapter.dispatchPointerCancel(pointer));

    if (this.input.keyboard) {
      on(this.input.keyboard, "keydown", (event) => adapter.dispatchKeyDown(event));
    }

    return () => {
      while (unsubs.length > 0) {
        const off = unsubs.pop();
        try {
          off();
        } catch {
          // Keep teardown best-effort.
        }
      }
    };
  }

  attachLegacyRenderSurface() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const adapter = runtime?.legacyAdapter || null;
    const renderCanvas =
      adapter && adapter.bridge && typeof adapter.bridge.getRenderCanvas === "function"
        ? adapter.bridge.getRenderCanvas()
        : null;
    if (!renderCanvas) {
      return;
    }

    if (this.textures.exists(this.surfaceTextureKey)) {
      this.textures.remove(this.surfaceTextureKey);
    }
    this.surfaceTexture = this.textures.addCanvas(this.surfaceTextureKey, renderCanvas);
    this.surfaceImage = this.add.image(0, 0, this.surfaceTextureKey).setOrigin(0, 0);
    this.surfaceImage.setDepth(-1000);
    this.onScaleResize(this.scale.gameSize);
    this.scale.on("resize", this.onScaleResize, this);
  }

  onScaleResize(gameSize) {
    if (!this.surfaceImage) {
      return;
    }
    const width =
      (gameSize && Number.isFinite(gameSize.width) ? gameSize.width : null) ||
      this.scale.gameSize.width;
    const height =
      (gameSize && Number.isFinite(gameSize.height) ? gameSize.height : null) ||
      this.scale.gameSize.height;
    this.surfaceImage.setDisplaySize(width, height);
  }
}
