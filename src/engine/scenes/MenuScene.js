import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { MENU_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";

const MENU_SPLASH_KEY = "__menu-splash-art__";
const MENU_PARTICLE_KEY = "__menu-particle__";
const MENU_FRAME_BASE_WIDTH = 464;
const MENU_FRAME_BASE_HEIGHT = 698;
const MENU_FRAME_SCALE_BOOST = 1.25;
const MENU_FRAME_RADIUS = 24;

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
    this.title = null;
    this.buttonLayout = [];
    this.frameMaskShape = null;
    this.frameMask = null;
    this.moteEmitter = null;
    this.sparkEmitterLeft = null;
    this.sparkEmitterRight = null;
    this.introTweens = [];
  }

  preload() {
    if (!this.textures.exists(MENU_SPLASH_KEY)) {
      this.load.image(MENU_SPLASH_KEY, "/images/splash_art.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#081420");
    this.cameras.main.setAlpha(1);
    this.hideLegacyMenuDom();
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

  teardown() {
    document.body.classList.remove("menu-screen");
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
    if (this.moteEmitter) {
      this.moteEmitter.destroy();
      this.moteEmitter = null;
    }
    if (this.sparkEmitterLeft) {
      this.sparkEmitterLeft.destroy();
      this.sparkEmitterLeft = null;
    }
    if (this.sparkEmitterRight) {
      this.sparkEmitterRight.destroy();
      this.sparkEmitterRight = null;
    }
    if (this.frameMaskShape) {
      this.frameMaskShape.destroy();
      this.frameMaskShape = null;
      this.frameMask = null;
    }
  }

  hideLegacyMenuDom() {
    document.body.classList.add("menu-screen");
    const menuHome = document.getElementById("menu-home");
    if (menuHome) {
      menuHome.hidden = true;
    }
    const topRight = document.getElementById("top-right-actions");
    if (topRight) {
      topRight.hidden = true;
    }
    const mobileControls = document.getElementById("mobile-controls");
    if (mobileControls) {
      mobileControls.classList.remove("active");
    }
    const overlays = ["logs-modal", "collection-modal", "passive-modal", "passive-tooltip", "topbar-tooltip"];
    overlays.forEach((id) => {
      const node = document.getElementById(id);
      if (node) {
        node.hidden = true;
      }
    });
  }

  ensureMenuParticleTexture() {
    if (this.textures.exists(MENU_PARTICLE_KEY)) {
      return;
    }
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture(MENU_PARTICLE_KEY, 12, 12);
    gfx.destroy();
  }

  buildMenuUi() {
    this.background = this.add.graphics().setDepth(-60);
    this.bgImage = this.add.image(0, 0, MENU_SPLASH_KEY).setOrigin(0.5, 0.5).setDepth(-44);
    this.bgImage.setAlpha(0.97);

    this.frameOverlay = this.add.graphics().setDepth(-34);
    this.frameBorder = this.add.graphics().setDepth(-32);

    this.frameMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
    this.frameMask = this.frameMaskShape.createGeometryMask();
    this.bgImage.setMask(this.frameMask);

    this.ensureMenuParticleTexture();
    this.moteEmitter = this.add
      .particles(0, 0, MENU_PARTICLE_KEY, {
      frequency: 120,
      quantity: 1,
      lifespan: { min: 3600, max: 6400 },
      speedX: { min: -20, max: 20 },
      speedY: { min: -80, max: -26 },
      scale: { start: 0.22, end: 0.02 },
      alpha: { start: 0.45, end: 0 },
      tint: [0xfff1cc, 0xffd18f, 0xff9959],
      })
      .setDepth(-38)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.sparkEmitterLeft = this.add
      .particles(0, 0, MENU_PARTICLE_KEY, {
      frequency: 360,
      quantity: 1,
      lifespan: { min: 500, max: 980 },
      speedX: { min: 90, max: 170 },
      speedY: { min: -72, max: -24 },
      scale: { start: 0.22, end: 0.02 },
      alpha: { start: 0.92, end: 0 },
      tint: [0xfff2c8, 0xffc07b, 0xff8a4a],
      })
      .setDepth(-36)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.sparkEmitterRight = this.add
      .particles(0, 0, MENU_PARTICLE_KEY, {
      frequency: 360,
      quantity: 1,
      lifespan: { min: 500, max: 980 },
      speedX: { min: -170, max: -90 },
      speedY: { min: -72, max: -24 },
      scale: { start: 0.22, end: 0.02 },
      alpha: { start: 0.92, end: 0 },
      tint: [0xfff2c8, 0xffc07b, 0xff8a4a],
      })
      .setDepth(-36)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.moteEmitter.setMask(this.frameMask);
    this.sparkEmitterLeft.setMask(this.frameMask);
    this.sparkEmitterRight.setMask(this.frameMask);

    this.title = this.add
      .text(0, 0, "BLACKJACK ABYSS", {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "82px",
        fontStyle: "700",
        color: "#f6e6a6",
        stroke: "#0f1b28",
        strokeThickness: 7,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    this.menuButtons = {
      newRun: this.createMenuButton("NEW RUN", () => this.runMenuAction("startRun")),
      resume: this.createMenuButton("RESUME", () => this.runMenuAction("resumeRun")),
      collection: this.createMenuButton("COLLECTIONS", () => this.runMenuAction("openCollection")),
    };
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
      width: 286,
      height: 56,
      fontSize: 28,
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
    bind("keydown-C", () => this.runMenuAction("openCollection"));
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
    const actions = this.getMenuActions();
    const hasSavedRun = actions && typeof actions.hasSavedRun === "function" ? Boolean(actions.hasSavedRun()) : false;
    this.setButtonEnabled(this.menuButtons?.resume, hasSavedRun);
  }

  runMenuAction(actionName) {
    const actions = this.getMenuActions();
    const action = actions ? actions[actionName] : null;
    if (typeof action !== "function") {
      return;
    }
    action();
  }

  getMenuActions() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const bridge = runtime?.legacyAdapter?.bridge || null;
    if (!bridge || typeof bridge.getMenuActions !== "function") {
      return null;
    }
    return bridge.getMenuActions();
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
    this.background.fillStyle(0x2f5c7b, 0.1);
    this.background.fillCircle(centerX, height * 0.34, height * 0.58);

    let frameW = Math.round(MENU_FRAME_BASE_WIDTH * MENU_FRAME_SCALE_BOOST);
    let frameH = Math.round(MENU_FRAME_BASE_HEIGHT * MENU_FRAME_SCALE_BOOST);
    const fitScale = Math.min((width - 28) / frameW, (height - 18) / frameH, 1);
    frameW = Math.max(280, Math.round(frameW * fitScale));
    frameH = Math.max(420, Math.round(frameH * fitScale));
    if (frameW > width - 20) {
      frameW = width - 20;
      frameH = Math.round((frameW / MENU_FRAME_BASE_WIDTH) * MENU_FRAME_BASE_HEIGHT);
    }
    if (frameH > height - 10) {
      frameH = height - 10;
      frameW = Math.round((frameH / MENU_FRAME_BASE_HEIGHT) * MENU_FRAME_BASE_WIDTH);
    }

    const frameX = Math.round(centerX - frameW * 0.5);
    const frameY = Math.round(height * 0.5 - frameH * 0.5);

    this.bgImage.setPosition(centerX, frameY + frameH * 0.5);
    this.bgImage.setDisplaySize(frameW, frameH);

    this.frameMaskShape.clear();
    this.frameMaskShape.fillStyle(0xffffff, 1);
    this.frameMaskShape.fillRoundedRect(frameX, frameY, frameW, frameH, MENU_FRAME_RADIUS);

    this.frameOverlay.clear();
    this.frameOverlay.fillGradientStyle(0x050a12, 0x050a12, 0x050a12, 0x050a12, 0.06, 0.06, 0.84, 0.84);
    this.frameOverlay.fillRoundedRect(frameX, frameY, frameW, frameH, MENU_FRAME_RADIUS);

    this.frameBorder.clear();
    this.frameBorder.lineStyle(1.8, 0xbedff6, 0.42);
    this.frameBorder.strokeRoundedRect(frameX, frameY, frameW, frameH, MENU_FRAME_RADIUS);

    if (this.moteEmitter) {
      this.moteEmitter.setEmitZone({
        type: "random",
        source: new Phaser.Geom.Rectangle(frameX + 6, frameY + 6, Math.max(12, frameW - 12), Math.max(12, frameH - 12)),
      });
    }
    if (this.sparkEmitterLeft) {
      this.sparkEmitterLeft.setPosition(frameX - 10, frameY + frameH * 0.84);
    }
    if (this.sparkEmitterRight) {
      this.sparkEmitterRight.setPosition(frameX + frameW + 10, frameY + frameH * 0.84);
    }

    if (this.title) {
      this.title.setPosition(centerX, frameY + frameH * 0.2);
      const size = Math.max(48, Math.min(92, Math.round(frameW * 0.16)));
      this.title.setFontSize(size);
    }

    this.buttonLayout = [
      { key: "newRun", y: frameY + frameH * 0.63 },
      { key: "resume", y: frameY + frameH * 0.74 },
      { key: "collection", y: frameY + frameH * 0.85 },
    ];

    this.buttonLayout.forEach(({ key, y }) => {
      const button = this.menuButtons?.[key];
      if (!button) {
        return;
      }
      button.container.setPosition(centerX, y);
      const buttonWidth = Math.max(238, Math.min(304, Math.round(frameW * 0.58)));
      const buttonHeight = Math.max(50, Math.min(62, Math.round(frameH * 0.082)));
      setGradientButtonSize(button, buttonWidth, buttonHeight);
      button.text.setFontSize(Math.max(24, Math.min(31, Math.round(buttonHeight * 0.54))));
    });
  }
}
