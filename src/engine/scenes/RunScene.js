import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";
import {
  applyBrownThemeToGraphics,
  createBrownTheme,
  toBrownThemeColorNumber,
  toBrownThemeTextStyle,
} from "./ui/brown-theme.js";
import {
  closeRunSceneModals,
  closeRunSceneTopModal,
  getRunSceneModalOpenOrder,
  setRunSceneLogsScroll,
  setRunSceneModalOpen,
  syncRunSceneModalBlocker,
  toggleRunSceneModal,
} from "./run/run-scene-modals.js";
import { drawRunSceneLogsModal, drawRunSceneRelicsModal } from "./run/run-scene-modal-renderers.js";
import { drawRunSceneCards } from "./run/run-scene-card-renderers.js";
import { drawRunSceneMessages } from "./run/run-scene-message-renderers.js";
import {
  rebuildRunSceneButtons,
  renderRunSceneButtons,
  renderRunSceneTopActions,
} from "./run/run-scene-action-renderers.js";
import {
  createTightTextureFromAlpha,
  resolveDarkIconTexture,
  resolveGoldIconTexture,
  resolveWatermarkTexture,
} from "./ui/texture-processing.js";
import {
  getRunApi as getRunApiFromRuntime,
  isCoarsePointer as isCoarsePointerFromRuntime,
  isVisualFxDisabled as isVisualFxDisabledFromRuntime,
  tickRuntime,
} from "./runtime-access.js";
import {
  ENEMY_AVATAR_KEY_BY_NAME,
  ENEMY_AVATAR_TEXTURE_PREFIX,
  RUN_ACTION_ICONS,
  RUN_ACTION_ICON_KEYS,
  RUN_BOTTOM_BAR_HEIGHT,
  RUN_CARD_BACKPLATE_KEY,
  RUN_CARD_HEIGHT_SCALE,
  RUN_CARD_SHADOW_KEY,
  RUN_CHIPS_ICON_KEY,
  RUN_CHIPS_ICON_TRIM_KEY,
  RUN_DEALER_CARD_ENTRY_MS,
  RUN_DEALER_CARD_FLIP_MS,
  RUN_ENEMY_DEFEAT_PULSE_INTERVAL_MS,
  RUN_ENEMY_DEFEAT_PULSE_STEPS,
  RUN_FIRE_CORE_PARTICLE_KEY,
  RUN_FIRE_GLOW_PARTICLE_KEY,
  RUN_LOG_RESOLUTION_RE,
  RUN_MOBILE_BUTTON_SCALE,
  RUN_MOBILE_HAND_GROUP_SCALE_BOOST,
  RUN_MODAL_BASE_DEPTH,
  RUN_PARTICLE_KEY,
  RUN_PLAYER_AVATAR_KEY,
  RUN_PRIMARY_GOLD,
  RUN_RELIC_ICON_KEY,
  RUN_SECONDARY_BUTTON_STYLE,
  RUN_THEME_BLUE_HUE_MAX,
  RUN_THEME_BLUE_HUE_MIN,
  RUN_THEME_BROWN_HUE,
  RUN_THEME_SATURATION_FLOOR,
  RUN_THEME_SATURATION_SCALE,
  RUN_TOP_ACTION_ICONS,
  RUN_TOP_ACTION_ICON_KEYS,
  RUN_TOP_ACTION_TOOLTIPS,
  RUN_TOP_BAR_HEIGHT,
  RUN_WATERMARK_ALPHA,
  RUN_WATERMARK_KEY,
  RUN_WATERMARK_RENDER_KEY,
  sanitizeEnemyAvatarKey,
} from "./run/run-scene-config.js";
const BUTTON_STYLES = ACTION_BUTTON_STYLE;
const RUN_BROWN_THEME = createBrownTheme({
  blueHueMin: RUN_THEME_BLUE_HUE_MIN,
  blueHueMax: RUN_THEME_BLUE_HUE_MAX,
  brownHue: RUN_THEME_BROWN_HUE,
  saturationScale: RUN_THEME_SATURATION_SCALE,
  saturationFloor: RUN_THEME_SATURATION_FLOOR,
  saturationOffset: 0,
  lightScale: 0.98,
  lightOffset: 0.02,
  patchFlag: "__runBrownThemePatched",
});

