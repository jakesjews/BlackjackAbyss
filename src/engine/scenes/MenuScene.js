import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { MENU_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";
import {
  getMenuActions as getMenuActionsFromRuntime,
  isCoarsePointer as isCoarsePointerFromRuntime,
  isVisualFxDisabled as isVisualFxDisabledFromRuntime,
} from "./runtime-access.js";

const MENU_SPLASH_BUNDLED_URL = new URL("../../assets/splash_art.png", import.meta.url).href;
const MENU_SPLASH_KEY = "__menu-splash-art__";
const MENU_SPLASH_KEY_ALT = "__menu-splash-art-alt__";
const MENU_EMBER_TEXTURE_KEYS = ["__menu-ember-diamond__", "__menu-ember-shard__", "__menu-ember-tri__", "__menu-ember-chip__"];
const MENU_SPLASH_FALLBACK_KEY = "__menu-splash-fallback__";
const MENU_CANVAS_WIDTH = 512;
const MENU_CANVAS_HEIGHT = 768;
const MENU_FRAME_RADIUS = 24;
const MENU_BUTTON_SIZE_SCALE = 0.8625;
const MENU_BUTTON_FONT_SCALE = 0.55;
const EMBER_MIN_SIZE = 0.14;
const EMBER_MAX_SIZE = 1.48;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.menu);
    this.actionsPollEvent = null;
    this.keyboardHandlers = [];
    this.menuButtons = null;
    this.background = null;
    this.bgImage = null;
    this.frameOverlay = null;
    this.frameBorder = null;
    this.menuColumnContainer = null;
    this.title = null;
    this.buttonLayout = [];
    this.menuFrameRect = null;
    this.frameMaskShape = null;
    this.frameMask = null;
    this.emberSprites = [];
    this.introTweens = [];
    this.disableVisualFx = false;
  }

  preload() {
    if (!this.textures.exists(MENU_SPLASH_KEY)) {
      this.load.image(MENU_SPLASH_KEY, MENU_SPLASH_BUNDLED_URL);
    }
    if (!this.textures.exists(MENU_SPLASH_KEY_ALT)) {
      this.load.image(MENU_SPLASH_KEY_ALT, "/images/splash_art.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#081420");
    this.cameras.main.setAlpha(1);
    this.disableVisualFx = isVisualFxDisabledFromRuntime(this);
    this.buildMenuUi();
    this.bindKeyboardInput();
    this.onResize(this.scale.gameSize);
    this.refreshResumeAvailability();

    this.actionsPollEvent = this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => this.refreshResumeAvailability(),
    });

    this.scale.on("resize", this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  update(time, delta) {
    if (!this.menuFrameRect) {
      return;
    }
    if (!Array.isArray(this.emberSprites) || this.emberSprites.length === 0) {
      return;
    }
    const frame = this.menuFrameRect;
    const wind = Math.sin(time * 0.0012) * 0.9 + Math.sin(time * 0.0025 + 0.9) * 0.45;
    const deltaMs = Number.isFinite(delta) ? delta : 16.67;
    const dt = Phaser.Math.Clamp(deltaMs / 16.67, 0.35, 2.4);

    for (let i = 0; i < this.emberSprites.length; i += 1) {
      const ember = this.emberSprites[i];
      const state = ember?.emberState;
      if (!ember || !state) {
        continue;
      }

      const speedMult = (state.speedMult || 1) * 1.22;
      const wavePrimary = Math.sin(time * state.swaySpeed + state.phase) * state.swayAmount;
      const waveSecondary = Math.sin(time * (state.swaySpeed * 1.85) + state.phase * 1.7) * state.swayAmount * 0.85;
      const waveTertiary = Math.sin(time * (state.swaySpeed * 2.7) + state.phase * 2.25) * state.swayAmount * 0.34;
      const sway = (wavePrimary + waveSecondary + waveTertiary) * 1.18;
      ember.x += (state.vx + sway + wind * state.windInfluence) * dt * speedMult;
      ember.y += state.vy * dt * speedMult;
      ember.rotation += state.spin * dt;

      state.age += deltaMs;
      const lifeT = Phaser.Math.Clamp(state.age / state.life, 0, 1);
      const fadeIn = Phaser.Math.Clamp(lifeT / 0.24, 0, 1);
      const fadeOut = Phaser.Math.Clamp((1 - lifeT) / 0.48, 0, 1);
      const envelope = Math.min(fadeIn, fadeOut);
      const twinkle = 1.04 + Math.sin(time * state.twinkleSpeed + state.phase) * 0.08;
      const riseT = Phaser.Math.Clamp((frame.y + frame.height - ember.y) / (frame.height + 36), 0, 1);
      const riseTAdjusted = Phaser.Math.Clamp(riseT * 1.15, 0, 1);
      const altitudeFade = 0.18 + (1 - Math.pow(riseTAdjusted, 1.05)) * 0.82;
      ember.alpha = Phaser.Math.Clamp(state.baseAlpha * envelope * twinkle * altitudeFade, 0, 1);
      const sizePulse = 1 + Math.sin(time * state.scalePulseSpeed + state.phase * 0.7) * state.scalePulseAmount;
      ember.setScale(state.baseScale * (0.94 + envelope * 0.52) * 0.64 * sizePulse);

      if (
        lifeT >= 1 ||
        ember.y < frame.y - 34 ||
        ember.x < frame.x - 42 ||
        ember.x > frame.x + frame.width + 42
      ) {
        this.resetEmberSprite(ember, frame, true);
      }
    }
  }

  teardown() {
    this.scale.off("resize", this.onResize, this);
    this.keyboardHandlers.forEach(({ eventName, handler }) => {
      this.input.keyboard?.off(eventName, handler);
    });
    this.keyboardHandlers = [];
    if (this.actionsPollEvent) {
      this.actionsPollEvent.remove(false);
      this.actionsPollEvent = null;
    }
    if (Array.isArray(this.introTweens) && this.introTweens.length > 0) {
      this.introTweens.forEach((tween) => tween?.stop?.());
      this.introTweens = [];
    }
    if (Array.isArray(this.emberSprites) && this.emberSprites.length > 0) {
      this.emberSprites.forEach((ember) => ember?.destroy?.());
      this.emberSprites = [];
    }
    if (this.frameMaskShape) {
      this.frameMaskShape.destroy();
      this.frameMaskShape = null;
      this.frameMask = null;
    }
    this.menuColumnContainer = null;
    this.menuFrameRect = null;
  }

  ensureMenuParticleTexture() {
    const hasAllEmberTextures = MENU_EMBER_TEXTURE_KEYS.every((key) => this.textures.exists(key));
    if (hasAllEmberTextures) {
      return;
    }
    const size = 20;
    const center = size * 0.5;
    const drawPoly = (gfx, points, alpha, color = 0xff9a3c) => {
      gfx.fillStyle(color, alpha);
      gfx.beginPath();
      gfx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) {
        gfx.lineTo(points[i], points[i + 1]);
      }
      gfx.closePath();
      gfx.fillPath();
    };
    const drawBaseGlow = (gfx) => {
      gfx.fillStyle(0xff7a24, 0.24);
      gfx.fillCircle(center, center, 8.8);
      gfx.fillStyle(0xffc165, 0.42);
      gfx.fillCircle(center, center, 5.4);
    };
    const definitions = [
      {
        key: MENU_EMBER_TEXTURE_KEYS[0],
        draw: (gfx) => {
          drawBaseGlow(gfx);
          drawPoly(gfx, [center, center - 6, center + 3.7, center, center, center + 6, center - 3.7, center], 0.4, 0xff9a3c);
          drawPoly(gfx, [center, center - 3.7, center + 2.2, center, center, center + 3.7, center - 2.2, center], 1, 0xfff4d2);
        },
      },
      {
        key: MENU_EMBER_TEXTURE_KEYS[1],
        draw: (gfx) => {
          drawBaseGlow(gfx);
          drawPoly(gfx, [center - 5.8, center + 2.7, center + 4.8, center - 4.4, center + 6.1, center - 1.8, center - 4.4, center + 5.2], 0.4, 0xff8d34);
          drawPoly(gfx, [center - 3.2, center + 2.1, center + 2.9, center - 2.2, center + 3.8, center - 0.5, center - 2.5, center + 3.1], 1, 0xffefc7);
        },
      },
      {
        key: MENU_EMBER_TEXTURE_KEYS[2],
        draw: (gfx) => {
          drawBaseGlow(gfx);
          drawPoly(gfx, [center, center - 6, center + 4.8, center + 4.2, center - 4.8, center + 4.2], 0.4, 0xff9a3c);
          drawPoly(gfx, [center, center - 3.5, center + 2.8, center + 2.4, center - 2.8, center + 2.4], 1, 0xfff3cf);
        },
      },
      {
        key: MENU_EMBER_TEXTURE_KEYS[3],
        draw: (gfx) => {
          drawBaseGlow(gfx);
          gfx.fillStyle(0xff8d34, 0.4);
          gfx.fillRoundedRect(center - 6, center - 2.4, 12, 4.8, 1.8);
          gfx.fillStyle(0xfff1cb, 1);
          gfx.fillRoundedRect(center - 3.6, center - 1.2, 7.2, 2.4, 1.2);
        },
      },
    ];
    definitions.forEach(({ key, draw }) => {
      if (this.textures.exists(key)) {
        return;
      }
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      draw(gfx);
      gfx.generateTexture(key, size, size);
      gfx.destroy();
    });
  }

  ensureMenuFallbackTexture() {
    if (this.textures.exists(MENU_SPLASH_FALLBACK_KEY)) {
      return;
    }
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillGradientStyle(0x2a2016, 0x2a2016, 0x1a140e, 0x1a140e, 1);
    gfx.fillRect(0, 0, 256, 360);
    gfx.fillStyle(0xefd6a8, 0.08);
    gfx.fillCircle(128, 150, 120);
    gfx.generateTexture(MENU_SPLASH_FALLBACK_KEY, 256, 360);
    gfx.destroy();
  }

  validTextureKey(key) {
    if (!key || !this.textures.exists(key)) {
      return false;
    }
    const texture = this.textures.get(key);
    const source =
      texture?.getSourceImage?.() ||
      texture?.source?.[0]?.image ||
      null;
    const width = Number(source?.width) || 0;
    const height = Number(source?.height) || 0;
    return width > 8 && height > 8;
  }

  resolveMenuSplashKey() {
    if (this.validTextureKey(MENU_SPLASH_KEY)) {
      return MENU_SPLASH_KEY;
    }
    if (this.validTextureKey(MENU_SPLASH_KEY_ALT)) {
      return MENU_SPLASH_KEY_ALT;
    }
    this.ensureMenuFallbackTexture();
    return MENU_SPLASH_FALLBACK_KEY;
  }

  buildMenuUi() {
    this.background = this.add.graphics().setDepth(-60);
    this.bgImage = this.add.image(0, 0, this.resolveMenuSplashKey()).setOrigin(0.5, 0.5).setDepth(-44);
    this.bgImage.setAlpha(1);

    this.frameOverlay = this.add.graphics().setDepth(-42);
    this.frameBorder = this.add.graphics().setDepth(-32);

    this.frameMaskShape = this.add.graphics().setDepth(-30).setVisible(false);
    this.frameMask = this.frameMaskShape.createGeometryMask();

    if (!this.disableVisualFx) {
      this.ensureMenuParticleTexture();
      this.syncEmberField({
        x: 0,
        y: 0,
        width: this.scale.gameSize.width,
        height: this.scale.gameSize.height,
      });
    }

    this.title = this.add
      .text(0, 0, "BLACKJACK\nABYSS", {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "82px",
        fontStyle: "700",
        color: "#f6e6a6",
        align: "center",
        lineSpacing: -8,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);
    this.title.setShadow(0, 6, "#04060a", 12, true, true);

    this.menuButtons = {
      newRun: this.createMenuButton("NEW RUN", () => this.runMenuAction("startRun")),
      resume: this.createMenuButton("RESUME", () => this.runMenuAction("resumeRun")),
      collection: this.createMenuButton("COLLECTIONS", () => this.runMenuAction("openCollection")),
    };

    this.menuColumnContainer = this.add.container(0, 0).setDepth(20);
    this.menuColumnContainer.add(this.title);
    this.menuColumnContainer.add(this.menuButtons.newRun.container);
    this.menuColumnContainer.add(this.menuButtons.resume.container);
    this.menuColumnContainer.add(this.menuButtons.collection.container);
  }

  syncEmberField(frame) {
    if (this.disableVisualFx) {
      while (this.emberSprites.length > 0) {
        const ember = this.emberSprites.pop();
        ember?.destroy?.();
      }
      return;
    }

    const safeFrame = frame || {
      x: 0,
      y: 0,
      width: this.scale.gameSize.width,
      height: this.scale.gameSize.height,
    };
    const area = Math.max(1, safeFrame.width * safeFrame.height);
    const targetCount = Phaser.Math.Clamp(Math.round(area / 10000), 18, 44);
    const emberPalette = [0xff9a35, 0xffa743, 0xffb650, 0xffc56a, 0xffd786];

    while (this.emberSprites.length < targetCount) {
      const textureKey = Phaser.Utils.Array.GetRandom(MENU_EMBER_TEXTURE_KEYS);
      const ember = this.add
        .image(0, 0, textureKey)
        .setDepth(19)
        .setBlendMode(Phaser.BlendModes.NORMAL);
      ember.emberPalette = emberPalette;
      this.emberSprites.push(ember);
    }
    while (this.emberSprites.length > targetCount) {
      const ember = this.emberSprites.pop();
      ember?.destroy?.();
    }

    this.emberSprites.forEach((ember) => {
      if (!ember?.emberState) {
        this.resetEmberSprite(ember, safeFrame, false);
        return;
      }
      const margin = 72;
      if (
        ember.x < safeFrame.x - margin ||
        ember.x > safeFrame.x + safeFrame.width + margin ||
        ember.y < safeFrame.y - margin ||
        ember.y > safeFrame.y + safeFrame.height + margin
      ) {
        this.resetEmberSprite(ember, safeFrame, false);
      }
    });
  }

  resetEmberSprite(ember, frame, fromBottom) {
    if (!ember || !frame) {
      return;
    }
    const spawnFromBottom = true;
    const x = Phaser.Math.Between(Math.round(frame.x + 10), Math.round(frame.x + frame.width - 10));
    const bottomEdgeMinY = Math.round(frame.y + frame.height - 8);
    const bottomEdgeMaxY = Math.round(frame.y + frame.height + 22);
    const y = Phaser.Math.Between(bottomEdgeMinY, bottomEdgeMaxY);
    const sizeRoll = Math.random();
    const size =
      sizeRoll < 0.72
        ? Phaser.Math.FloatBetween(EMBER_MIN_SIZE, 0.42)
        : sizeRoll < 0.96
          ? Phaser.Math.FloatBetween(0.42, 0.88)
          : Phaser.Math.FloatBetween(0.88, EMBER_MAX_SIZE);
    const palette = ember.emberPalette || [0xff9a35, 0xffa743, 0xffb650, 0xffc56a, 0xffd786];
    const tint = palette[Math.floor(Math.random() * palette.length)];
    const baseAlpha = Phaser.Math.FloatBetween(0.84, 1);
    const textureKey = Phaser.Utils.Array.GetRandom(MENU_EMBER_TEXTURE_KEYS);

    if (ember.texture?.key !== textureKey) {
      ember.setTexture(textureKey);
    }
    ember.setPosition(x, y);
    ember.setScale(size);
    ember.setTint(tint);
    ember.alpha = 0;
    const sizeT = Phaser.Math.Clamp((size - EMBER_MIN_SIZE) / (EMBER_MAX_SIZE - EMBER_MIN_SIZE), 0, 1);
    const speedBySize = Phaser.Math.Linear(2.6, 0.48, sizeT);
    ember.emberState = {
      baseAlpha,
      baseScale: size,
      vx: Phaser.Math.FloatBetween(-0.38, 0.38),
      vy: Phaser.Math.FloatBetween(-4.2, -0.7),
      swayAmount: Phaser.Math.FloatBetween(0.42, 1.45),
      swaySpeed: Phaser.Math.FloatBetween(0.0016, 0.0058),
      windInfluence: Phaser.Math.FloatBetween(0.14, 0.48),
      twinkleSpeed: Phaser.Math.FloatBetween(0.0019, 0.0052),
      spin: Phaser.Math.FloatBetween(-0.02, 0.02),
      phase: Math.random() * Math.PI * 2,
      scalePulseAmount: Phaser.Math.FloatBetween(0.03, 0.14),
      scalePulseSpeed: Phaser.Math.FloatBetween(0.0012, 0.0046),
      speedMult: speedBySize * Phaser.Math.FloatBetween(0.82, 1.18),
      life: Phaser.Math.Between(7000, 14500),
      age: 0,
    };
    if (!fromBottom) {
      ember.emberState.age = Phaser.Math.Between(
        Math.round(ember.emberState.life * 0.12),
        Math.round(ember.emberState.life * 0.28)
      );
    } else {
      ember.emberState.age = Phaser.Math.Between(
        Math.round(ember.emberState.life * 0.18),
        Math.round(ember.emberState.life * 0.32)
      );
    }
  }

  playIntroAnimation() {
    if (this.title) {
      this.title.setAlpha(1);
      this.title.setScale(1);
    }
    ["newRun", "resume", "collection"].forEach((key) => {
      const button = this.menuButtons?.[key];
      if (button?.container) {
        button.container.setAlpha(1);
        button.container.setScale(1);
      }
    });
  }

  createMenuButton(label, onPress) {
    return createGradientButton(this, {
      id: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      styleSet: MENU_BUTTON_STYLE,
      onPress,
      fontStyle: "900",
      width: Math.round(286 * MENU_BUTTON_SIZE_SCALE),
      height: Math.round(56 * MENU_BUTTON_SIZE_SCALE),
      fontSize: Math.max(12, Math.round(28 * MENU_BUTTON_FONT_SCALE)),
    });
  }

  bindKeyboardInput() {
    if (!this.input.keyboard) {
      return;
    }
    const bind = (eventName, handler) => {
      this.input.keyboard.on(eventName, handler);
      this.keyboardHandlers.push({ eventName, handler });
    };

    bind("keydown-ENTER", () => this.runMenuAction("startRun"));
    bind("keydown-R", () => this.runMenuAction("resumeRun"));
    bind("keydown-A", () => this.runMenuAction("openCollection"));
  }

  setButtonEnabled(button, enabled) {
    if (!button) {
      return;
    }
    const active = Boolean(enabled);
    button.enabled = active;
    button.container.setAlpha(active ? 1 : 0.7);
    applyGradientButtonStyle(button, active ? "idle" : "disabled");
  }

  refreshResumeAvailability() {
    const actions = getMenuActionsFromRuntime(this);
    const hasSavedRun = actions && typeof actions.hasSavedRun === "function" ? Boolean(actions.hasSavedRun()) : false;
    this.setButtonEnabled(this.menuButtons?.resume, hasSavedRun);
  }

  runMenuAction(actionName) {
    const actions = getMenuActionsFromRuntime(this);
    const action = actions ? actions[actionName] : null;
    if (typeof action !== "function") {
      return;
    }
    action();
  }

  shouldUseFullscreenMobileMenu(width = this.scale.gameSize.width) {
    const viewportWidth = Number(width) || 0;
    const coarsePointer = isCoarsePointerFromRuntime(this);
    return coarsePointer || viewportWidth <= 980;
  }

  containSizeForTexture(textureKey, boundsW, boundsH) {
    const texture = this.textures.get(textureKey);
    const source = texture?.source?.[0];
    const sourceW = Math.max(1, Number(source?.width) || Number(texture?.getSourceImage?.()?.width) || 1);
    const sourceH = Math.max(1, Number(source?.height) || Number(texture?.getSourceImage?.()?.height) || 1);
    const scale = Math.min(boundsW / sourceW, boundsH / sourceH);
    return {
      width: sourceW * scale,
      height: sourceH * scale,
    };
  }

  coverSizeForTexture(textureKey, boundsW, boundsH) {
    const texture = this.textures.get(textureKey);
    const source = texture?.source?.[0];
    const sourceW = Math.max(1, Number(source?.width) || Number(texture?.getSourceImage?.()?.width) || 1);
    const sourceH = Math.max(1, Number(source?.height) || Number(texture?.getSourceImage?.()?.height) || 1);
    const scale = Math.max(boundsW / sourceW, boundsH / sourceH);
    return {
      width: sourceW * scale,
      height: sourceH * scale,
    };
  }

  onResize(gameSize) {
    const width =
      (gameSize && Number.isFinite(gameSize.width) ? gameSize.width : null) ||
      this.scale.gameSize.width;
    const height =
      (gameSize && Number.isFinite(gameSize.height) ? gameSize.height : null) ||
      this.scale.gameSize.height;
    const centerX = width * 0.5;

    this.background.clear();
    this.background.fillGradientStyle(0x081420, 0x081420, 0x040b12, 0x040b12, 1);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0x2f5c7b, 0.04);
    this.background.fillCircle(centerX, height * 0.34, height * 0.58);

    const frameX = 0;
    const frameY = 0;
    const frameW = Math.max(1, Math.round(width));
    const frameH = Math.max(1, Math.round(height));
    this.menuFrameRect = { x: frameX, y: frameY, width: frameW, height: frameH };

    if (this.bgImage) {
      const textureKey = this.bgImage.texture?.key || this.resolveMenuSplashKey();
      const fitToViewport = this.shouldUseFullscreenMobileMenu(width)
        ? this.coverSizeForTexture(textureKey, frameW, frameH)
        : this.containSizeForTexture(textureKey, frameW, frameH);
      this.bgImage.setPosition(centerX, frameY + frameH * 0.5);
      this.bgImage.setDisplaySize(fitToViewport.width, fitToViewport.height);
      this.bgImage.setAlpha(1);
      if (this.bgImage.mask && typeof this.bgImage.clearMask === "function") {
        this.bgImage.clearMask(true);
      }
    }

    if (this.frameMaskShape) {
      this.frameMaskShape.clear();
      this.frameMaskShape.fillStyle(0xffffff, 1);
      this.frameMaskShape.fillRoundedRect(frameX, frameY, frameW, frameH, MENU_FRAME_RADIUS);
    }

    this.frameOverlay.clear();
    const centerFadeY = frameY + frameH * 0.46;
    const centerFadeH = Math.max(1, frameY + frameH - centerFadeY);
    const steps = 26;
    const bandH = centerFadeH / steps;
    for (let i = 0; i < steps; i += 1) {
      const t = i / Math.max(1, steps - 1);
      const alpha = Math.pow(t, 1.25) * 0.56;
      this.frameOverlay.fillStyle(0x050a12, alpha);
      this.frameOverlay.fillRect(frameX, centerFadeY + i * bandH, frameW, Math.ceil(bandH + 1));
    }

    this.frameBorder.clear();
    this.frameBorder.lineStyle(1.8, 0xbedff6, 0.42);
    this.frameBorder.strokeRoundedRect(frameX, frameY, frameW, frameH, MENU_FRAME_RADIUS);

    this.syncEmberField(this.menuFrameRect);

    const layoutPadX = Math.max(18, Math.round(frameW * 0.1));
    const layoutPadTop = Math.max(20, Math.round(frameH * 0.08));
    const layoutPadBottom = Math.max(20, Math.round(frameH * 0.075));
    const layoutX = frameX + layoutPadX;
    const layoutY = frameY + layoutPadTop;
    const layoutW = Math.max(120, frameW - layoutPadX * 2);
    const layoutH = Math.max(120, frameH - layoutPadTop - layoutPadBottom);

    if (this.menuColumnContainer) {
      this.menuColumnContainer.setPosition(layoutX, layoutY);
    }

    const titleSizeBase = Math.max(44, Math.min(82, Math.round(layoutW * 0.22)));
    const titleSize = Math.max(28, Math.round(titleSizeBase * 0.75));
    const titleStackOffset = Math.max(14, Math.round(layoutH * 0.06));
    let titleBaseY = Math.round(layoutH * 0.16);
    if (this.title) {
      this.title.setScale(1);
      this.title.setFontSize(titleSize);
      const maxTitleW = Math.max(120, layoutW * 0.92);
      if (this.title.width > maxTitleW) {
        const titleScale = Phaser.Math.Clamp(maxTitleW / this.title.width, 0.62, 1);
        this.title.setScale(titleScale);
      }
      titleBaseY = Math.round(this.title.height * 0.5 + titleStackOffset);
      this.title.setPosition(layoutW * 0.5, titleBaseY);
    }

    const baseWidth = Math.max(238, Math.min(304, Math.round(layoutW * 0.92)));
    const baseHeight = Math.max(50, Math.min(62, Math.round(layoutH * 0.1)));
    const buttonWidth = Math.max(120, Math.round(baseWidth * MENU_BUTTON_SIZE_SCALE));
    const buttonHeight = Math.max(32, Math.round(baseHeight * MENU_BUTTON_SIZE_SCALE));
    const baseFontSize = Math.max(24, Math.min(31, Math.round(buttonHeight * 0.54 / MENU_BUTTON_SIZE_SCALE)));
    const buttonFontSize = Math.max(12, Math.round(baseFontSize * MENU_BUTTON_FONT_SCALE));
    const stackGap = Math.max(8, Math.round(buttonHeight * 0.4));
    const titleBottom = this.title ? titleBaseY + this.title.height * 0.5 : Math.round(layoutH * 0.24);
    const topGap = Math.max(10, Math.round(layoutH * 0.045));
    const newRunBaseY = Math.round(titleBottom + topGap + buttonHeight * 0.5);
    const resumeBaseY = newRunBaseY + buttonHeight + stackGap;
    const bottomPad = Math.max(10, Math.round(layoutH * 0.045));
    const collectionY = Math.round(layoutH - bottomPad - buttonHeight * 0.5);
    const requestedStackShift = Math.round(frameH * 0.25);
    const maxStackShift = Math.max(0, collectionY - (resumeBaseY + buttonHeight + stackGap));
    const stackShift = Math.min(requestedStackShift, maxStackShift);
    const newRunY = newRunBaseY + stackShift;
    const resumeY = resumeBaseY + stackShift;
    if (this.title) {
      this.title.setY(titleBaseY + stackShift);
    }

    const layoutForButton = (button, localY) => {
      if (!button) {
        return;
      }
      button.container.setPosition(layoutW * 0.5, localY);
      setGradientButtonSize(button, buttonWidth, buttonHeight);
      button.text.setFontSize(buttonFontSize);
    };

    layoutForButton(this.menuButtons?.newRun, newRunY);
    layoutForButton(this.menuButtons?.resume, resumeY);
    layoutForButton(this.menuButtons?.collection, collectionY);
  }
}