export class RunScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.run);
    this.graphics = null;
    this.textNodes = new Map();
    this.cardTextNodes = new Map();
    this.buttons = new Map();
    this.keyboardHandlers = [];
    this.buttonSignature = "";
    this.lastSnapshot = null;
    this.enemyPortrait = null;
    this.enemyPortraitMaskShape = null;
    this.enemyPortraitMask = null;
    this.playerPortrait = null;
    this.playerPortraitMaskShape = null;
    this.playerPortraitMask = null;
    this.introPortrait = null;
    this.introPortraitMaskShape = null;
    this.introPortraitMask = null;
    this.introButtonLayout = null;
    this.resultEmitter = null;
    this.lastResultSignature = "";
    this.introOverlayProgress = 0;
    this.cardAnimStates = new Map();
    this.cardAnimSeen = new Set();
    this.cardNodes = new Map();
    this.cardFlipStates = new Map();
    this.cardHiddenStateBySlot = new Map();
    this.rowCardCountByPrefix = new Map();
    this.nextGlobalDealStartAt = 0;
    this.cardDealSequenceId = 0;
    this.lastOpeningDealSignature = "";
    this.lastHandRenderSignature = "";
    this.handOpeningDealPending = false;
    this.prevCanDeal = false;
    this.topButtons = new Map();
    this.logsModalOpen = false;
    this.relicModalOpen = false;
    this.relicButton = null;
    this.logsCloseButton = null;
    this.relicCloseButton = null;
    this.introCtaButton = null;
    this.modalBlocker = null;
    this.overlayGraphics = null;
    this.modalOpenOrder = [];
    this.hudChipsIcon = null;
    this.darkIconTextureBySource = new Map();
    this.watermarkBackground = null;
    this.watermarkMaskShape = null;
    this.watermarkMask = null;
    this.fireTrailEmitter = null;
    this.fireImpactEmitter = null;
    this.enemyDefeatEmitter = null;
    this.enemyDefeatSignature = "";
    this.enemyDefeatBurstStep = -1;
    this.enemyDefeatLastPulseAt = 0;
    this.lastHpState = null;
    this.pointerHandlers = [];
    this.logsScrollIndex = 0;
    this.logsScrollMax = 0;
    this.logsLastCount = 0;
    this.logsPinnedToBottom = true;
    this.logsViewport = null;
    this.topActionTooltip = null;
    this.buttonEnabledState = new Map();
    this.buttonPulseTweens = new Map();
    this.disableVisualFx = false;
    this.avatarShake = {
      enemy: { until: 0, start: 0, duration: 0, magnitude: 0 },
      player: { until: 0, start: 0, duration: 0, magnitude: 0 },
    };
    this.activeResolutionAnimations = 0;
  }

  preload() {
    const avatarKeys = new Set(Object.values(ENEMY_AVATAR_KEY_BY_NAME));
    avatarKeys.forEach((avatarKey) => {
      const textureKey = `${ENEMY_AVATAR_TEXTURE_PREFIX}${avatarKey}`;
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, `/images/avatars/${avatarKey}.png`);
      }
    });
    Object.entries(RUN_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, RUN_ACTION_ICONS[actionId] || "/images/icons/deal.png");
      }
    });
    Object.entries(RUN_TOP_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, RUN_TOP_ACTION_ICONS[actionId] || "/images/icons/home.png");
      }
    });
    if (!this.textures.exists(RUN_CHIPS_ICON_KEY)) {
      this.load.image(RUN_CHIPS_ICON_KEY, "/images/icons/chips.png");
    }
    if (!this.textures.exists(RUN_RELIC_ICON_KEY)) {
      this.load.image(RUN_RELIC_ICON_KEY, "/images/icons/relic.png");
    }
    if (!this.textures.exists(RUN_PLAYER_AVATAR_KEY)) {
      this.load.image(RUN_PLAYER_AVATAR_KEY, "/images/avatars/player.png");
    }
    if (!this.textures.exists(RUN_CARD_BACKPLATE_KEY)) {
      this.load.image(RUN_CARD_BACKPLATE_KEY, "/images/backplates/backplate_default.png");
    }
    if (!this.textures.exists(RUN_WATERMARK_KEY)) {
      this.load.image(RUN_WATERMARK_KEY, "/images/watermark.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#171006");
    this.cameras.main.setAlpha(1);
    this.disableVisualFx = isVisualFxDisabledFromRuntime(this);
    this.graphics = applyBrownThemeToGraphics(this.add.graphics(), RUN_BROWN_THEME);
    this.overlayGraphics = applyBrownThemeToGraphics(this.add.graphics().setDepth(RUN_MODAL_BASE_DEPTH), RUN_BROWN_THEME);
    if (this.textures.exists(RUN_WATERMARK_KEY)) {
      const watermarkTexture = resolveWatermarkTexture(this, {
        sourceKey: RUN_WATERMARK_KEY,
        outputKey: RUN_WATERMARK_RENDER_KEY,
        alphaScale: RUN_WATERMARK_ALPHA,
      });
      this.watermarkBackground = this.add
        .image(this.scale.gameSize.width * 0.5, this.scale.gameSize.height * 0.5, watermarkTexture || RUN_WATERMARK_KEY)
        .setVisible(false)
        .setAlpha(1)
        .setBlendMode(Phaser.BlendModes.NORMAL)
        .setDepth(3);
      this.watermarkMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
      this.watermarkMask = this.watermarkMaskShape.createGeometryMask();
      this.watermarkBackground.setMask(this.watermarkMask);
    }
    const chipsIconKey = resolveGoldIconTexture(
      this,
      createTightTextureFromAlpha(this, {
        sourceKey: RUN_CHIPS_ICON_KEY,
        outputKey: RUN_CHIPS_ICON_TRIM_KEY,
      })
    );
    this.hudChipsIcon = this.add.image(0, 0, chipsIconKey).setVisible(false).setDepth(26);
    this.modalBlocker = this.add
      .zone(0, 0, 1, 1)
      .setOrigin(0, 0)
      .setDepth(RUN_MODAL_BASE_DEPTH + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });
    this.modalBlocker.on("pointerdown", () => {});
    this.ensureRunParticleTexture();
    this.ensureCardShadowTexture();

    this.enemyPortrait = this.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(16);
    this.enemyPortraitMaskShape = applyBrownThemeToGraphics(this.make.graphics({ x: 0, y: 0, add: false }), RUN_BROWN_THEME);
    this.enemyPortraitMask = this.enemyPortraitMaskShape.createGeometryMask();
    this.enemyPortrait.setMask(this.enemyPortraitMask);
    this.playerPortrait = this.add
      .image(0, 0, this.textures.exists(RUN_PLAYER_AVATAR_KEY) ? RUN_PLAYER_AVATAR_KEY : RUN_PARTICLE_KEY)
      .setVisible(false)
      .setAlpha(0.75)
      .setDepth(16);
    this.playerPortraitMaskShape = applyBrownThemeToGraphics(this.make.graphics({ x: 0, y: 0, add: false }), RUN_BROWN_THEME);
    this.playerPortraitMask = this.playerPortraitMaskShape.createGeometryMask();
    this.playerPortrait.setMask(this.playerPortraitMask);
    this.introPortrait = this.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(116);
    this.introPortraitMaskShape = applyBrownThemeToGraphics(this.make.graphics({ x: 0, y: 0, add: false }), RUN_BROWN_THEME);
    this.introPortraitMask = this.introPortraitMaskShape.createGeometryMask();
    this.introPortrait.setMask(this.introPortraitMask);

    this.resultEmitter = this.add
      .particles(0, 0, RUN_PARTICLE_KEY, {
        frequency: -1,
        quantity: 28,
        lifespan: { min: 460, max: 980 },
        speed: { min: 96, max: 280 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.34, end: 0.02 },
        alpha: { start: 0.94, end: 0 },
        tint: [0xf6e3ac, 0xffcb7f, 0xff8f59],
      })
      .setDepth(130)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.resultEmitter.stop();
    this.fireTrailEmitter = this.add
      .particles(0, 0, RUN_FIRE_CORE_PARTICLE_KEY, {
        frequency: -1,
        quantity: 10,
        lifespan: { min: 190, max: 360 },
        speed: { min: 24, max: 220 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.94, end: 0.08 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffebbd, 0xffbe63, 0xff7f2a, 0xff4a14],
      })
      .setDepth(118)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.fireTrailEmitter.stop();
    this.fireImpactEmitter = this.add
      .particles(0, 0, RUN_FIRE_GLOW_PARTICLE_KEY, {
        frequency: -1,
        quantity: 126,
        lifespan: { min: 340, max: 1080 },
        speed: { min: 170, max: 640 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.68, end: 0.06 },
        alpha: { start: 0.96, end: 0 },
        tint: [0xffedc2, 0xffcb75, 0xff8f36, 0xff4d17],
      })
      .setDepth(131)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.fireImpactEmitter.stop();
    this.enemyDefeatEmitter = this.add
      .particles(0, 0, RUN_PARTICLE_KEY, {
        frequency: -1,
        quantity: 26,
        lifespan: { min: 260, max: 920 },
        speed: { min: 84, max: 340 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.58, end: 0.04 },
        alpha: { start: 0.94, end: 0 },
        tint: [0xfff2ca, 0xffc579, 0xff8e47, 0xff5a2d],
      })
      .setDepth(134)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.enemyDefeatEmitter.stop();

    this.bindKeyboardInput();
    this.bindPointerInput();
    this.scale.on("resize", this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  teardown() {
    this.scale.off("resize", this.onResize, this);
    this.keyboardHandlers.forEach(({ eventName, handler }) => {
      this.input.keyboard?.off(eventName, handler);
    });
    this.keyboardHandlers = [];
    this.pointerHandlers.forEach(({ eventName, handler }) => {
      this.input.off(eventName, handler);
    });
    this.pointerHandlers = [];
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();
    this.buttonSignature = "";
    this.textNodes.forEach((node) => node.destroy());
    this.textNodes.clear();
    this.cardTextNodes.forEach((node) => node.destroy());
    this.cardTextNodes.clear();
    this.cardNodes.forEach((node) => {
      if (node.backMaskShape) {
        node.backMaskShape.destroy();
        node.backMaskShape = null;
        node.backMask = null;
      }
      node.container.destroy();
    });
    this.cardNodes.clear();
    this.cardAnimStates.clear();
    this.cardAnimSeen.clear();
    this.cardFlipStates.clear();
    this.cardHiddenStateBySlot.clear();
    this.rowCardCountByPrefix.clear();
    this.nextGlobalDealStartAt = 0;
    this.cardDealSequenceId = 0;
    this.lastOpeningDealSignature = "";
    this.lastHandRenderSignature = "";
    this.handOpeningDealPending = false;
    this.prevCanDeal = false;
    this.topButtons.forEach((button) => button.container.destroy());
    this.topButtons.clear();
    if (this.relicButton) {
      this.relicButton.container.destroy();
      this.relicButton = null;
    }
    if (this.logsCloseButton) {
      this.logsCloseButton.container.destroy();
      this.logsCloseButton = null;
    }
    if (this.relicCloseButton) {
      this.relicCloseButton.container.destroy();
      this.relicCloseButton = null;
    }
    if (this.introCtaButton) {
      this.introCtaButton.container.destroy();
      this.introCtaButton = null;
    }
    if (this.modalBlocker) {
      this.modalBlocker.destroy();
      this.modalBlocker = null;
    }
    this.logsModalOpen = false;
    this.relicModalOpen = false;
    this.modalOpenOrder = [];
    if (this.overlayGraphics) {
      this.overlayGraphics.destroy();
      this.overlayGraphics = null;
    }
    if (this.hudChipsIcon) {
      this.hudChipsIcon.destroy();
      this.hudChipsIcon = null;
    }
    if (this.watermarkBackground) {
      this.watermarkBackground.destroy();
      this.watermarkBackground = null;
    }
    if (this.watermarkMaskShape) {
      this.watermarkMaskShape.destroy();
      this.watermarkMaskShape = null;
      this.watermarkMask = null;
    }
    if (this.fireTrailEmitter) {
      this.fireTrailEmitter.destroy();
      this.fireTrailEmitter = null;
    }
    if (this.fireImpactEmitter) {
      this.fireImpactEmitter.destroy();
      this.fireImpactEmitter = null;
    }
    if (this.enemyDefeatEmitter) {
      this.enemyDefeatEmitter.destroy();
      this.enemyDefeatEmitter = null;
    }
    this.enemyDefeatSignature = "";
    this.enemyDefeatBurstStep = -1;
    this.enemyDefeatLastPulseAt = 0;
    this.lastHpState = null;
    this.darkIconTextureBySource.clear();
    if (this.enemyPortrait) {
      this.enemyPortrait.destroy();
      this.enemyPortrait = null;
    }
    if (this.enemyPortraitMaskShape) {
      this.enemyPortraitMaskShape.destroy();
      this.enemyPortraitMaskShape = null;
      this.enemyPortraitMask = null;
    }
    if (this.playerPortrait) {
      this.playerPortrait.destroy();
      this.playerPortrait = null;
    }
    if (this.playerPortraitMaskShape) {
      this.playerPortraitMaskShape.destroy();
      this.playerPortraitMaskShape = null;
      this.playerPortraitMask = null;
    }
    if (this.introPortrait) {
      this.introPortrait.destroy();
      this.introPortrait = null;
    }
    if (this.introPortraitMaskShape) {
      this.introPortraitMaskShape.destroy();
      this.introPortraitMaskShape = null;
      this.introPortraitMask = null;
    }
    this.introButtonLayout = null;
    if (this.resultEmitter) {
      this.resultEmitter.destroy();
      this.resultEmitter = null;
    }
    this.logsScrollIndex = 0;
    this.logsScrollMax = 0;
    this.logsLastCount = 0;
    this.logsPinnedToBottom = true;
    this.logsViewport = null;
    this.topActionTooltip = null;
    this.buttonEnabledState.clear();
    this.buttonPulseTweens.forEach((tween) => tween?.stop?.());
    this.buttonPulseTweens.clear();
    this.activeResolutionAnimations = 0;
  }

  ensureRunParticleTexture() {
    if (this.textures.exists(RUN_PARTICLE_KEY)) {
      this.ensureRadialParticleTexture(RUN_FIRE_CORE_PARTICLE_KEY, 40, [
        [0, "rgba(255,255,255,1)"],
        [0.18, "rgba(255,242,205,0.98)"],
        [0.45, "rgba(255,170,78,0.85)"],
        [0.72, "rgba(255,98,38,0.46)"],
        [1, "rgba(255,84,32,0)"],
      ]);
      this.ensureRadialParticleTexture(RUN_FIRE_GLOW_PARTICLE_KEY, 68, [
        [0, "rgba(255,250,228,1)"],
        [0.2, "rgba(255,214,140,0.92)"],
        [0.44, "rgba(255,146,54,0.66)"],
        [0.72, "rgba(255,86,26,0.35)"],
        [1, "rgba(255,64,18,0)"],
      ]);
      return;
    }
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture(RUN_PARTICLE_KEY, 16, 16);
    gfx.destroy();
    this.ensureRadialParticleTexture(RUN_FIRE_CORE_PARTICLE_KEY, 40, [
      [0, "rgba(255,255,255,1)"],
      [0.18, "rgba(255,242,205,0.98)"],
      [0.45, "rgba(255,170,78,0.85)"],
      [0.72, "rgba(255,98,38,0.46)"],
      [1, "rgba(255,84,32,0)"],
    ]);
    this.ensureRadialParticleTexture(RUN_FIRE_GLOW_PARTICLE_KEY, 68, [
      [0, "rgba(255,250,228,1)"],
      [0.2, "rgba(255,214,140,0.92)"],
      [0.44, "rgba(255,146,54,0.66)"],
      [0.72, "rgba(255,86,26,0.35)"],
      [1, "rgba(255,64,18,0)"],
    ]);
  }

  ensureRadialParticleTexture(key, size, stops) {
    if (!key || this.textures.exists(key) || typeof this.textures.createCanvas !== "function") {
      return;
    }
    const safeSize = Math.max(8, Math.round(size || 32));
    const canvasTexture = this.textures.createCanvas(key, safeSize, safeSize);
    const ctx = canvasTexture?.getContext?.();
    if (!ctx) {
      return;
    }
    const center = safeSize * 0.5;
    const gradient = ctx.createRadialGradient(center, center, 1, center, center, center);
    const colorStops = Array.isArray(stops) ? stops : [];
    if (colorStops.length === 0) {
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
    } else {
      colorStops.forEach(([offset, color]) => {
        gradient.addColorStop(Phaser.Math.Clamp(Number(offset) || 0, 0, 1), String(color || "rgba(255,255,255,1)"));
      });
    }
    ctx.clearRect(0, 0, safeSize, safeSize);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, center, 0, Math.PI * 2);
    ctx.fill();
    canvasTexture.refresh();
  }

  ensureCardShadowTexture() {
    if (this.textures.exists(RUN_CARD_SHADOW_KEY) || typeof this.textures.createCanvas !== "function") {
      return;
    }
    const texW = 240;
    const texH = 332;
    const canvasTexture = this.textures.createCanvas(RUN_CARD_SHADOW_KEY, texW, texH);
    const ctx = canvasTexture?.getContext?.();
    if (!ctx) {
      return;
    }
    const baseX = 52;
    const baseY = 18;
    const baseW = texW - 78;
    const baseH = texH - 36;
    const baseRadius = 24;
    const drawRoundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };
    ctx.clearRect(0, 0, texW, texH);
    const passes = [
      { blur: 42, offsetX: -24, alpha: 0.2, inset: 0 },
      { blur: 28, offsetX: -18, alpha: 0.17, inset: 4 },
      { blur: 16, offsetX: -10, alpha: 0.13, inset: 8 },
    ];
    passes.forEach((pass) => {
      const inset = pass.inset;
      const x = baseX + inset;
      const y = baseY + inset * 0.22;
      const w = Math.max(24, baseW - inset * 1.2);
      const h = Math.max(24, baseH - inset * 0.55);
      const r = Math.max(10, baseRadius - inset * 0.28);
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${pass.alpha.toFixed(3)})`;
      ctx.shadowBlur = pass.blur;
      ctx.shadowOffsetX = pass.offsetX;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      drawRoundRect(x, y, w, h, r);
      ctx.fill();
      ctx.restore();
    });
    canvasTexture.refresh();
  }

  update(time, delta) {
    tickRuntime(this, time, delta);
    const snapshot = this.getSnapshot();
    this.lastSnapshot = snapshot;
    this.renderSnapshot(snapshot);
  }

  onResize() {
    if (this.lastSnapshot) {
      this.renderSnapshot(this.lastSnapshot);
    }
  }

  beginResolutionAnimation() {
    this.activeResolutionAnimations = Math.max(0, Math.round(this.activeResolutionAnimations || 0)) + 1;
  }

  endResolutionAnimation() {
    this.activeResolutionAnimations = Math.max(0, Math.round(this.activeResolutionAnimations || 0) - 1);
  }

  hasActiveResolutionAnimations() {
    return Math.max(0, Math.round(this.activeResolutionAnimations || 0)) > 0;
  }

  hasActiveCardDealAnimations() {
    const now = this.time.now;
    for (const state of this.cardAnimStates.values()) {
      if (now < (Number(state?.start) || 0) + RUN_DEALER_CARD_ENTRY_MS) {
        return true;
      }
    }
    for (const state of this.cardFlipStates.values()) {
      const duration = Math.max(120, Number(state?.duration) || RUN_DEALER_CARD_FLIP_MS);
      if (now < (Number(state?.start) || 0) + duration) {
        return true;
      }
    }
    return false;
  }

  bindKeyboardInput() {
    if (!this.input.keyboard) {
      return;
    }
    const bind = (eventName, handler) => {
      this.input.keyboard.on(eventName, handler);
      this.keyboardHandlers.push({ eventName, handler });
    };

    bind("keydown-Z", () => this.invokeAction("hit"));
    bind("keydown-X", () => this.invokeAction("stand"));
    bind("keydown-A", () => this.invokeAction("hit"));
    bind("keydown-B", () => this.invokeAction("stand"));
    bind("keydown-S", () => this.invokeAction("split"));
    bind("keydown-C", () => this.invokeAction("doubleDown"));
    bind("keydown-SPACE", (event) => {
      event.preventDefault();
      this.invokeAction("doubleDown");
    });
    bind("keydown-ENTER", (event) => {
      event.preventDefault();
      if (this.lastSnapshot?.intro?.active && this.lastSnapshot?.intro?.ready) {
        this.invokeAction("confirmIntro");
      } else if (this.lastSnapshot?.intro?.active) {
        // Wait for intro text to complete.
      } else {
        this.invokeAction("deal");
      }
    });
    bind("keydown-ESC", () => {
      closeRunSceneTopModal(this);
    });
    bind("keydown-TAB", (event) => {
      event.preventDefault();
      const count = Array.isArray(this.lastSnapshot?.passives) ? this.lastSnapshot.passives.length : 0;
      if (count <= 0) {
        return;
      }
      toggleRunSceneModal(this, "relics");
    });
  }

  bindPointerInput() {
    const bind = (eventName, handler) => {
      this.input.on(eventName, handler);
      this.pointerHandlers.push({ eventName, handler });
    };
    bind("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.logsModalOpen || !this.logsViewport) {
        return;
      }
      if (!this.pointInRect(pointer.worldX, pointer.worldY, this.logsViewport)) {
        return;
      }
      this.logsPinnedToBottom = false;
      setRunSceneLogsScroll(this, this.logsScrollIndex + Math.sign(deltaY || 0) * 2);
    });
  }

  pointInRect(x, y, rect) {
    if (!rect) {
      return false;
    }
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  getEncounterTypeLabel(type) {
    const normalized = String(type || "normal").trim().toLowerCase();
    if (!normalized) {
      return "Normal Encounter";
    }
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} Encounter`;
  }

  playRunSfx(methodName, ...args) {
    const api = getRunApiFromRuntime(this);
    const fn = api?.[methodName];
    if (typeof fn === "function") {
      fn(...args);
    }
  }

  triggerAvatarShake(side, magnitude = 6.5, duration = 220) {
    const key = side === "enemy" ? "enemy" : "player";
    const shake = this.avatarShake?.[key];
    if (!shake) {
      return;
    }
    const now = this.time.now;
    shake.start = now;
    shake.duration = Math.max(80, Math.round(duration || 0));
    shake.until = now + shake.duration;
    shake.magnitude = Math.max(0, Number(magnitude) || 0);
  }

  getAvatarShakeOffset(side) {
    const key = side === "enemy" ? "enemy" : "player";
    const shake = this.avatarShake?.[key];
    if (!shake) {
      return { x: 0, y: 0 };
    }
    const now = this.time.now;
    if (!Number.isFinite(shake.until) || now >= shake.until || !Number.isFinite(shake.magnitude) || shake.magnitude <= 0) {
      shake.magnitude = 0;
      return { x: 0, y: 0 };
    }
    const elapsed = Math.max(0, now - (Number.isFinite(shake.start) ? shake.start : now));
    const life = Math.max(80, Number(shake.duration) || 180);
    const lifeT = Phaser.Math.Clamp(elapsed / life, 0, 1);
    const damping = 1 - lifeT;
    const mag = shake.magnitude * damping;
    const wiggle = Math.sin(now * 0.11) * 0.7 + Math.sin(now * 0.21) * 0.3;
    return {
      x: Phaser.Math.Between(-1000, 1000) / 1000 * mag * 0.55 + wiggle * mag * 0.24,
      y: Phaser.Math.Between(-1000, 1000) / 1000 * mag * 0.28,
    };
  }

  getSnapshot() {
    const api = getRunApiFromRuntime(this);
    if (!api || typeof api.getSnapshot !== "function") {
      return null;
    }
    try {
      return api.getSnapshot();
    } catch {
      return null;
    }
  }

  invokeAction(actionName) {
    const gatedActions = new Set(["hit", "stand", "doubleDown", "split", "deal", "confirmIntro"]);
    if (gatedActions.has(actionName) && (this.hasActiveCardDealAnimations() || this.hasActiveResolutionAnimations())) {
      return;
    }
    const api = getRunApiFromRuntime(this);
    const action = api ? api[actionName] : null;
    if (typeof action === "function") {
      action();
    }
  }

  isCompactLayout(width) {
    return width < 760;
  }

  shouldShowKeyboardHints(width) {
    const viewportWidth = Number(width) || 0;
    const coarsePointer = isCoarsePointerFromRuntime(this);
    return viewportWidth >= 1100 && !coarsePointer;
  }

  getTransitionState(snapshot) {
    const transition = snapshot?.transition;
    if (!transition || typeof transition !== "object") {
      return null;
    }
    const target = transition.target === "player" ? "player" : transition.target === "enemy" ? "enemy" : "";
    if (!target) {
      return null;
    }
    const duration = Math.max(0.001, Number(transition.duration) || Number(transition.remaining) || 0.001);
    const remaining = Phaser.Math.Clamp(Number(transition.remaining) || 0, 0, duration);
    const rawProgress = Number(transition.progress);
    const progress = Number.isFinite(rawProgress)
      ? Phaser.Math.Clamp(rawProgress, 0, 1)
      : Phaser.Math.Clamp(1 - remaining / duration, 0, 1);
    const waiting = Boolean(transition.waiting);
    return {
      target,
      duration,
      remaining,
      progress,
      waiting,
    };
  }

  tryStartQueuedEnemyDefeatTransition(snapshot, options = {}) {
    const transitionState = this.getTransitionState(snapshot);
    if (!transitionState || transitionState.target !== "enemy" || !transitionState.waiting) {
      return;
    }
    if (snapshot?.intro?.active) {
      return;
    }
    if (Boolean(options?.deferResolutionUi)) {
      return;
    }
    if (this.hasActiveResolutionAnimations()) {
      return;
    }
    this.playRunSfx("startEnemyDefeatTransition");
  }

  getRunLayout(width, height) {
    const compact = this.isCompactLayout(width);
    const topBarH = compact ? 76 : RUN_TOP_BAR_HEIGHT;
    const compactButtonH = Math.max(36, Math.round(50 * RUN_MOBILE_BUTTON_SCALE));
    const compactRowGap = Math.max(8, Math.round(10 * RUN_MOBILE_BUTTON_SCALE));
    const bottomBarH = compact ? compactButtonH * 2 + compactRowGap : RUN_BOTTOM_BAR_HEIGHT;
    const sidePad = Math.max(compact ? 16 : 22, Math.round(width * (compact ? 0.016 : 0.02)));
    const arenaTop = topBarH;
    const arenaBottom = Math.max(arenaTop + 180, height - bottomBarH);
    const arenaH = Math.max(160, arenaBottom - arenaTop);
    return {
      compact,
      topBarH,
      bottomBarH,
      sidePad,
      arenaX: 0,
      arenaY: arenaTop,
      arenaW: Math.max(1, width),
      arenaH,
      arenaBottom,
    };
  }

  renderSnapshot(snapshot) {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const runLayout = this.getRunLayout(width, height);
    this.graphics.clear();
    if (this.overlayGraphics) {
      this.overlayGraphics.clear();
    }
    this.hideAllText();
    this.introButtonLayout = null;
    if (!snapshot) {
      this.lastHpState = null;
      this.activeResolutionAnimations = 0;
      this.enemyDefeatSignature = "";
      this.enemyDefeatBurstStep = -1;
      this.enemyDefeatLastPulseAt = 0;
      if (this.watermarkBackground) {
        this.watermarkBackground.setVisible(false);
      }
      if (this.hudChipsIcon) {
        this.hudChipsIcon.setVisible(false);
      }
      rebuildRunSceneButtons(this, [], BUTTON_STYLES);
      this.lastResultSignature = "";
      this.cardAnimStates.clear();
      this.cardAnimSeen.clear();
      this.cardFlipStates.clear();
      this.cardHiddenStateBySlot.clear();
      this.rowCardCountByPrefix.clear();
      this.nextGlobalDealStartAt = 0;
      this.cardDealSequenceId = 0;
      this.lastOpeningDealSignature = "";
      this.lastHandRenderSignature = "";
      this.handOpeningDealPending = false;
      this.prevCanDeal = false;
      closeRunSceneModals(this);
      this.topButtons.forEach((button) => button.container.setVisible(false));
      if (this.relicButton) {
        this.relicButton.container.setVisible(false);
      }
      if (this.logsCloseButton) {
        this.logsCloseButton.container.setVisible(false);
      }
      if (this.relicCloseButton) {
        this.relicCloseButton.container.setVisible(false);
      }
      if (this.introCtaButton) {
        this.introCtaButton.container.setVisible(false);
      }
      this.cardNodes.forEach((node) => node.container.setVisible(false));
      this.introOverlayProgress = Phaser.Math.Linear(this.introOverlayProgress, 0, 0.2);
      if (this.enemyPortrait) {
        this.enemyPortrait.setVisible(false);
      }
      if (this.playerPortrait) {
        this.playerPortrait.setVisible(false);
      }
      if (this.introPortrait) {
        this.introPortrait.setVisible(false);
      }
      return;
    }

    this.drawBackground(width, height, runLayout);
    this.drawHud(snapshot, width, runLayout);
    const safeHandIndex = Math.max(1, Number(snapshot?.handIndex) || 1);
    const handRenderSignature = [
      String(snapshot?.run?.floor || 0),
      String(snapshot?.run?.room || 0),
      String(snapshot?.enemy?.name || ""),
      `h${safeHandIndex}`,
    ].join("|");
    if (handRenderSignature !== this.lastHandRenderSignature) {
      this.lastHandRenderSignature = handRenderSignature;
      this.cardDealSequenceId += 1;
      this.handOpeningDealPending = true;
      this.cardAnimStates.clear();
      this.cardAnimSeen.clear();
      this.cardFlipStates.clear();
      this.cardHiddenStateBySlot.clear();
      this.rowCardCountByPrefix.clear();
      this.nextGlobalDealStartAt = this.time.now;
      this.cardNodes.forEach((node) => node.container.setVisible(false));
    }
    const canDealNow = Boolean(snapshot?.status?.canDeal);
    if (this.prevCanDeal && !canDealNow) {
      this.lastOpeningDealSignature = "";
    }
    this.prevCanDeal = canDealNow;
    const transitionState = this.getTransitionState(snapshot);
    const layout = this.drawEncounterPanels(snapshot, width, height, runLayout, { transitionState });
    this.renderEnemyDefeatEffect(transitionState, layout);
    this.renderRelicButton(snapshot, layout, runLayout);
    const cardRenderState = drawRunSceneCards(this, {
      snapshot,
      width,
      height,
      layout,
      theme: RUN_BROWN_THEME,
    });
    const deferResolutionUi = Boolean(cardRenderState?.deferResolutionUi);
    this.processHpImpacts(snapshot, layout, width, height, { deferResolutionUi });
    drawRunSceneMessages(this, {
      snapshot,
      width,
      height,
      layout,
      deferResolutionUi,
      styleSet: BUTTON_STYLES,
      applyButtonStyle: (button, styleName) => this.setButtonVisual(button, styleName),
    });
    this.tryStartQueuedEnemyDefeatTransition(snapshot, { deferResolutionUi });
    renderRunSceneButtons(this, {
      snapshot,
      width,
      height,
      runLayout,
      deferResolutionUi,
      styleSet: BUTTON_STYLES,
      applyButtonStyle: (button, styleName) => this.setButtonVisual(button, styleName),
    });
    renderRunSceneTopActions(this, {
      snapshot,
      width,
      runLayout,
      styleSet: BUTTON_STYLES,
    });
    if (this.logsCloseButton && !this.logsModalOpen) {
      this.logsCloseButton.container.setVisible(false);
    }
    if (this.relicCloseButton && !this.relicModalOpen) {
      this.relicCloseButton.container.setVisible(false);
    }
    const modalOrder = getRunSceneModalOpenOrder(this);
    const topModalId = modalOrder[modalOrder.length - 1] || "";
    drawRunSceneLogsModal(this, {
      snapshot,
      width,
      height,
      runLayout,
      layerIndex: topModalId === "logs" ? 0 : -1,
      styleSet: BUTTON_STYLES,
      applyButtonStyle: (button, styleName) => this.setButtonVisual(button, styleName),
    });
    drawRunSceneRelicsModal(this, {
      snapshot,
      width,
      height,
      runLayout,
      layerIndex: topModalId === "relics" ? 0 : -1,
      styleSet: BUTTON_STYLES,
      applyButtonStyle: (button, styleName) => this.setButtonVisual(button, styleName),
    });
    syncRunSceneModalBlocker(this, width, height);
  }

  drawBackground(width, height, runLayout) {
    const watermarkTexture = this.watermarkBackground?.texture?.key || "";
    if (this.watermarkBackground && watermarkTexture && this.textures.exists(watermarkTexture)) {
      const cover = this.coverSizeForTexture(watermarkTexture, runLayout.arenaW, runLayout.arenaH);
      this.watermarkBackground
        .setPosition(runLayout.arenaX + runLayout.arenaW * 0.5, runLayout.arenaY + runLayout.arenaH * 0.5)
        .setDisplaySize(cover.width, cover.height)
        .setAlpha(1)
        .setVisible(true);
      if (this.watermarkMaskShape) {
        this.watermarkMaskShape.clear();
        this.watermarkMaskShape.fillStyle(0xffffff, 1);
        this.watermarkMaskShape.fillRect(runLayout.arenaX, runLayout.arenaY, runLayout.arenaW, runLayout.arenaH);
      }
    } else if (this.watermarkBackground) {
      this.watermarkBackground.setVisible(false);
    }
    this.graphics.fillGradientStyle(0x0f2238, 0x0f2238, 0x061524, 0x061524, 0.48);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081726, 0.96);
    this.graphics.fillRect(0, 0, width, runLayout.topBarH);
    this.graphics.fillStyle(0x081726, 0.96);
    this.graphics.fillRect(0, height - runLayout.bottomBarH, width, runLayout.bottomBarH);
    const centerX = runLayout.arenaX + runLayout.arenaW * 0.5;
    const centerY = runLayout.arenaY + runLayout.arenaH * 0.5;
    const glowMaxW = runLayout.arenaW * 1.28;
    const glowMaxH = runLayout.arenaH * 1.22;
    const glowMinW = runLayout.arenaW * 0.14;
    const glowMinH = runLayout.arenaH * 0.12;
    const glowLayers = 96;
    for (let i = glowLayers - 1; i >= 0; i -= 1) {
      const t = i / (glowLayers - 1);
      const falloff = 1 - t;
      const alpha = 0.033 * Math.pow(falloff, 2.25);
      const glowW = glowMinW + (glowMaxW - glowMinW) * t;
      const glowH = glowMinH + (glowMaxH - glowMinH) * t;
      this.graphics.fillStyle(0x7b4e29, alpha);
      this.graphics.fillEllipse(centerX, centerY, glowW, glowH);
    }
    const innerLayers = 56;
    for (let i = innerLayers - 1; i >= 0; i -= 1) {
      const t = i / (innerLayers - 1);
      const falloff = 1 - t;
      const alpha = 0.017 * Math.pow(falloff, 1.9);
      const glowW = runLayout.arenaW * (0.08 + t * 0.46);
      const glowH = runLayout.arenaH * (0.08 + t * 0.44);
      this.graphics.fillStyle(0xa56f3c, alpha);
      this.graphics.fillEllipse(centerX, centerY, glowW, glowH);
    }
  }

  drawHud(snapshot, width, runLayout) {
    const run = snapshot.run || {};
    const chips = Number.isFinite(run.chips)
      ? run.chips
      : Number.isFinite(run.player?.gold)
        ? run.player.gold
        : 0;
    const floor = Number.isFinite(run.floor) ? run.floor : 1;
    const maxFloor = Number.isFinite(run.maxFloor) ? run.maxFloor : 3;
    const room = Number.isFinite(run.room) ? run.room : 1;
    const roomsPerFloor = Number.isFinite(run.roomsPerFloor) ? run.roomsPerFloor : 5;
    const compact = Boolean(runLayout.compact);
    if (compact) {
      const rowY = Math.round(runLayout.topBarH * 0.5);
      const leftStartX = runLayout.sidePad + 8;
      if (this.hudChipsIcon) {
        this.hudChipsIcon.setPosition(leftStartX, rowY);
        this.hudChipsIcon.setDisplaySize(18, 18);
        this.hudChipsIcon.clearTint();
        this.hudChipsIcon.setVisible(true);
      } else {
        this.drawChipIcon(leftStartX, rowY, 7);
      }
      const chipsNode = this.drawText("hud-chips", String(chips), leftStartX + 20, rowY, {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: "16px",
        color: "#f2cd88",
        fontStyle: "800",
      }, { x: 0, y: 0.5 });
      const floorRoomX = chipsNode.x + chipsNode.width + 26;
      this.drawText("hud-floor-room", `Floor ${floor}/${maxFloor}  Room ${room}/${roomsPerFloor}`, floorRoomX, rowY, {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: "15px",
        color: "#e2d0af",
        fontStyle: "800",
      }, { x: 0, y: 0.5 });
      return;
    }

    const hudY = Math.round(runLayout.topBarH * 0.48);
    const leftStartX = runLayout.sidePad + 8;
    if (this.hudChipsIcon) {
      this.hudChipsIcon.setPosition(leftStartX, hudY);
      this.hudChipsIcon.setDisplaySize(20, 20);
      this.hudChipsIcon.clearTint();
      this.hudChipsIcon.setVisible(true);
    } else {
      this.drawChipIcon(leftStartX, hudY, 8);
    }
    this.drawText("hud-chips", String(chips), leftStartX + 22, hudY, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "17px",
      color: "#f2cd88",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    this.drawText("hud-floor-room", `Floor ${floor}/${maxFloor}  Room ${room}/${roomsPerFloor}`, width * 0.5, hudY, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "16px",
      color: "#e2d0af",
      fontStyle: "700",
    }, { x: 0.5, y: 0.5 });
  }

  drawChipIcon(x, y, radius) {
    const safeRadius = Math.max(3, Number(radius) || 8);
    this.graphics.fillStyle(0xe0ba74, 0.92);
    this.graphics.fillCircle(x, y, safeRadius);
    this.graphics.lineStyle(1.4, 0x8f6a34, 0.8);
    this.graphics.strokeCircle(x, y, safeRadius);
    this.graphics.fillStyle(0x6b4d24, 0.52);
    this.graphics.fillCircle(x, y, safeRadius * 0.42);
    this.graphics.lineStyle(1, 0xf4d89f, 0.42);
    this.graphics.strokeCircle(x, y, safeRadius * 0.74);
  }

  drawEncounterPanels(snapshot, width, height, runLayout, options = {}) {
    const enemy = snapshot.enemy || {};
    const player = snapshot.player || {};
    const compact = Boolean(runLayout.compact);
    const transitionState = options?.transitionState || null;
    const enemyDefeatTransition = transitionState?.target === "enemy" && !transitionState?.waiting ? transitionState : null;
    const enemyFadeProgress = enemyDefeatTransition
      ? Phaser.Math.Easing.Cubic.In(Phaser.Math.Clamp((enemyDefeatTransition.progress - 0.16) / 0.84, 0, 1))
      : 0;
    const playerAvatarW = compact ? 84 : 110;
    const playerButtonH = compact ? 40 : 50;
    const playerAvatarH = Math.max(
      playerAvatarW,
      (compact ? 22 : 34) + (compact ? 24 : 28) + (compact ? 30 : 36) + Math.round(playerButtonH * 0.5)
    );
    const enemyAvatarW = compact ? playerAvatarW : 146;
    const enemyAvatarH = compact ? playerAvatarH : 176;
    const enemyAvatarX = width - runLayout.sidePad - enemyAvatarW;
    const enemyAvatarY = runLayout.arenaY + (compact ? 8 : 12);
    const enemyInfoRight = enemyAvatarX - (compact ? 10 : 14);
    const enemyInfoLeft = compact
      ? runLayout.sidePad + 2
      : enemyInfoRight - Math.max(220, Math.min(288, Math.round(width * 0.21)));
    const enemyInfoWidth = Math.max(120, enemyInfoRight - enemyInfoLeft);
    const enemyNameY = enemyAvatarY + (compact ? 12 : 14);
    const nameToHpGap = Math.round((compact ? 26 : 34) * 0.9);
    const enemyHpY = enemyNameY + nameToHpGap;
    const enemyNameSize = `${Math.round((compact ? 12 : 17) * 1.15)}px`;

    this.drawText("enemy-name", (enemy.name || "Enemy").toUpperCase(), enemyInfoRight, enemyNameY, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: enemyNameSize,
      color: "#d8c3a0",
      fontStyle: compact ? "800" : "700",
    }, { x: 1, y: 0.5 });

    this.drawHpBar(
      "enemy-hp",
      enemyInfoLeft,
      enemyHpY,
      enemyInfoWidth,
      compact ? 24 : 28,
      enemy.hp || 0,
      enemy.maxHp || 1,
      "#e96d73",
      {
        trackColor: 0x0b1a2a,
        borderColor: 0x36516b,
        darkTextColor: "#0d141b",
        lightTextColor: "#eef6ff",
      }
    );
    this.drawEnemyAvatar(enemy, enemyAvatarX, enemyAvatarY, enemyAvatarW, enemyAvatarH, {
      defeatProgress: enemyDefeatTransition?.progress || 0,
      fadeProgress: enemyFadeProgress,
    });

    const playerAvatarX = runLayout.sidePad;
    const playerAvatarY = runLayout.arenaBottom - playerAvatarH - (compact ? 12 : 14);
    this.drawPlayerAvatar(playerAvatarX, playerAvatarY, playerAvatarW, playerAvatarH);

    const playerInfoLeft = playerAvatarX + playerAvatarW + (compact ? 10 : 16);
    const playerInfoWidth = compact
      ? Math.max(130, width - playerInfoLeft - runLayout.sidePad - 4)
      : Math.max(220, Math.min(320, Math.round(width * 0.25)));
    this.drawText(
      "player-name",
      "PLAYER",
      playerInfoLeft,
      playerAvatarY + (compact ? 10 : 16),
      {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: enemyNameSize,
        color: "#e1ccb0",
        fontStyle: compact ? "800" : "700",
      },
      { x: 0, y: 0.5 }
    );

    const playerHpY = playerAvatarY + (compact ? 22 : 34);
    const playerHpH = compact ? 24 : 28;
    this.drawHpBar("player-hp", playerInfoLeft, playerHpY, playerInfoWidth, playerHpH, player.hp || 0, player.maxHp || 1, "#3ecf6c", {
      trackColor: 0x0a1f1a,
      borderColor: 0x2e5d53,
      darkTextColor: "#09140f",
      lightTextColor: "#f2f8ff",
    });

    const cardAspect = 1.42;
    const baseCardWidth = compact ? Math.round(64 * 0.85) : 88;
    const baseMessageMargin = compact ? Math.round(18 * 0.9) : 24;
    const baseMessagePanelH = compact ? Math.round(48 * 0.9) : 60;
    const baseMessagePanelW = compact
      ? Math.round(Phaser.Math.Clamp(width - runLayout.sidePad * 2 - 24, 280, 360) * 0.9)
      : Phaser.Math.Clamp(Math.round(width * 0.44), 500, 640);
    const desiredCenterY = Math.round(runLayout.arenaY + runLayout.arenaH * 0.5);
    const enemyDetailBottom = Math.max(
      enemyAvatarY + enemyAvatarH,
      enemyHpY + (compact ? 24 : 28),
      enemyNameY + Math.round((compact ? 14 : 18))
    );
    const playerDetailTop = Math.min(playerAvatarY, playerHpY);
    const topHandBound = Math.max(runLayout.arenaY + (compact ? 90 : 110), enemyDetailBottom + (compact ? 12 : 16));
    const bottomHandBound = Math.min(runLayout.arenaBottom - (compact ? 10 : 16), playerDetailTop - (compact ? 12 : 16));
    const availableSpan = Math.max(1, bottomHandBound - topHandBound);
    const handLabelScale = compact ? Phaser.Math.Clamp(width / 430, 0.68, 0.9) : 1;
    const handLabelGapEstimate = Math.max(10, Math.round((compact ? 20 : 24) * handLabelScale));
    const handLabelFontEstimate = Math.max(12, Math.round((compact ? 14 : 17) * handLabelScale));
    const handLabelReserve = handLabelGapEstimate + Math.round(handLabelFontEstimate * 0.62) + (compact ? 2 : 4);
    const baseCardHeight = Math.round(baseCardWidth * cardAspect * RUN_CARD_HEIGHT_SCALE);
    const baseTotalSpan = baseCardHeight * 2 + baseMessagePanelH + baseMessageMargin * 2 + handLabelReserve * 2;
    const mobileGroupScaleBoost = compact ? RUN_MOBILE_HAND_GROUP_SCALE_BOOST : 1;
    let stackScale = compact
      ? Phaser.Math.Clamp(
        (availableSpan / Math.max(1, baseTotalSpan)) * mobileGroupScaleBoost,
        0.56,
        mobileGroupScaleBoost
      )
      : 1;
    let cardWidth = Math.max(compact ? 38 : 72, Math.round(baseCardWidth * stackScale));
    let cardHeight = Math.round(cardWidth * cardAspect * RUN_CARD_HEIGHT_SCALE);
    let messagePanelH = Math.max(compact ? 30 : 54, Math.round(baseMessagePanelH * (compact ? stackScale : 1)));
    let messageMargin = Math.max(compact ? 8 : 18, Math.round(baseMessageMargin * (compact ? stackScale : 1)));
    let messagePanelW = compact
      ? Math.max(220, Math.round(baseMessagePanelW * Math.max(0.84, stackScale)))
      : baseMessagePanelW;
    let messageHalf = Math.round(messagePanelH * 0.5);
    let halfSpan = cardHeight + messageMargin + messageHalf + handLabelReserve;
    let minCenterY = topHandBound + halfSpan;
    let maxCenterY = bottomHandBound - halfSpan;
    if (compact && minCenterY > maxCenterY) {
      const emergencyScale = Phaser.Math.Clamp(availableSpan / Math.max(1, halfSpan * 2), 0.5, 1);
      stackScale *= emergencyScale;
      cardWidth = Math.max(34, Math.round(cardWidth * emergencyScale));
      cardHeight = Math.round(cardWidth * cardAspect * RUN_CARD_HEIGHT_SCALE);
      messagePanelH = Math.max(26, Math.round(messagePanelH * emergencyScale));
      messageMargin = Math.max(6, Math.round(messageMargin * emergencyScale));
      messagePanelW = Math.max(200, Math.round(messagePanelW * emergencyScale));
      messageHalf = Math.round(messagePanelH * 0.5);
      halfSpan = cardHeight + messageMargin + messageHalf + handLabelReserve;
      minCenterY = topHandBound + halfSpan;
      maxCenterY = bottomHandBound - halfSpan;
    }
    const groupCenterY = minCenterY <= maxCenterY
      ? Phaser.Math.Clamp(desiredCenterY, minCenterY, maxCenterY)
      : Math.round((topHandBound + bottomHandBound) * 0.5);
    const messageGap = messageMargin + messageHalf;
    const enemyRowY = Math.round(groupCenterY - messageGap - cardHeight);
    const playerRowY = Math.round(groupCenterY + messageGap);

    return {
      enemyY: enemyRowY,
      playerY: playerRowY,
      cardWidth,
      cardHeight,
      groupScale: stackScale,
      messageGap,
      enemyInfoLeft,
      enemyInfoRight,
      enemyInfoWidth,
      playerInfoLeft,
      playerInfoWidth,
      playerHpY,
      playerHpH,
      enemyHpX: enemyInfoLeft,
      enemyHpY,
      enemyHpW: enemyInfoWidth,
      enemyHpH: compact ? 24 : 28,
      enemyAvatarX,
      enemyAvatarY,
      enemyAvatarW,
      enemyAvatarH,
      enemyAvatarRect: {
        x: enemyAvatarX,
        y: enemyAvatarY,
        width: enemyAvatarW,
        height: enemyAvatarH,
      },
      playerAvatarX,
      playerAvatarY,
      playerAvatarW,
      playerAvatarH,
      messageY: groupCenterY,
      messagePanelW,
      messagePanelH,
      messageMargin,
      cardsTopBound: topHandBound,
      cardsBottomBound: bottomHandBound,
      handLabelReserve,
    };
  }

  renderRelicButton(snapshot, layout, runLayout) {
    if (!this.relicButton) {
      this.relicButton = createGradientButton(this, {
        id: "relics",
        label: "RELICS",
        styleSet: RUN_SECONDARY_BUTTON_STYLE,
        onPress: () => {
          const count = Array.isArray(this.lastSnapshot?.passives) ? this.lastSnapshot.passives.length : 0;
          if (count <= 0) {
            return;
          }
          toggleRunSceneModal(this, "relics");
        },
        width: 144,
        height: 38,
        fontSize: 18,
        hoverScale: 1,
        pressedScale: 0.98,
      });
      this.relicButton.container.setDepth(86);
      const icon = this.add
        .image(0, 0, RUN_RELIC_ICON_KEY)
        .setDisplaySize(18, 18)
        .setTint(0xffffff)
        .setAlpha(0.92);
      const shortcut = this.add
        .text(0, 0, "TAB", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "12px",
          color: "#f2f6fb",
          fontStyle: "700",
        })
        .setOrigin(1, 0.5)
        .setAlpha(0.76);
      this.relicButton.container.add([icon, shortcut]);
      this.relicButton.icon = icon;
      this.relicButton.shortcut = shortcut;
    }
    const entries = Array.isArray(snapshot?.passives) ? snapshot.passives : [];
    const count = entries.length;
    if (count <= 0) {
      setRunSceneModalOpen(this, "relics", false);
    }
    const compact = Boolean(runLayout?.compact);
    const mobileButtonScale = compact ? RUN_MOBILE_BUTTON_SCALE : 1;
    const showKeyboardHints = this.shouldShowKeyboardHints(this.scale.gameSize.width);
    const desiredButtonW = compact ? Math.round(170 * mobileButtonScale) : 220;
    const availableButtonW = Math.max(120, Math.round(layout.playerInfoWidth || desiredButtonW));
    const buttonW = Math.max(120, Math.min(desiredButtonW, availableButtonW));
    const buttonH = compact ? Math.max(30, Math.round(40 * mobileButtonScale)) : 50;
    const x = Math.round(layout.playerInfoLeft + buttonW * 0.5);
    const y = Math.round(layout.playerHpY + layout.playerHpH + (compact ? 30 : 36));
    setGradientButtonSize(this.relicButton, buttonW, buttonH);
    this.relicButton.container.setPosition(x, y);
    const relicLabel = `RELICS (${count})`;
    this.relicButton.text.setText(relicLabel);
    let relicFontSize = compact ? Math.max(12, Math.round(16 * mobileButtonScale)) : 18;
    this.relicButton.text.setFontSize(relicFontSize);
    this.relicButton.text.setFontStyle(compact ? "800" : "700");
    const relicTextMaxW = Math.max(64, buttonW - (compact ? 82 : 98));
    while (this.relicButton.text.width > relicTextMaxW && relicFontSize > 12) {
      relicFontSize -= 1;
      this.relicButton.text.setFontSize(relicFontSize);
    }
    this.relicButton.text.setOrigin(0, 0.5);
    this.relicButton.text.setPosition(-buttonW * 0.5 + (compact ? Math.round(36 * mobileButtonScale) : 46), 0);
    this.relicButton.text.setAlign("left");
    if (this.relicButton.icon) {
      this.relicButton.icon.setTexture(RUN_RELIC_ICON_KEY);
      this.relicButton.icon.setDisplaySize(
        compact ? Math.max(13, Math.round(18 * mobileButtonScale)) : 22,
        compact ? Math.max(13, Math.round(18 * mobileButtonScale)) : 22
      );
      this.relicButton.icon.setTint(0xffffff);
      this.relicButton.icon.setPosition(-buttonW * 0.5 + (compact ? Math.round(16 * mobileButtonScale) : 22), 0);
      this.relicButton.icon.setVisible(true);
    }
    if (this.relicButton.shortcut) {
      this.relicButton.shortcut.setText("TAB");
      this.relicButton.shortcut.setFontSize(compact ? Math.max(8, Math.round(11 * mobileButtonScale)) : 13);
      this.relicButton.shortcut.setColor("#f2f6fb");
      this.relicButton.shortcut.setAlpha(0.76);
      this.relicButton.shortcut.setPosition(buttonW * 0.5 - (compact ? Math.round(16 * mobileButtonScale) : 24), 0);
      this.relicButton.shortcut.setVisible(showKeyboardHints);
    }
    this.relicButton.enabled = count > 0;
    this.setButtonVisual(this.relicButton, this.relicButton.enabled ? "idle" : "disabled");
    this.relicButton.text.setColor(this.relicButton.enabled ? "#f8fbff" : "#dbe2ea");
    this.relicButton.container.setAlpha(this.relicButton.enabled ? 1 : 0.84);
    this.relicButton.container.setVisible(true);
  }

  drawPlayerAvatar(x, y, width, height) {
    const shake = this.getAvatarShakeOffset("player");
    const drawX = x + shake.x;
    const drawY = y + shake.y;
    this.graphics.fillStyle(0x2a1a0f, 1);
    this.graphics.fillRoundedRect(drawX, drawY, width, height, 18);
    this.graphics.lineStyle(1.8, 0x8a6940, 1);
    this.graphics.strokeRoundedRect(drawX, drawY, width, height, 18);

    const inset = 8;
    const innerX = drawX + inset;
    const innerY = drawY + inset;
    const innerW = width - inset * 2;
    const innerH = height - inset * 2;
    this.graphics.fillStyle(0x3b2718, 1);
    this.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
    const playerTextureKey = this.textures.exists(RUN_PLAYER_AVATAR_KEY) ? RUN_PLAYER_AVATAR_KEY : "";
    if (playerTextureKey && this.playerPortrait) {
      if (this.playerPortraitMaskShape) {
        this.playerPortraitMaskShape.clear();
        this.playerPortraitMaskShape.fillStyle(0xffffff, 1);
        this.playerPortraitMaskShape.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
      }
      const cover = this.coverSizeForTexture(playerTextureKey, innerW, innerH);
      this.playerPortrait
        .setTexture(playerTextureKey)
        .setAlpha(0.75)
        .setDisplaySize(cover.width, cover.height)
        .setPosition(drawX + width * 0.5, drawY + height * 0.5)
        .setVisible(true);
      return;
    }
    if (this.playerPortrait) {
      this.playerPortrait.setVisible(false);
    }
    this.graphics.fillStyle(0xcfc0a7, 1);
    this.graphics.fillCircle(innerX + innerW * 0.5, innerY + innerH * 0.3, innerW * 0.2);
    this.graphics.fillRoundedRect(innerX + innerW * 0.17, innerY + innerH * 0.48, innerW * 0.66, innerH * 0.44, 10);
  }

  resolveEnemyAvatarTexture(enemy) {
    const explicitKey = typeof enemy?.avatarKey === "string" && enemy.avatarKey.trim().length > 0 ? enemy.avatarKey.trim() : "";
    const mappedKey = ENEMY_AVATAR_KEY_BY_NAME[enemy?.name] || "";
    const safeKey = explicitKey || mappedKey || sanitizeEnemyAvatarKey(enemy?.name);
    if (!safeKey) {
      return "";
    }
    const textureKey = `${ENEMY_AVATAR_TEXTURE_PREFIX}${safeKey}`;
    return this.textures.exists(textureKey) ? textureKey : "";
  }

  enemyAccent(type) {
    if (type === "boss") {
      return 0xffab84;
    }
    if (type === "elite") {
      return 0xffdf9d;
    }
    return 0xaed2f0;
  }

  coverSizeForTexture(textureKey, boundsW, boundsH) {
    const source = this.getTextureSourceSize(textureKey);
    const sourceW = source.width;
    const sourceH = source.height;
    const scale = Math.max(boundsW / sourceW, boundsH / sourceH);
    return {
      width: sourceW * scale,
      height: sourceH * scale,
    };
  }

  getTextureSourceSize(textureKey) {
    const texture = this.textures.get(textureKey);
    const source = texture?.source?.[0];
    return {
      width: Math.max(1, Number(source?.width) || Number(texture?.getSourceImage?.()?.width) || 1),
      height: Math.max(1, Number(source?.height) || Number(texture?.getSourceImage?.()?.height) || 1),
    };
  }

  drawEnemyAvatar(enemy, x, y, width, height, options = {}) {
    const disableVisualFx = Boolean(this.disableVisualFx);
    const defeatProgress = Phaser.Math.Clamp(Number(options?.defeatProgress) || 0, 0, 1);
    const fadeProgress = Phaser.Math.Clamp(Number(options?.fadeProgress) || 0, 0, 1);
    const avatarAlpha = Phaser.Math.Clamp(1 - fadeProgress, 0, 1);
    const shake = this.getAvatarShakeOffset("enemy");
    const dissolveJitterX = disableVisualFx || defeatProgress <= 0
      ? 0
      : Math.sin(this.time.now * 0.046) * (1.4 + defeatProgress * 3);
    const dissolveJitterY = disableVisualFx || defeatProgress <= 0
      ? 0
      : Math.cos(this.time.now * 0.041) * (0.9 + defeatProgress * 2.2);
    const drawX = x + shake.x + dissolveJitterX;
    const drawY = y + shake.y + dissolveJitterY;
    if (avatarAlpha <= 0.01) {
      if (this.enemyPortrait) {
        this.enemyPortrait.setVisible(false);
      }
      const fallback = this.textNodes.get("enemy-avatar-fallback");
      if (fallback) {
        fallback.setVisible(false);
      }
      return;
    }
    this.graphics.fillStyle(0x1c2f43, 0.95 * avatarAlpha);
    this.graphics.fillRoundedRect(drawX, drawY, width, height, 14);
    this.graphics.lineStyle(1.8, 0x516f8f, 0.5 * avatarAlpha);
    this.graphics.strokeRoundedRect(drawX, drawY, width, height, 14);

    const pulse = disableVisualFx ? 0.5 : Math.sin(this.time.now * 0.004) * 0.5 + 0.5;
    this.graphics.lineStyle(2.1, this.enemyAccent(enemy?.type), (0.26 + pulse * 0.22) * avatarAlpha);
    this.graphics.strokeRoundedRect(drawX - 1, drawY - 1, width + 2, height + 2, 15);

    const innerPad = 6;
    const innerX = drawX + innerPad;
    const innerY = drawY + innerPad;
    const innerW = Math.max(12, width - innerPad * 2);
    const innerH = Math.max(12, height - innerPad * 2);

    if (this.enemyPortraitMaskShape) {
      this.enemyPortraitMaskShape.clear();
      this.enemyPortraitMaskShape.fillStyle(0xffffff, 1);
      this.enemyPortraitMaskShape.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
    }

    const fallback = this.textNodes.get("enemy-avatar-fallback");
    if (fallback) {
      fallback.setVisible(false);
    }

    const textureKey = this.resolveEnemyAvatarTexture(enemy);
    if (!textureKey || !this.enemyPortrait) {
      if (this.enemyPortrait) {
        this.enemyPortrait.setVisible(false);
      }
      this.graphics.fillStyle(0x1a3146, 0.92 * avatarAlpha);
      this.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
      const fallbackNode = this.drawText("enemy-avatar-fallback", "?", drawX + width * 0.5, drawY + height * 0.56, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "52px",
        color: "#bed6eb",
      });
      fallbackNode.setAlpha(avatarAlpha);
      return;
    }

    const bob = disableVisualFx ? 0 : Math.sin(this.time.now * 0.0022) * 2.2;
    this.enemyPortrait.setTexture(textureKey);
    const cover = this.coverSizeForTexture(textureKey, innerW, innerH);
    this.enemyPortrait.setDisplaySize(cover.width, cover.height);
    this.enemyPortrait.setPosition(drawX + width * 0.5, drawY + height * 0.5 + bob);
    this.enemyPortrait.setAlpha(avatarAlpha);
    this.enemyPortrait.setVisible(true);

    this.graphics.fillGradientStyle(
      0xffffff,
      0xffffff,
      0xffffff,
      0xffffff,
      0.1 * avatarAlpha,
      0.1 * avatarAlpha,
      0.02 * avatarAlpha,
      0.13 * avatarAlpha
    );
    this.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
  }

  renderEnemyDefeatEffect(transitionState, layout) {
    const enemyAvatarRect = layout?.enemyAvatarRect || null;
    if (!transitionState || transitionState.target !== "enemy" || transitionState.waiting || !enemyAvatarRect) {
      this.enemyDefeatSignature = "";
      this.enemyDefeatBurstStep = -1;
      this.enemyDefeatLastPulseAt = 0;
      return;
    }
    const room = Number(this.lastSnapshot?.run?.room) || 0;
    const floor = Number(this.lastSnapshot?.run?.floor) || 0;
    const enemyName = String(this.lastSnapshot?.enemy?.name || "");
    const signature = `${floor}:${room}:${enemyName}`;
    if (signature !== this.enemyDefeatSignature) {
      this.enemyDefeatSignature = signature;
      this.enemyDefeatBurstStep = -1;
      this.enemyDefeatLastPulseAt = 0;
    }
    const progress = Phaser.Math.Clamp(Number(transitionState.progress) || 0, 0, 1);
    const centerX = enemyAvatarRect.x + enemyAvatarRect.width * 0.5;
    const centerY = enemyAvatarRect.y + enemyAvatarRect.height * 0.5;
    const glowScale = 1 + progress * 0.54;
    const glowAlpha = 0.22 * (1 - progress * 0.35);
    this.graphics.fillStyle(0xff9a54, glowAlpha);
    this.graphics.fillEllipse(centerX, centerY, enemyAvatarRect.width * glowScale, enemyAvatarRect.height * (0.92 + progress * 0.48));

    const burstStep = Math.floor(progress * RUN_ENEMY_DEFEAT_PULSE_STEPS);
    if (this.enemyDefeatEmitter && burstStep > this.enemyDefeatBurstStep) {
      for (let step = this.enemyDefeatBurstStep + 1; step <= burstStep; step += 1) {
        const burstCount = 12 + step * 4;
        const burstX = centerX + (Math.random() * 2 - 1) * enemyAvatarRect.width * 0.2;
        const burstY = centerY + (Math.random() * 2 - 1) * enemyAvatarRect.height * 0.22;
        this.enemyDefeatEmitter.explode(burstCount, burstX, burstY);
      }
      this.enemyDefeatBurstStep = burstStep;
    }
    const now = this.time.now;
    if (this.enemyDefeatEmitter && now - this.enemyDefeatLastPulseAt >= RUN_ENEMY_DEFEAT_PULSE_INTERVAL_MS) {
      this.enemyDefeatLastPulseAt = now;
      const trailX = centerX + (Math.random() * 2 - 1) * enemyAvatarRect.width * 0.4;
      const trailY = centerY + (Math.random() * 2 - 1) * enemyAvatarRect.height * 0.48;
      this.enemyDefeatEmitter.explode(6, trailX, trailY);
    }
  }

  drawHpBar(keyPrefix, x, y, width, height, value, maxValue, colorHex, options = {}) {
    const compact = this.isCompactLayout(this.scale.gameSize.width);
    const labelWeight = compact ? "800" : "700";
    const safeMax = Math.max(1, Number(maxValue) || 1);
    const safeValue = Math.max(0, Math.min(safeMax, Number(value) || 0));
    const ratio = safeValue / safeMax;
    const trackColor = Number.isFinite(options.trackColor) ? options.trackColor : 0x11151b;
    const borderColor = Number.isFinite(options.borderColor) ? options.borderColor : 0x5f7691;
    const darkTextColor = options.darkTextColor || "#10161d";
    const lightTextColor = options.lightTextColor || "#eef5ff";
    const barRadius = Math.max(6, Math.round(height * 0.5));
    const fillColor = Phaser.Display.Color.HexStringToColor(colorHex).color;

    this.graphics.fillStyle(trackColor, 0.94);
    this.graphics.fillRoundedRect(x, y, width, height, barRadius);
    const fill = Math.max(0, Math.round((width - 4) * ratio));
    if (fill > 0) {
      this.graphics.fillStyle(fillColor, 1);
      this.graphics.fillRoundedRect(x + 2, y + 2, fill, Math.max(1, height - 4), Math.max(4, barRadius - 2));
      const glowLayers = 5;
      for (let i = glowLayers; i >= 1; i -= 1) {
        const t = i / glowLayers;
        const glowAlpha = 0.13 * Math.pow(t, 1.35);
        const expand = Math.round(t * Math.max(2, height * 0.22));
        this.graphics.fillStyle(fillColor, glowAlpha);
        this.graphics.fillRoundedRect(
          x + 2 - expand,
          y + 2 - expand,
          fill + expand * 2,
          Math.max(1, height - 4 + expand * 2),
          Math.max(4, barRadius - 2 + expand)
        );
      }
      this.graphics.fillStyle(0xffffff, 0.18);
      this.graphics.fillRoundedRect(
        x + 4,
        y + 3,
        Math.max(1, fill - 4),
        Math.max(1, Math.round((height - 4) * 0.42)),
        Math.max(3, barRadius - 4)
      );
    }
    this.graphics.lineStyle(1.4, borderColor, 0.56);
    this.graphics.strokeRoundedRect(x, y, width, height, barRadius);

    const labelValue = `HP ${safeValue} / ${safeMax}`;
    const textY = y + height * 0.5;
    const fontSize = `${Math.max(14, Math.round(height * 0.58))}px`;
    this.drawText(
      `${keyPrefix}-label-dark`,
      labelValue,
      x + 10,
      textY,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize,
        color: darkTextColor,
        fontStyle: labelWeight,
      },
      { x: 0, y: 0.5 }
    );
    const lightNode = this.drawText(
      `${keyPrefix}-label-light`,
      labelValue,
      x + 10,
      textY,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize,
        color: lightTextColor,
        fontStyle: labelWeight,
      },
      { x: 0, y: 0.5 }
    );

    const darkStartX = x + 2 + fill;
    const cropStart = Math.max(0, darkStartX - (x + 10));
    const cropWidth = Math.max(0, lightNode.width - cropStart);
    if (cropWidth > 0) {
      lightNode.setCrop(cropStart, 0, cropWidth, lightNode.height);
      lightNode.setVisible(true);
    } else {
      lightNode.setCrop();
      lightNode.setVisible(false);
    }
  }

  processHpImpacts(snapshot, layout, width, height, options = {}) {
    if (!snapshot || !layout) {
      this.lastHpState = null;
      return;
    }
    const deferResolutionUi = Boolean(options?.deferResolutionUi);
    const currentState = {
      enemyName: String(snapshot.enemy?.name || ""),
      enemyHp: Math.max(0, Number(snapshot.enemy?.hp) || 0),
      playerHp: Math.max(0, Number(snapshot.player?.hp) || 0),
    };
    if (snapshot?.intro?.active) {
      this.lastHpState = currentState;
      return;
    }
    if (deferResolutionUi) {
      if (!this.lastHpState || this.lastHpState.enemyName !== currentState.enemyName) {
        this.lastHpState = currentState;
      }
      return;
    }
    if (!this.lastHpState || this.lastHpState.enemyName !== currentState.enemyName) {
      this.lastHpState = currentState;
      return;
    }

    const enemyDamage = Math.max(0, this.lastHpState.enemyHp - currentState.enemyHp);
    const playerDamage = Math.max(0, this.lastHpState.playerHp - currentState.playerHp);
    if (enemyDamage > 0) {
      this.launchDamageFireball("player", "enemy", enemyDamage, layout, width, height);
    }
    if (playerDamage > 0) {
      this.launchDamageFireball("enemy", "player", playerDamage, layout, width, height);
    }
    this.lastHpState = currentState;
  }

  launchDamageFireball(attackerSide, targetSide, amount, layout, width, height) {
    const safeAmount = Math.max(1, Math.round(Number(amount) || 0));
    if (!safeAmount || !layout) {
      return;
    }
    const isPlayerAttacker = attackerSide === "player";
    const fromY = (isPlayerAttacker ? layout.playerY : layout.enemyY) + layout.cardHeight * 0.5;
    const fromX = width * 0.5;
    const toX = targetSide === "enemy"
      ? layout.enemyAvatarX + layout.enemyAvatarW * 0.5
      : layout.playerAvatarX + layout.playerAvatarW * 0.5;
    const toY = targetSide === "enemy"
      ? layout.enemyAvatarY + layout.enemyAvatarH * 0.5
      : layout.playerAvatarY + layout.playerAvatarH * 0.5;
    const controlX = Phaser.Math.Linear(fromX, toX, 0.5) + Phaser.Math.Between(-88, 88);
    const controlY = Math.min(fromY, toY) - Phaser.Math.Between(84, 176);
    const compact = this.isCompactLayout(width);
    const travelDuration = compact ? 430 : 540;
    this.playRunSfx("fireballLaunch", attackerSide, targetSide, safeAmount);

    const glow = this.add
      .image(0, 0, RUN_FIRE_GLOW_PARTICLE_KEY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff9d34)
      .setAlpha(0.92)
      .setScale(compact ? 1.06 : 1.32);
    const flame = this.add
      .image(0, 0, RUN_FIRE_CORE_PARTICLE_KEY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff6a22)
      .setAlpha(0.98)
      .setScale(compact ? 1.24 : 1.56);
    const hotCore = this.add
      .image(0, 0, RUN_FIRE_CORE_PARTICLE_KEY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffd65a)
      .setAlpha(0.96)
      .setScale(compact ? 0.72 : 0.9);
    const ember = this.add
      .image(-(compact ? 14 : 18), compact ? 0 : 1, RUN_FIRE_CORE_PARTICLE_KEY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff3d12)
      .setAlpha(0.7)
      .setScale(compact ? 1 : 1.22);
    const streak = this.add
      .image(-(compact ? 26 : 34), 0, RUN_FIRE_GLOW_PARTICLE_KEY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff6a1f)
      .setAlpha(0.62)
      .setScale(compact ? 0.95 : 1.18);
    const fireball = this.add.container(fromX, fromY, [streak, glow, flame, hotCore, ember]).setDepth(122);
    this.beginResolutionAnimation();
    this.tweens.add({
      targets: [glow, flame, hotCore],
      scaleX: compact ? 1.22 : 1.34,
      scaleY: compact ? 1.22 : 1.34,
      duration: 96,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: travelDuration,
      ease: "Cubic.easeIn",
      onUpdate: (tween) => {
        const t = tween.getValue();
        const inv = 1 - t;
        const x = inv * inv * fromX + 2 * inv * t * controlX + t * t * toX;
        const y = inv * inv * fromY + 2 * inv * t * controlY + t * t * toY;
        fireball.setPosition(x, y);
        const pulse = 1 + Math.sin(t * Math.PI * 18) * 0.1;
        fireball.setScale((compact ? 1.88 : 2.28) * (1 - t * 0.2) * pulse);
        fireball.setRotation(Phaser.Math.Angle.Between(fromX, fromY, x, y) + Math.sin(t * Math.PI * 9) * 0.14);
        if (this.fireTrailEmitter) {
          this.fireTrailEmitter.explode(compact ? 8 : 14, x, y);
        }
      },
      onComplete: () => {
        if (this.fireTrailEmitter) {
          this.fireTrailEmitter.explode(compact ? 52 : 88, toX, toY);
        }
        if (this.fireImpactEmitter) {
          this.fireImpactEmitter.explode(compact ? 120 : 186, toX, toY);
        }
        if (this.resultEmitter) {
          this.resultEmitter.explode(compact ? 52 : 76, toX, toY);
        }
        this.playRunSfx("fireballImpact", safeAmount, targetSide);
        this.triggerAvatarShake(targetSide, compact ? 7.5 : 10, compact ? 220 : 280);
        const blast = this.add
          .image(toX, toY, RUN_FIRE_GLOW_PARTICLE_KEY)
          .setDepth(130)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0xff9f2f)
          .setAlpha(0.94)
          .setScale(compact ? 0.72 : 0.94);
        const coreBlast = this.add
          .image(toX, toY, RUN_FIRE_CORE_PARTICLE_KEY)
          .setDepth(131)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0xffe16e)
          .setAlpha(0.88)
          .setScale(compact ? 0.58 : 0.74);
        const ring = this.add.circle(toX, toY, compact ? 22 : 30, 0xffad46, 0.24).setDepth(129).setBlendMode(Phaser.BlendModes.ADD);
        ring.setStrokeStyle(compact ? 3.2 : 4.2, 0xffca74, 0.8);
        const ringInner = this.add.circle(toX, toY, compact ? 10 : 14, 0xffdd9b, 0.34).setDepth(130).setBlendMode(Phaser.BlendModes.ADD);
        ringInner.setStrokeStyle(compact ? 2 : 2.8, 0xfff0ca, 0.74);
        this.beginResolutionAnimation();
        this.tweens.add({
          targets: blast,
          scaleX: compact ? 3.7 : 4.8,
          scaleY: compact ? 3.7 : 4.8,
          alpha: 0,
          duration: compact ? 260 : 340,
          ease: "Cubic.easeOut",
          onComplete: () => {
            blast.destroy();
            this.endResolutionAnimation();
          },
        });
        this.beginResolutionAnimation();
        this.tweens.add({
          targets: coreBlast,
          scaleX: compact ? 2.6 : 3.4,
          scaleY: compact ? 2.6 : 3.4,
          alpha: 0,
          duration: compact ? 220 : 280,
          ease: "Cubic.easeOut",
          onComplete: () => {
            coreBlast.destroy();
            this.endResolutionAnimation();
          },
        });
        this.beginResolutionAnimation();
        this.tweens.add({
          targets: ring,
          scaleX: compact ? 3.8 : 4.8,
          scaleY: compact ? 3.8 : 4.8,
          alpha: 0,
          duration: compact ? 240 : 300,
          ease: "Cubic.easeOut",
          onComplete: () => {
            ring.destroy();
            this.endResolutionAnimation();
          },
        });
        this.beginResolutionAnimation();
        this.tweens.add({
          targets: ringInner,
          scaleX: compact ? 3 : 3.9,
          scaleY: compact ? 3 : 3.9,
          alpha: 0,
          duration: compact ? 220 : 280,
          ease: "Cubic.easeOut",
          onComplete: () => {
            ringInner.destroy();
            this.endResolutionAnimation();
          },
        });
        this.cameras.main.shake(compact ? 180 : 240, compact ? 0.0033 : 0.0043, true);
        this.cameras.main.flash(compact ? 140 : 180, 255, 140, 42, false);
        fireball.destroy();

        const damageXRaw = targetSide === "enemy"
          ? layout.enemyHpX + layout.enemyHpW * 0.5
          : layout.playerHpX + layout.playerHpW * 0.5;
        const damageYRaw = targetSide === "enemy"
          ? layout.enemyHpY - (compact ? 12 : 16)
          : layout.playerHpY - (compact ? 12 : 16);
        const damageX = Phaser.Math.Clamp(Math.round(damageXRaw), 44, width - 44);
        const damageY = Phaser.Math.Clamp(Math.round(damageYRaw), 24, height - 24);
        this.spawnDamageNumber(targetSide, safeAmount, damageX, damageY);
        this.endResolutionAnimation();
      },
    });
  }

  spawnDamageNumber(targetSide, amount, x, y) {
    const compact = this.isCompactLayout(this.scale.gameSize.width);
    const tone = targetSide === "enemy" ? "#ffd4c6" : "#ffc3c8";
    const node = this.add.text(x, y, `-${Math.max(1, Math.round(amount || 0))}`, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: `${compact ? 34 : 46}px`,
      color: tone,
      fontStyle: "700",
    });
    node.setOrigin(0.5, 0.5);
    node.setDepth(132);
    node.setStroke("#1d0a0d", compact ? 4 : 6);
    node.setShadow(0, 0, "#000000", compact ? 6 : 9, true, true);
    node.setScale(0.72);
    this.beginResolutionAnimation();
    this.tweens.add({
      targets: node,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 150,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: node,
      y: y - (compact ? 24 : 32),
      alpha: 0,
      duration: 620,
      ease: "Cubic.easeOut",
      onComplete: () => {
        node.destroy();
        this.endResolutionAnimation();
      },
    });
  }

  tonePalette(tone) {
    if (tone === "good") {
      return [0xd9ffd5, 0x9be68f, 0x66c66b, 0x9be68f];
    }
    if (tone === "bad") {
      return [0xffe2d8, 0xffb088, 0xff8156, 0xffb088];
    }
    return [0xf6e3ac, 0xffcb7f, 0xff8f59, 0xffcb7f];
  }

  animateResultMessage(node, tone) {
    if (!node) {
      return;
    }
    const compact = this.isCompactLayout(this.scale.gameSize.width);
    const palette = this.tonePalette(tone);
    if (this.resultEmitter) {
      if (typeof this.resultEmitter.setParticleTint === "function") {
        this.resultEmitter.setParticleTint(palette[1]);
      }
      this.resultEmitter.explode(compact ? 22 : 34, node.x, node.y + 12);
    }

    const burstCircle = this.add
      .circle(node.x, node.y + 4, compact ? 28 : 36, palette[2], 0.26)
      .setDepth(132)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.beginResolutionAnimation();
    this.tweens.add({
      targets: burstCircle,
      scaleX: compact ? 2.1 : 2.8,
      scaleY: compact ? 2.1 : 2.8,
      alpha: 0,
      duration: compact ? 250 : 320,
      ease: "Cubic.easeOut",
      onComplete: () => {
        burstCircle.destroy();
        this.endResolutionAnimation();
      },
    });

    node.setScale(compact ? 0.64 : 0.56);
    node.setRotation(-0.04);
    node.setAlpha(0);
    this.beginResolutionAnimation();
    this.tweens.add({
      targets: node,
      scaleX: 1.14,
      scaleY: 1.14,
      alpha: 1,
      rotation: 0.01,
      duration: compact ? 170 : 200,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: node,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          duration: compact ? 100 : 130,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.endResolutionAnimation();
          },
        });
      },
    });

    this.cameras.main.shake(compact ? 110 : 150, compact ? 0.0015 : 0.0019, true);
  }

  setButtonVisual(button, styleName) {
    applyGradientButtonStyle(button, styleName);
  }

  hideAllText() {
    this.textNodes.forEach((node) => node.setVisible(false));
    this.cardTextNodes.forEach((node) => node.setVisible(false));
  }

  drawText(key, value, x, y, style, origin = { x: 0.5, y: 0.5 }) {
    const themedStyle = toBrownThemeTextStyle(style, RUN_BROWN_THEME);
    let node = this.textNodes.get(key);
    if (!node) {
      node = this.add.text(x, y, value, themedStyle).setOrigin(origin.x, origin.y);
      this.textNodes.set(key, node);
    } else {
      node.setStyle(themedStyle);
      node.setOrigin(origin.x, origin.y);
    }
    node.setPosition(x, y);
    node.setText(value);
    node.setVisible(true);
    return node;
  }

}
