import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";
import { createModalCloseButton, drawFramedModalPanel, drawModalBackdrop, placeModalCloseButton } from "./ui/modal-ui.js";

const BUTTON_STYLES = ACTION_BUTTON_STYLE;
const RUN_PARTICLE_KEY = "__run-particle__";
const ENEMY_AVATAR_TEXTURE_PREFIX = "__enemy-avatar__";
const RUN_TOP_BAR_HEIGHT = 74;
const RUN_BOTTOM_BAR_HEIGHT = 106;
const RUN_CHIPS_ICON_KEY = "__run-chips-icon__";
const RUN_CHIPS_ICON_TRIM_KEY = "__run-chips-icon-trim__";
const RUN_RELIC_ICON_KEY = "__run-relic-icon__";
const RUN_WATERMARK_KEY = "__run-watermark__";
const RUN_WATERMARK_RENDER_KEY = "__run-watermark-render__";
const RUN_PRIMARY_GOLD = 0xf2cd88;
const RUN_MODAL_BASE_DEPTH = 300;
const RUN_MODAL_LAYER_STEP = 24;
const RUN_MODAL_CONTENT_OFFSET = 8;
const RUN_MODAL_CLOSE_OFFSET = 14;
const RUN_ACTION_ICONS = Object.freeze({
  hit: "/images/icons/hit.png",
  stand: "/images/icons/stand.png",
  split: "/images/icons/split.png",
  doubleDown: "/images/icons/double.png",
  deal: "/images/icons/deal.png",
  confirmIntro: "/images/icons/deal.png",
});
const RUN_ACTION_ICON_KEYS = Object.freeze({
  hit: "__run-action-hit__",
  stand: "__run-action-stand__",
  split: "__run-action-split__",
  doubleDown: "__run-action-double__",
  deal: "__run-action-deal__",
  confirmIntro: "__run-action-confirm__",
});
const RUN_ACTION_SHORTCUTS = Object.freeze({
  hit: "Z",
  stand: "X",
  split: "S",
  doubleDown: "C",
  deal: "ENTER",
  confirmIntro: "ENTER",
});
const SUIT_SYMBOL = Object.freeze({
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
});
const RUN_TOP_ACTION_ICONS = Object.freeze({
  logs: "/images/icons/log.png",
  home: "/images/icons/home.png",
});
const RUN_TOP_ACTION_ICON_KEYS = Object.freeze({
  logs: "__run-top-action-logs__",
  home: "__run-top-action-home__",
});

const ENEMY_AVATAR_KEY_BY_NAME = Object.freeze({
  "Pit Croupier": "pit-croupier",
  "Tin Dealer": "tin-dealer",
  "Shiv Shark": "shiv-shark",
  "Brick Smiler": "brick-smiler",
  "Card Warden": "card-warden",
  "Ash Gambler": "ash-gambler",
  "Velvet Reaper": "velvet-reaper",
  "Latch Queen": "latch-queen",
  "Bone Accountant": "bone-accountant",
  "Stack Baron": "stack-baron",
  "The House": "the-house",
  "Abyss Banker": "abyss-banker",
  "Null Dealer": "null-dealer",
});

function sanitizeEnemyAvatarKey(name) {
  if (typeof name !== "string") {
    return "";
  }
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    this.fireTrailEmitter = null;
    this.lastHpState = null;
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
    if (!this.textures.exists(RUN_WATERMARK_KEY)) {
      this.load.image(RUN_WATERMARK_KEY, "/images/watermark.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#081420");
    this.cameras.main.setAlpha(1);
    this.graphics = this.add.graphics();
    this.overlayGraphics = this.add.graphics().setDepth(RUN_MODAL_BASE_DEPTH);
    if (this.textures.exists(RUN_WATERMARK_KEY)) {
      const watermarkTexture = this.resolveWatermarkTexture(RUN_WATERMARK_KEY, RUN_WATERMARK_RENDER_KEY);
      this.watermarkBackground = this.add
        .image(this.scale.gameSize.width * 0.5, this.scale.gameSize.height * 0.5, watermarkTexture || RUN_WATERMARK_KEY)
        .setVisible(false)
        .setAlpha(0.26)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setDepth(0);
    }
    const chipsIconKey = this.resolveGoldIconTexture(this.resolveTightTexture(RUN_CHIPS_ICON_KEY, RUN_CHIPS_ICON_TRIM_KEY));
    this.hudChipsIcon = this.add.image(0, 0, chipsIconKey).setVisible(false).setDepth(26);
    this.modalBlocker = this.add
      .zone(0, 0, 1, 1)
      .setOrigin(0, 0)
      .setDepth(RUN_MODAL_BASE_DEPTH + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });
    this.modalBlocker.on("pointerdown", () => {});
    this.ensureRunParticleTexture();

    this.enemyPortrait = this.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(16);
    this.enemyPortraitMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
    this.enemyPortraitMask = this.enemyPortraitMaskShape.createGeometryMask();
    this.enemyPortrait.setMask(this.enemyPortraitMask);
    this.introPortrait = this.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(116);
    this.introPortraitMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
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
      .particles(0, 0, RUN_PARTICLE_KEY, {
        frequency: -1,
        quantity: 4,
        lifespan: { min: 140, max: 260 },
        speed: { min: 16, max: 90 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0.05 },
        alpha: { start: 0.72, end: 0 },
        tint: [0xffe3a6, 0xffa156, 0xff6b3d],
      })
      .setDepth(118)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.fireTrailEmitter.stop();

    this.bindKeyboardInput();
    this.scale.on("resize", this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  teardown() {
    this.scale.off("resize", this.onResize, this);
    this.keyboardHandlers.forEach(({ eventName, handler }) => {
      this.input.keyboard?.off(eventName, handler);
    });
    this.keyboardHandlers = [];
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();
    this.buttonSignature = "";
    this.textNodes.forEach((node) => node.destroy());
    this.textNodes.clear();
    this.cardTextNodes.forEach((node) => node.destroy());
    this.cardTextNodes.clear();
    this.cardNodes.forEach((node) => node.container.destroy());
    this.cardNodes.clear();
    this.cardAnimStates.clear();
    this.cardAnimSeen.clear();
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
    if (this.fireTrailEmitter) {
      this.fireTrailEmitter.destroy();
      this.fireTrailEmitter = null;
    }
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
  }

  ensureRunParticleTexture() {
    if (this.textures.exists(RUN_PARTICLE_KEY)) {
      return;
    }
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture(RUN_PARTICLE_KEY, 16, 16);
    gfx.destroy();
  }

  update(time, delta) {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const adapter = runtime?.legacyAdapter || null;
    if (adapter) {
      adapter.tick(delta, time);
    }
    const snapshot = this.getSnapshot();
    this.lastSnapshot = snapshot;
    this.renderSnapshot(snapshot);
  }

  onResize() {
    if (this.lastSnapshot) {
      this.renderSnapshot(this.lastSnapshot);
    }
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
      this.closeTopModal();
    });
    bind("keydown-TAB", (event) => {
      event.preventDefault();
      const count = Array.isArray(this.lastSnapshot?.passives) ? this.lastSnapshot.passives.length : 0;
      if (count <= 0) {
        return;
      }
      this.toggleModal("relics");
    });
  }

  isModalOpen(modalId) {
    if (modalId === "logs") {
      return Boolean(this.logsModalOpen);
    }
    if (modalId === "relics") {
      return Boolean(this.relicModalOpen);
    }
    return false;
  }

  setModalOpen(modalId, isOpen) {
    const next = Boolean(isOpen);
    if (modalId === "logs") {
      this.logsModalOpen = next;
    } else if (modalId === "relics") {
      this.relicModalOpen = next;
    } else {
      return;
    }
    const currentOrder = this.getModalOpenOrder().filter((id) => id !== modalId);
    if (next) {
      currentOrder.push(modalId);
    }
    this.modalOpenOrder = currentOrder;
  }

  toggleModal(modalId) {
    if (this.isModalOpen(modalId)) {
      const openOrder = this.getModalOpenOrder();
      const topId = openOrder[openOrder.length - 1];
      if (openOrder.length > 1 && topId !== modalId) {
        this.setModalOpen(modalId, true);
        return;
      }
      this.setModalOpen(modalId, false);
      return;
    }
    this.setModalOpen(modalId, true);
  }

  closeTopModal() {
    const openOrder = this.getModalOpenOrder();
    const topModalId = openOrder[openOrder.length - 1];
    if (!topModalId) {
      return false;
    }
    this.setModalOpen(topModalId, false);
    return true;
  }

  closeAllModals() {
    this.setModalOpen("logs", false);
    this.setModalOpen("relics", false);
  }

  getModalOpenOrder() {
    const ordered = Array.isArray(this.modalOpenOrder)
      ? this.modalOpenOrder.filter((id) => id === "logs" || id === "relics")
      : [];
    if (this.logsModalOpen && !ordered.includes("logs")) {
      ordered.push("logs");
    }
    if (this.relicModalOpen && !ordered.includes("relics")) {
      ordered.push("relics");
    }
    return ordered.filter((id) => this.isModalOpen(id));
  }

  getRunApi() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const bridge = runtime?.legacyAdapter?.bridge || null;
    if (!bridge || typeof bridge.getRunApi !== "function") {
      return null;
    }
    return bridge.getRunApi();
  }

  getSnapshot() {
    const api = this.getRunApi();
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
    const api = this.getRunApi();
    const action = api ? api[actionName] : null;
    if (typeof action === "function") {
      action();
    }
  }

  isCompactLayout(width) {
    return width < 760;
  }

  getRunLayout(width, height) {
    const compact = this.isCompactLayout(width);
    const topBarH = compact ? 92 : RUN_TOP_BAR_HEIGHT;
    const bottomBarH = compact ? 98 : RUN_BOTTOM_BAR_HEIGHT;
    const sidePad = Math.max(12, Math.round(width * 0.0125));
    const arenaTop = topBarH + 6;
    const arenaBottom = Math.max(arenaTop + 180, height - bottomBarH - 8);
    const arenaH = Math.max(160, arenaBottom - arenaTop);
    return {
      compact,
      topBarH,
      bottomBarH,
      sidePad,
      arenaX: sidePad,
      arenaY: arenaTop,
      arenaW: Math.max(1, width - sidePad * 2),
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
      if (this.watermarkBackground) {
        this.watermarkBackground.setVisible(false);
      }
      if (this.hudChipsIcon) {
        this.hudChipsIcon.setVisible(false);
      }
      this.rebuildButtons([]);
      this.lastResultSignature = "";
      this.cardAnimStates.clear();
      this.cardAnimSeen.clear();
      this.closeAllModals();
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
      if (this.introPortrait) {
        this.introPortrait.setVisible(false);
      }
      return;
    }

    this.drawBackground(width, height, runLayout);
    this.drawHud(snapshot, width, runLayout);
    const layout = this.drawEncounterPanels(snapshot, width, height, runLayout);
    this.renderRelicButton(snapshot, layout, runLayout);
    this.drawCards(snapshot, width, height, layout);
    this.processHpImpacts(snapshot, layout, width, height);
    this.drawRunMessages(snapshot, width, height, layout);
    this.renderButtons(snapshot, width, height, runLayout);
    this.renderTopActions(snapshot, width, runLayout);
    if (this.logsCloseButton && !this.logsModalOpen) {
      this.logsCloseButton.container.setVisible(false);
    }
    if (this.relicCloseButton && !this.relicModalOpen) {
      this.relicCloseButton.container.setVisible(false);
    }
    const modalOrder = this.getModalOpenOrder();
    modalOrder.forEach((modalId, layerIndex) => {
      if (modalId === "logs") {
        this.drawLogsModal(snapshot, width, height, runLayout, layerIndex);
      } else if (modalId === "relics") {
        this.drawRelicsModal(snapshot, width, height, runLayout, layerIndex);
      }
    });
    this.syncModalBlocker(width, height);
  }

  drawBackground(width, height, runLayout) {
    const watermarkTexture = this.watermarkBackground?.texture?.key || "";
    if (this.watermarkBackground && watermarkTexture && this.textures.exists(watermarkTexture)) {
      const cover = this.coverSizeForTexture(watermarkTexture, width, height);
      this.watermarkBackground
        .setPosition(width * 0.5, height * 0.5)
        .setDisplaySize(cover.width, cover.height)
        .setVisible(true);
    }
    this.graphics.fillGradientStyle(0x0f2238, 0x0f2238, 0x061524, 0x061524, 0.38);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x081726, 0.96);
    this.graphics.fillRect(0, 0, width, runLayout.topBarH);
    this.graphics.fillStyle(0x081726, 0.96);
    this.graphics.fillRect(0, height - runLayout.bottomBarH, width, runLayout.bottomBarH);
    this.graphics.fillStyle(0x050f1b, 0.58);
    this.graphics.fillRoundedRect(runLayout.arenaX, runLayout.arenaY, runLayout.arenaW, runLayout.arenaH, 20);
    this.graphics.lineStyle(1.4, 0x3d6282, 0.48);
    this.graphics.beginPath();
    this.graphics.moveTo(0, runLayout.topBarH + 0.5);
    this.graphics.lineTo(width, runLayout.topBarH + 0.5);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.moveTo(0, height - runLayout.bottomBarH - 0.5);
    this.graphics.lineTo(width, height - runLayout.bottomBarH - 0.5);
    this.graphics.strokePath();
    this.graphics.lineStyle(1.2, 0x3c5f7c, 0.26);
    this.graphics.strokeRoundedRect(runLayout.arenaX, runLayout.arenaY, runLayout.arenaW, runLayout.arenaH, 20);
  }

  drawHud(snapshot, width, runLayout) {
    const run = snapshot.run || {};
    const chips = Number.isFinite(run.chips)
      ? run.chips
      : Number.isFinite(run.player?.gold)
        ? run.player.gold
        : 0;
    const streak = Number.isFinite(run.streak)
      ? run.streak
      : Number.isFinite(run.player?.streak)
        ? run.player.streak
        : 0;
    const guards = Number.isFinite(run.bustGuardsLeft)
      ? run.bustGuardsLeft
      : Number.isFinite(run.player?.bustGuardsLeft)
        ? run.player.bustGuardsLeft
        : 0;
    const floor = Number.isFinite(run.floor) ? run.floor : 1;
    const maxFloor = Number.isFinite(run.maxFloor) ? run.maxFloor : 3;
    const room = Number.isFinite(run.room) ? run.room : 1;
    const roomsPerFloor = Number.isFinite(run.roomsPerFloor) ? run.roomsPerFloor : 5;
    const compact = Boolean(runLayout.compact);
    if (compact) {
      const row1Y = 24;
      const row2Y = 58;
      const leftStartX = runLayout.sidePad + 8;
      if (this.hudChipsIcon) {
        this.hudChipsIcon.setPosition(leftStartX, row1Y);
        this.hudChipsIcon.setDisplaySize(18, 18);
        this.hudChipsIcon.clearTint();
        this.hudChipsIcon.setVisible(true);
      } else {
        this.drawChipIcon(leftStartX, row1Y, 7);
      }
      this.drawText("hud-chips", String(chips), leftStartX + 20, row1Y, {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: "16px",
        color: "#f2cd88",
        fontStyle: "700",
      }, { x: 0, y: 0.5 });
      this.drawText("hud-streak", `Streak ${streak}`, leftStartX + 78, row1Y, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "14px",
        color: "#d8c09a",
        fontStyle: "700",
      }, { x: 0, y: 0.5 });
      this.drawText("hud-guards", `Guards ${guards}`, width - runLayout.sidePad - 4, row1Y, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "14px",
        color: "#d8c09a",
        fontStyle: "700",
      }, { x: 1, y: 0.5 });
      this.drawText("hud-floor-room", `Floor ${floor}/${maxFloor}  Room ${room}/${roomsPerFloor}`, width * 0.5, row2Y, {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: "15px",
        color: "#e2d0af",
        fontStyle: "700",
      }, { x: 0.5, y: 0.5 });
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
    this.drawText("hud-left-stats", `Streak ${streak}   Guards ${guards}`, leftStartX + 74, hudY, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "16px",
      color: "#d8c09a",
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

  resolveTightTexture(sourceKey, outputKey, alphaThreshold = 8) {
    if (!sourceKey || !outputKey || !this.textures.exists(sourceKey)) {
      return sourceKey;
    }
    if (this.textures.exists(outputKey)) {
      return outputKey;
    }
    if (typeof this.textures.createCanvas !== "function") {
      return sourceKey;
    }
    const texture = this.textures.get(sourceKey);
    const sourceImage =
      texture?.getSourceImage?.() ||
      texture?.source?.[0]?.image ||
      texture?.source?.[0]?.source ||
      null;
    const sourceW = Math.max(1, Number(sourceImage?.width) || 0);
    const sourceH = Math.max(1, Number(sourceImage?.height) || 0);
    if (!sourceImage || sourceW < 1 || sourceH < 1) {
      return sourceKey;
    }

    const scanCanvas = document.createElement("canvas");
    scanCanvas.width = sourceW;
    scanCanvas.height = sourceH;
    const scanCtx = scanCanvas.getContext("2d");
    if (!scanCtx) {
      return sourceKey;
    }
    scanCtx.clearRect(0, 0, sourceW, sourceH);
    scanCtx.drawImage(sourceImage, 0, 0);
    const image = scanCtx.getImageData(0, 0, sourceW, sourceH);
    const pixels = image.data;
    let minX = sourceW;
    let minY = sourceH;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sourceH; y += 1) {
      for (let x = 0; x < sourceW; x += 1) {
        const alpha = pixels[(y * sourceW + x) * 4 + 3];
        if (alpha > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      return sourceKey;
    }
    const pad = 2;
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.max(1, Math.min(sourceW - sx, maxX - minX + 1 + pad * 2));
    const sh = Math.max(1, Math.min(sourceH - sy, maxY - minY + 1 + pad * 2));
    const canvasTexture = this.textures.createCanvas(outputKey, sw, sh);
    const ctx = canvasTexture?.getContext?.();
    if (!ctx) {
      return sourceKey;
    }
    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);
    canvasTexture.refresh();
    return outputKey;
  }

  resolveDarkIconTexture(sourceKey) {
    if (!sourceKey || !this.textures.exists(sourceKey)) {
      return sourceKey;
    }
    const cached = this.darkIconTextureBySource.get(sourceKey);
    if (cached && this.textures.exists(cached)) {
      return cached;
    }
    if (typeof this.textures.createCanvas !== "function") {
      return sourceKey;
    }
    const texture = this.textures.get(sourceKey);
    const sourceImage =
      texture?.getSourceImage?.() ||
      texture?.source?.[0]?.image ||
      texture?.source?.[0]?.source ||
      null;
    const sourceW = Math.max(1, Number(sourceImage?.width) || 0);
    const sourceH = Math.max(1, Number(sourceImage?.height) || 0);
    if (!sourceImage || sourceW < 1 || sourceH < 1) {
      return sourceKey;
    }
    const darkKey = `${sourceKey}__dark`;
    if (this.textures.exists(darkKey)) {
      this.darkIconTextureBySource.set(sourceKey, darkKey);
      return darkKey;
    }
    const canvasTexture = this.textures.createCanvas(darkKey, sourceW, sourceH);
    const ctx = canvasTexture?.getContext?.();
    if (!ctx) {
      return sourceKey;
    }
    ctx.clearRect(0, 0, sourceW, sourceH);
    ctx.drawImage(sourceImage, 0, 0);
    const image = ctx.getImageData(0, 0, sourceW, sourceH);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha === 0) {
        continue;
      }
      const luminance = (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
      const value = Math.round(18 + luminance * 34);
      pixels[i] = Math.round(value * 0.95);
      pixels[i + 1] = Math.round(value * 0.78);
      pixels[i + 2] = Math.round(value * 0.58);
    }
    ctx.putImageData(image, 0, 0);
    canvasTexture.refresh();
    this.darkIconTextureBySource.set(sourceKey, darkKey);
    return darkKey;
  }

  resolveGoldIconTexture(sourceKey) {
    if (!sourceKey || !this.textures.exists(sourceKey)) {
      return sourceKey;
    }
    const goldKey = `${sourceKey}__gold`;
    if (this.textures.exists(goldKey)) {
      return goldKey;
    }
    if (typeof this.textures.createCanvas !== "function") {
      return sourceKey;
    }
    const texture = this.textures.get(sourceKey);
    const sourceImage =
      texture?.getSourceImage?.() ||
      texture?.source?.[0]?.image ||
      texture?.source?.[0]?.source ||
      null;
    const sourceW = Math.max(1, Number(sourceImage?.width) || 0);
    const sourceH = Math.max(1, Number(sourceImage?.height) || 0);
    if (!sourceImage || sourceW < 1 || sourceH < 1) {
      return sourceKey;
    }
    const canvasTexture = this.textures.createCanvas(goldKey, sourceW, sourceH);
    const ctx = canvasTexture?.getContext?.();
    if (!ctx) {
      return sourceKey;
    }
    ctx.clearRect(0, 0, sourceW, sourceH);
    ctx.drawImage(sourceImage, 0, 0);
    const image = ctx.getImageData(0, 0, sourceW, sourceH);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha === 0) {
        continue;
      }
      const luminance = (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
      const strength = 0.38 + luminance * 0.62;
      pixels[i] = Math.round(242 * strength);
      pixels[i + 1] = Math.round(205 * strength);
      pixels[i + 2] = Math.round(136 * strength);
    }
    ctx.putImageData(image, 0, 0);
    canvasTexture.refresh();
    return goldKey;
  }

  resolveWatermarkTexture(sourceKey, outputKey) {
    if (!sourceKey || !outputKey || !this.textures.exists(sourceKey)) {
      return sourceKey;
    }
    if (this.textures.exists(outputKey)) {
      return outputKey;
    }
    if (typeof this.textures.createCanvas !== "function") {
      return sourceKey;
    }
    const texture = this.textures.get(sourceKey);
    const sourceImage =
      texture?.getSourceImage?.() ||
      texture?.source?.[0]?.image ||
      texture?.source?.[0]?.source ||
      null;
    const sourceW = Math.max(1, Number(sourceImage?.width) || 0);
    const sourceH = Math.max(1, Number(sourceImage?.height) || 0);
    if (!sourceImage || sourceW < 1 || sourceH < 1) {
      return sourceKey;
    }
    const canvasTexture = this.textures.createCanvas(outputKey, sourceW, sourceH);
    const ctx = canvasTexture?.getContext?.();
    if (!ctx) {
      return sourceKey;
    }
    ctx.clearRect(0, 0, sourceW, sourceH);
    ctx.drawImage(sourceImage, 0, 0);
    const image = ctx.getImageData(0, 0, sourceW, sourceH);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha === 0) {
        continue;
      }
      const boosted = Math.min(255, Math.round(alpha * 9 + 18));
      const strength = boosted / 255;
      pixels[i] = Math.round(188 + strength * 56);
      pixels[i + 1] = Math.round(208 + strength * 44);
      pixels[i + 2] = Math.round(234 + strength * 20);
      pixels[i + 3] = boosted;
    }
    ctx.putImageData(image, 0, 0);
    canvasTexture.refresh();
    return outputKey;
  }

  drawEncounterPanels(snapshot, width, height, runLayout) {
    const enemy = snapshot.enemy || {};
    const player = snapshot.player || {};
    const compact = Boolean(runLayout.compact);
    const enemyAvatarW = compact ? Math.max(96, Math.min(124, Math.round(width * 0.29))) : 146;
    const enemyAvatarH = compact ? Math.round(enemyAvatarW * 1.18) : 176;
    const enemyAvatarX = width - runLayout.sidePad - enemyAvatarW;
    const enemyAvatarY = runLayout.arenaY + (compact ? 8 : 12);
    const enemyInfoRight = enemyAvatarX - (compact ? 10 : 14);
    const enemyInfoLeft = compact
      ? runLayout.sidePad + 2
      : enemyInfoRight - Math.max(220, Math.min(288, Math.round(width * 0.21)));
    const enemyInfoWidth = Math.max(120, enemyInfoRight - enemyInfoLeft);
    const enemyNameY = enemyAvatarY + (compact ? 12 : 14);
    const nameToTypeGap = Math.round((compact ? 20 : 24) * 0.85);
    const typeToHpGap = Math.round((compact ? 10 : 14) * 1.25);
    const enemyTypeY = enemyNameY + nameToTypeGap;
    const enemyHpY = enemyTypeY + typeToHpGap;
    const enemyNameSize = `${Math.round((compact ? 12 : 17) * 1.15)}px`;
    const enemyTypeSize = compact ? "10px" : "12px";

    this.drawText("enemy-name", (enemy.name || "Enemy").toUpperCase(), enemyInfoRight, enemyNameY, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: enemyNameSize,
      color: "#d8c3a0",
      fontStyle: "700",
    }, { x: 1, y: 0.5 });
    this.drawText(
      "enemy-type",
      `${String(enemy.type || "normal").toLowerCase()} encounter`,
      enemyInfoRight,
      enemyTypeY,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: enemyTypeSize,
        color: "#d3bf9f",
        fontStyle: "700",
      },
      { x: 1, y: 0.5 }
    );

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
    this.drawEnemyAvatar(enemy, enemyAvatarX, enemyAvatarY, enemyAvatarW, enemyAvatarH);

    const playerAvatarW = compact ? 78 : 104;
    const playerAvatarH = compact ? 92 : 122;
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
        fontStyle: "700",
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
    const nominalCardWidth = compact ? 64 : 88;
    const nominalCardHeight = Math.round(nominalCardWidth * cardAspect);
    const nominalMessageGap = compact ? 18 : 24;
    const messagePanelH = compact ? 48 : 60;
    const messagePanelW = compact
      ? Phaser.Math.Clamp(width - runLayout.sidePad * 2 - 24, 280, 360)
      : Phaser.Math.Clamp(Math.round(width * 0.44), 500, 640);
    const desiredCenterY = Math.round(runLayout.arenaY + runLayout.arenaH * 0.5);
    const topHandBound = Math.max(
      runLayout.arenaY + (compact ? 96 : 110),
      enemyHpY + (compact ? 34 : 40),
      enemyAvatarY + enemyAvatarH + (compact ? 10 : 14)
    );
    const bottomHandBound = Math.min(
      runLayout.arenaBottom - (compact ? 12 : 16),
      playerAvatarY - (compact ? 8 : 12)
    );
    const messageHalf = Math.round(messagePanelH * 0.5);
    const halfSpan = nominalCardHeight + nominalMessageGap + messageHalf;
    const minCenterY = topHandBound + halfSpan;
    const maxCenterY = bottomHandBound - halfSpan;
    const groupCenterY = minCenterY <= maxCenterY
      ? Phaser.Math.Clamp(desiredCenterY, minCenterY, maxCenterY)
      : desiredCenterY;

    // Keep card and message container sizes static.
    const groupScale = 1;
    const cardHeight = nominalCardHeight;
    const cardWidth = nominalCardWidth;
    const messageGap = nominalMessageGap + messageHalf;
    const enemyRowY = Math.round(groupCenterY - messageGap - cardHeight);
    const playerRowY = Math.round(groupCenterY + messageGap);

    return {
      enemyY: enemyRowY,
      playerY: playerRowY,
      cardWidth,
      cardHeight,
      groupScale,
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
      playerAvatarX,
      playerAvatarY,
      playerAvatarW,
      playerAvatarH,
      messageY: groupCenterY,
      messagePanelW,
      messagePanelH,
      messageMargin: nominalMessageGap,
    };
  }

  renderRelicButton(snapshot, layout, runLayout) {
    if (!this.relicButton) {
      this.relicButton = createGradientButton(this, {
        id: "relics",
        label: "RELICS",
        styleSet: BUTTON_STYLES,
        onPress: () => {
          const count = Array.isArray(this.lastSnapshot?.passives) ? this.lastSnapshot.passives.length : 0;
          if (count <= 0) {
            return;
          }
          this.toggleModal("relics");
        },
        width: 144,
        height: 38,
        fontSize: 18,
        hoverScale: 1,
        pressedScale: 0.98,
      });
      this.relicButton.container.setDepth(86);
      const icon = this.add
        .image(0, 0, this.resolveDarkIconTexture(RUN_RELIC_ICON_KEY))
        .setDisplaySize(18, 18)
        .setAlpha(0.92);
      const shortcut = this.add
        .text(0, 0, "TAB", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "12px",
          color: "#000000",
          fontStyle: "700",
        })
        .setOrigin(1, 0.5)
        .setAlpha(0.5);
      this.relicButton.container.add([icon, shortcut]);
      this.relicButton.icon = icon;
      this.relicButton.shortcut = shortcut;
    }
    const entries = Array.isArray(snapshot?.passives) ? snapshot.passives : [];
    const count = entries.length;
    if (count <= 0) {
      this.setModalOpen("relics", false);
    }
    const compact = Boolean(runLayout?.compact);
    const desiredButtonW = compact ? 170 : 220;
    const availableButtonW = Math.max(120, Math.round(layout.playerInfoWidth || desiredButtonW));
    const buttonW = Math.max(120, Math.min(desiredButtonW, availableButtonW));
    const buttonH = compact ? 40 : 50;
    const x = Math.round(layout.playerInfoLeft + buttonW * 0.5);
    const y = Math.round(layout.playerHpY + layout.playerHpH + (compact ? 30 : 36));
    setGradientButtonSize(this.relicButton, buttonW, buttonH);
    this.relicButton.container.setPosition(x, y);
    const relicLabel = `RELICS (${count})`;
    this.relicButton.text.setText(relicLabel);
    let relicFontSize = compact ? 16 : 18;
    this.relicButton.text.setFontSize(relicFontSize);
    const relicTextMaxW = Math.max(64, buttonW - (compact ? 82 : 98));
    while (this.relicButton.text.width > relicTextMaxW && relicFontSize > 12) {
      relicFontSize -= 1;
      this.relicButton.text.setFontSize(relicFontSize);
    }
    this.relicButton.text.setOrigin(0, 0.5);
    this.relicButton.text.setPosition(-buttonW * 0.5 + (compact ? 36 : 46), 0);
    this.relicButton.text.setAlign("left");
    if (this.relicButton.icon) {
      this.relicButton.icon.setTexture(this.resolveDarkIconTexture(RUN_RELIC_ICON_KEY));
      this.relicButton.icon.setDisplaySize(compact ? 18 : 22, compact ? 18 : 22);
      this.relicButton.icon.setPosition(-buttonW * 0.5 + (compact ? 16 : 22), 0);
      this.relicButton.icon.setVisible(true);
    }
    if (this.relicButton.shortcut) {
      this.relicButton.shortcut.setText("TAB");
      this.relicButton.shortcut.setFontSize(compact ? 11 : 13);
      this.relicButton.shortcut.setPosition(buttonW * 0.5 - (compact ? 16 : 24), 0);
      this.relicButton.shortcut.setVisible(true);
    }
    this.relicButton.enabled = count > 0;
    this.setButtonVisual(this.relicButton, this.relicButton.enabled ? "idle" : "disabled");
    this.relicButton.container.setAlpha(this.relicButton.enabled ? 1 : 0.84);
    this.relicButton.container.setVisible(true);
  }

  drawPlayerAvatar(x, y, width, height) {
    this.graphics.fillStyle(0x2a2017, 1);
    this.graphics.fillRoundedRect(x, y, width, height, 18);
    this.graphics.lineStyle(1.8, 0x8a6940, 1);
    this.graphics.strokeRoundedRect(x, y, width, height, 18);

    const inset = 10;
    const innerX = x + inset;
    const innerY = y + inset;
    const innerW = width - inset * 2;
    const innerH = height - inset * 2;
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

  drawEnemyAvatar(enemy, x, y, width, height) {
    this.graphics.fillStyle(0x1c2f43, 0.95);
    this.graphics.fillRoundedRect(x, y, width, height, 14);
    this.graphics.lineStyle(1.8, 0x516f8f, 0.5);
    this.graphics.strokeRoundedRect(x, y, width, height, 14);

    const pulse = Math.sin(this.time.now * 0.004) * 0.5 + 0.5;
    this.graphics.lineStyle(2.1, this.enemyAccent(enemy?.type), 0.26 + pulse * 0.22);
    this.graphics.strokeRoundedRect(x - 1, y - 1, width + 2, height + 2, 15);

    const innerPad = 6;
    const innerX = x + innerPad;
    const innerY = y + innerPad;
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
      this.graphics.fillStyle(0x1a3146, 0.92);
      this.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
      this.drawText("enemy-avatar-fallback", "?", x + width * 0.5, y + height * 0.56, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "52px",
        color: "#bed6eb",
      });
      return;
    }

    const bob = Math.sin(this.time.now * 0.0022) * 2.2;
    this.enemyPortrait.setTexture(textureKey);
    const cover = this.coverSizeForTexture(textureKey, innerW, innerH);
    this.enemyPortrait.setDisplaySize(cover.width, cover.height);
    this.enemyPortrait.setPosition(x + width * 0.5, y + height * 0.5 + bob);
    this.enemyPortrait.setVisible(true);

    this.graphics.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.1, 0.1, 0.02, 0.13);
    this.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
  }

  drawHpBar(keyPrefix, x, y, width, height, value, maxValue, colorHex, options = {}) {
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
        fontStyle: "700",
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
        fontStyle: "700",
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

  drawCards(snapshot, width, height, layout) {
    if (snapshot?.intro?.active) {
      this.cardAnimSeen.clear();
      this.cardNodes.forEach((node) => node.container.setVisible(false));
      this.pruneCardAnimations();
      return;
    }
    const enemyY = layout?.enemyY || Math.round(height * 0.26);
    const playerY = layout?.playerY || Math.round(height * 0.59);
    const cardWidth = layout?.cardWidth || 88;
    const cardHeight = layout?.cardHeight || Math.round(cardWidth * 1.42);
    const enemyCards = Array.isArray(snapshot.cards?.dealer) ? snapshot.cards.dealer : [];
    const playerCards = Array.isArray(snapshot.cards?.player) ? snapshot.cards.player : [];
    const compact = this.isCompactLayout(width);
    const computeSpacing = (count) => {
      const base = Math.max(Math.round(cardWidth * (compact ? 0.68 : 0.74)), compact ? 32 : 44);
      if (!Number.isFinite(count) || count <= 1) {
        return base;
      }
      const maxSpan = Math.max(cardWidth, width - (compact ? 84 : 220));
      const cap = Math.floor((maxSpan - cardWidth) / Math.max(1, count - 1));
      const minSpacing = Math.max(Math.round(cardWidth * 0.38), compact ? 20 : 28);
      return Phaser.Math.Clamp(Math.min(base, cap), minSpacing, base);
    };
    const enemySpacing = computeSpacing(enemyCards.length);
    const playerSpacing = computeSpacing(playerCards.length);

    const enemyCenterX = width * 0.5;
    const playerCenterX = width * 0.5;
    const deckX = width * 0.5;
    this.cardAnimSeen.clear();
    this.drawCardRow(
      "enemy-card",
      enemyCards,
      enemyCenterX,
      enemyY,
      cardWidth,
      cardHeight,
      enemySpacing,
      { x: deckX, y: Math.max(84, enemyY - 120) }
    );
    this.drawCardRow(
      "player-card",
      playerCards,
      playerCenterX,
      playerY,
      cardWidth,
      cardHeight,
      playerSpacing,
      { x: deckX, y: Math.min(height - 84, playerY + cardHeight + 120) }
    );
    this.pruneCardAnimations();

    const totals = snapshot.totals || {};
    const enemyHasHidden = enemyCards.some((card) => card.hidden);
    const enemyHandValue = Number.isFinite(totals.dealer) ? String(totals.dealer) : "?";
    const enemyTotalText = enemyHasHidden && Number.isFinite(totals.dealer) ? `Hand ${enemyHandValue} + ?` : `Hand ${enemyHandValue}`;
    const playerTotalText = Number.isFinite(totals.player) ? `Hand ${totals.player}` : "Hand ?";
    const handLabelGap = 18;
    this.drawText(
      "enemy-total",
      enemyTotalText,
      width * 0.5,
      enemyY - handLabelGap,
      {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: "17px",
        color: "#e0ccb0",
        fontStyle: "700",
      },
      { x: 0.5, y: 0.5 }
    );
    this.drawText(
      "player-total",
      playerTotalText,
      width * 0.5,
      playerY + cardHeight + handLabelGap,
      {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: "17px",
        color: "#e0ccb0",
        fontStyle: "700",
      },
      { x: 0.5, y: 0.5 }
    );
  }

  processHpImpacts(snapshot, layout, width, height) {
    if (!snapshot || !layout) {
      this.lastHpState = null;
      return;
    }
    const currentState = {
      enemyName: String(snapshot.enemy?.name || ""),
      enemyHp: Math.max(0, Number(snapshot.enemy?.hp) || 0),
      playerHp: Math.max(0, Number(snapshot.player?.hp) || 0),
    };
    if (snapshot?.intro?.active) {
      this.lastHpState = currentState;
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
    const controlX = Phaser.Math.Linear(fromX, toX, 0.5) + Phaser.Math.Between(-56, 56);
    const controlY = Math.min(fromY, toY) - Phaser.Math.Between(52, 128);
    const compact = this.isCompactLayout(width);

    const halo = this.add.circle(0, 0, compact ? 11 : 14, 0xffa54d, 0.38).setBlendMode(Phaser.BlendModes.ADD);
    const shell = this.add.circle(0, 0, compact ? 7 : 9, 0xff6a2c, 0.96).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.circle(0, 0, compact ? 3 : 4, 0xfff3c2, 1).setBlendMode(Phaser.BlendModes.ADD);
    const fireball = this.add.container(fromX, fromY, [halo, shell, core]).setDepth(120);
    this.tweens.add({
      targets: halo,
      scaleX: 1.34,
      scaleY: 1.34,
      duration: 92,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: compact ? 360 : 430,
      ease: "Cubic.easeInOut",
      onUpdate: (tween) => {
        const t = tween.getValue();
        const inv = 1 - t;
        const x = inv * inv * fromX + 2 * inv * t * controlX + t * t * toX;
        const y = inv * inv * fromY + 2 * inv * t * controlY + t * t * toY;
        fireball.setPosition(x, y);
        const pulse = 1 + Math.sin(t * Math.PI * 12) * 0.06;
        fireball.setScale((1.12 - t * 0.26) * pulse);
        if (this.fireTrailEmitter) {
          if (typeof this.fireTrailEmitter.setParticleTint === "function") {
            this.fireTrailEmitter.setParticleTint(0xffe5b8);
          }
          this.fireTrailEmitter.explode(2, x, y);
        }
      },
      onComplete: () => {
        if (this.fireTrailEmitter) {
          if (typeof this.fireTrailEmitter.setParticleTint === "function") {
            this.fireTrailEmitter.setParticleTint(0xffc982);
          }
          this.fireTrailEmitter.explode(compact ? 24 : 34, toX, toY);
        }
        if (this.resultEmitter) {
          if (typeof this.resultEmitter.setParticleTint === "function") {
            this.resultEmitter.setParticleTint(0xffc982);
          }
          this.resultEmitter.explode(compact ? 16 : 22, toX, toY);
        }
        const ring = this.add.circle(toX, toY, compact ? 14 : 18, 0xffc982, 0.36).setDepth(119).setBlendMode(Phaser.BlendModes.ADD);
        ring.setStrokeStyle(compact ? 2 : 3, 0xfff0c5, 0.82);
        this.tweens.add({
          targets: ring,
          scaleX: compact ? 2.2 : 2.5,
          scaleY: compact ? 2.2 : 2.5,
          alpha: 0,
          duration: 220,
          ease: "Cubic.easeOut",
          onComplete: () => ring.destroy(),
        });
        this.cameras.main.shake(compact ? 70 : 100, compact ? 0.0015 : 0.0021, true);
        fireball.destroy();

        const damageXRaw = targetSide === "enemy"
          ? layout.enemyHpX + layout.enemyHpW + (compact ? 14 : 20)
          : layout.playerInfoLeft + layout.playerInfoWidth + (compact ? 14 : 20);
        const damageY = targetSide === "enemy"
          ? layout.enemyHpY + layout.enemyHpH * 0.5
          : layout.playerHpY + layout.playerHpH * 0.5;
        const damageX = Phaser.Math.Clamp(Math.round(damageXRaw), 44, width - 44);
        this.spawnDamageNumber(targetSide, safeAmount, damageX, Math.round(damageY));
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
    node.setDepth(125);
    node.setStroke("#1d0a0d", compact ? 4 : 6);
    node.setShadow(0, 0, "#000000", compact ? 6 : 9, true, true);
    node.setScale(0.72);
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
      onComplete: () => node.destroy(),
    });
  }

  drawCardRow(prefix, cards, centerX, y, cardW, cardH, spacing, spawn = null) {
    const safeCards = Array.isArray(cards) ? cards : [];
    const totalWidth = safeCards.length > 0 ? cardW + Math.max(0, safeCards.length - 1) * spacing : cardW;
    const startX = centerX - totalWidth * 0.5;
    const used = new Set();
    const now = this.time.now;
    const rowDirection = prefix.startsWith("enemy") ? -1 : 1;
    const baseSpawnX = Number.isFinite(spawn?.x) ? spawn.x : centerX;
    const baseSpawnY = Number.isFinite(spawn?.y) ? spawn.y : y + rowDirection * -104;

    safeCards.forEach((card, idx) => {
      const key = `${prefix}-${idx}`;
      const targetX = startX + idx * spacing;
      const targetCenterX = targetX + cardW * 0.5;
      const targetCenterY = y + cardH * 0.5;
      const animKey = `${prefix}-${idx}-${card.rank || "?"}-${card.suit || ""}-${card.hidden ? 1 : 0}`;
      let anim = this.cardAnimStates.get(animKey);
      if (!anim) {
        anim = {
          start: now + idx * 42,
          fromX: baseSpawnX + rowDirection * 14,
          fromY: baseSpawnY + idx * rowDirection * 5,
          lastSeen: now,
        };
        this.cardAnimStates.set(animKey, anim);
      }
      anim.lastSeen = now;
      this.cardAnimSeen.add(animKey);

      const progress = Phaser.Math.Clamp((now - anim.start) / 220, 0, 1);
      const eased = Phaser.Math.Easing.Cubic.Out(progress);
      const arc = Math.sin(progress * Math.PI) * 16 * (rowDirection === -1 ? 1 : -1);
      const scale = 0.66 + Phaser.Math.Easing.Back.Out(progress) * 0.34;
      const drawCenterX = Phaser.Math.Linear(anim.fromX, targetCenterX, eased);
      const drawCenterY = Phaser.Math.Linear(anim.fromY, targetCenterY, eased) + arc * (1 - progress * 0.72);
      const drawW = cardW * scale;
      const drawH = cardH * scale;
      const node = this.getCardNode(key);
      node.container.setDepth((prefix.startsWith("enemy") ? 44 : 56) + idx);
      node.container.setPosition(drawCenterX, drawCenterY);
      node.shadow.clear();
      const shadowRadius = Math.max(8, 10 * scale);
      const shadowSpread = Math.max(5, 7 * scale);
      const shadowOffsetX = -Math.max(2, Math.round(4 * scale));
      node.shadow.fillStyle(0x000000, 0.03);
      node.shadow.fillRoundedRect(
        -drawW * 0.5 - shadowSpread * 1.8 + shadowOffsetX,
        -drawH * 0.5 - shadowSpread * 0.34,
        drawW + shadowSpread * 2.7,
        drawH + shadowSpread * 0.68,
        shadowRadius + shadowSpread * 0.42
      );
      node.shadow.fillStyle(0x000000, 0.045);
      node.shadow.fillRoundedRect(
        -drawW * 0.5 - shadowSpread * 1.2 + shadowOffsetX,
        -drawH * 0.5 - shadowSpread * 0.24,
        drawW + shadowSpread * 2.05,
        drawH + shadowSpread * 0.48,
        shadowRadius + shadowSpread * 0.32
      );
      node.shadow.fillStyle(0x000000, 0.06);
      node.shadow.fillRoundedRect(
        -drawW * 0.5 - shadowSpread * 0.72 + shadowOffsetX,
        -drawH * 0.5 - shadowSpread * 0.12,
        drawW + shadowSpread * 1.3,
        drawH + shadowSpread * 0.24,
        shadowRadius + shadowSpread * 0.22
      );
      node.face.clear();
      node.face.fillStyle(card.hidden ? 0x2a445c : 0xf7fbff, 1);
      node.face.fillRoundedRect(-drawW * 0.5, -drawH * 0.5, drawW, drawH, Math.max(8, 10 * scale));
      node.label.setFontSize(Math.max(24, Math.round(cardW * 0.3 * scale)));
      node.label.setStyle({
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        align: "center",
        lineSpacing: 5,
        color: "#231f1b",
      });
      used.add(key);
      node.container.setVisible(true);

      const suitKey = card.suit || "";
      const suitSymbol = SUIT_SYMBOL[suitKey] || suitKey || "";
      const text = card.hidden ? "?" : `${card.rank || "?"}\n${suitSymbol}`;
      const suit = card.suit || "";
      const red = suit === "H" || suit === "D";
      const color = card.hidden ? "#d6e9f8" : red ? "#b44c45" : "#231f1b";
      node.label.setText(text);
      node.label.setColor(color);
    });

    this.cardNodes.forEach((node, key) => {
      if (key.startsWith(prefix) && !used.has(key)) {
        node.container.setVisible(false);
      }
    });
  }

  getCardNode(key) {
    let node = this.cardNodes.get(key);
    if (node) {
      return node;
    }
    const container = this.add.container(0, 0);
    const shadow = this.add.graphics();
    const face = this.add.graphics();
    const label = this.add
      .text(0, 0, "", {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "28px",
        color: "#231f1b",
        align: "center",
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0.5);
    container.add([shadow, face, label]);
    node = { container, shadow, face, label };
    this.cardNodes.set(key, node);
    return node;
  }

  pruneCardAnimations() {
    const now = this.time.now;
    this.cardAnimStates.forEach((state, key) => {
      if (!this.cardAnimSeen.has(key) && now - (state.lastSeen || 0) > 80) {
        this.cardAnimStates.delete(key);
      }
    });
  }

  drawRunMessages(snapshot, width, height, layout = null) {
    const intro = snapshot.intro || {};
    const enemy = snapshot.enemy || {};
    const introTarget = intro.active ? 1 : 0;
    this.introOverlayProgress = introTarget;

    if (this.introOverlayProgress > 0.02) {
      const overlayAlpha = 0.42 * this.introOverlayProgress;
      this.graphics.fillStyle(0x000000, overlayAlpha);
      this.graphics.fillRect(0, 0, width, height);
    }

    if (intro.active || this.introOverlayProgress > 0.02) {
      const compact = this.isCompactLayout(width);
      const introScale = 1.725;
      const baseModalW = compact
        ? Math.max(320, Math.min(width - 22, Math.round(width * 0.94)))
        : Math.max(760, Math.min(1080, Math.round(width * 0.86)));
      const baseModalH = compact
        ? Math.max(190, Math.min(262, Math.round(height * 0.33)))
        : Math.max(238, Math.min(336, Math.round(height * 0.41)));
      const modalW = compact
        ? Math.max(208, Math.min(width - 20, Math.round(baseModalW * 0.5 * introScale)))
        : Math.max(384, Math.min(width - 28, Math.round(baseModalW * 0.5 * introScale)));
      const modalH = compact
        ? Math.max(126, Math.min(height - 20, Math.round(baseModalH * 0.5 * introScale)))
        : Math.max(170, Math.min(height - 24, Math.round(baseModalH * 0.5 * introScale)));
      const eased = Phaser.Math.Easing.Sine.InOut(this.introOverlayProgress);
      const x = width * 0.5 - modalW * 0.5;
      const y = height * 0.5 - modalH * 0.5 + (1 - eased) * 20;
      const alpha = Math.min(1, this.introOverlayProgress + 0.02);

      this.graphics.fillStyle(0x050b14, 0.48 * alpha);
      this.graphics.fillRoundedRect(x + 2, y + 4, modalW, modalH, compact ? 14 : 20);
      this.graphics.fillGradientStyle(0x1b2f47, 0x1c324a, 0x0f1f33, 0x102033, 0.96 * alpha, 0.96 * alpha, 0.96 * alpha, 0.96 * alpha);
      this.graphics.fillRoundedRect(x, y, modalW, modalH, compact ? 12 : 18);
      this.graphics.lineStyle(2.2, 0x7097bb, 0.56 * alpha);
      this.graphics.strokeRoundedRect(x, y, modalW, modalH, compact ? 12 : 18);
      this.graphics.lineStyle(1.3, 0xc9def1, 0.2 * alpha);
      this.graphics.strokeRoundedRect(x + 4, y + 4, modalW - 8, modalH - 8, compact ? 8 : 12);

      const modalPad = compact ? 10 : 14;
      const avatarOuter = compact
        ? Math.max(56, Math.min(72, modalH - modalPad * 2))
        : Math.max(90, Math.min(122, modalH - modalPad * 2));
      const avatarOuterX = x + modalPad;
      const avatarOuterY = y + modalPad;
      this.graphics.fillStyle(0x223953, 0.96 * alpha);
      this.graphics.fillRoundedRect(avatarOuterX, avatarOuterY, avatarOuter, avatarOuter, compact ? 10 : 14);
      this.graphics.lineStyle(2.2, 0x6d95ba, 0.68 * alpha);
      this.graphics.strokeRoundedRect(avatarOuterX, avatarOuterY, avatarOuter, avatarOuter, compact ? 10 : 14);

      const avatarPad = compact ? 5 : 7;
      const avatarInnerX = avatarOuterX + avatarPad;
      const avatarInnerY = avatarOuterY + avatarPad;
      const avatarInnerW = avatarOuter - avatarPad * 2;
      const avatarInnerH = avatarOuter - avatarPad * 2;

      if (this.introPortraitMaskShape) {
        this.introPortraitMaskShape.clear();
        this.introPortraitMaskShape.fillStyle(0xffffff, 1);
        this.introPortraitMaskShape.fillRoundedRect(avatarInnerX, avatarInnerY, avatarInnerW, avatarInnerH, compact ? 8 : 10);
      }

      const introAvatarTexture = this.resolveEnemyAvatarTexture(enemy);
      if (introAvatarTexture && this.introPortrait) {
        this.introPortrait.setTexture(introAvatarTexture);
        const cover = this.coverSizeForTexture(introAvatarTexture, avatarInnerW, avatarInnerH);
        this.introPortrait.setDisplaySize(cover.width, cover.height);
        this.introPortrait.setPosition(avatarOuterX + avatarOuter * 0.5, avatarOuterY + avatarOuter * 0.5);
        this.introPortrait.setVisible(true);
        this.introPortrait.setAlpha(alpha);
        const fallbackNode = this.textNodes.get("intro-avatar-fallback");
        if (fallbackNode) {
          fallbackNode.setVisible(false);
        }
      } else {
        if (this.introPortrait) {
          this.introPortrait.setVisible(false);
        }
        this.graphics.fillStyle(0x1a3146, 0.94 * alpha);
        this.graphics.fillRoundedRect(avatarInnerX, avatarInnerY, avatarInnerW, avatarInnerH, compact ? 8 : 10);
        this.drawText("intro-avatar-fallback", "?", avatarOuterX + avatarOuter * 0.5, avatarOuterY + avatarOuter * 0.56, {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: compact ? "36px" : "46px",
          color: "#bed6eb",
        });
      }

      const textX = avatarOuterX + avatarOuter + (compact ? 8 : 14);
      const textW = Math.max(70, modalW - (textX - x) - (compact ? 10 : 16));
      const title = String(enemy.name || "ENEMY").toUpperCase();
      const encounterType = `${String(enemy.type || "normal").toLowerCase()} encounter`;
      const bodyText = intro.text || "";
      const typeCursor = !intro.ready && Math.floor(this.time.now / 220) % 2 === 0 ? "|" : "";
      const titleSize = Math.round((compact ? 10 : 24) * introScale);
      const typeSize = Math.round((compact ? 7 : 12) * introScale);
      const bodySize = Math.round((compact ? 10 : 13) * introScale);
      const textTopY = y + modalPad + (compact ? 8 : 12);
      const titleY = textTopY;
      const typeY = titleY + Math.round(titleSize * 0.92) + (compact ? 6 : 10);
      const bodyY = typeY + Math.round(typeSize * 1.04) + (compact ? 8 : 12);

      if (intro.active) {
        this.drawText("intro-title", title, textX, titleY, {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: `${titleSize}px`,
          color: "#84b7f8",
          fontStyle: "700",
        }, { x: 0, y: 0.5 });
        this.drawText("intro-type", encounterType, textX, typeY, {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: `${typeSize}px`,
          color: "#9ab5d2",
          fontStyle: "600",
        }, { x: 0, y: 0.5 });
        this.drawText("intro-body", `${bodyText}${typeCursor}`, textX, bodyY, {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: `${bodySize}px`,
          color: "#d8e5f4",
          align: "left",
          lineSpacing: compact ? 4 : 6,
          wordWrap: { width: textW },
        }, { x: 0, y: 0 });
      }

      if (!this.introCtaButton) {
        this.introCtaButton = createGradientButton(this, {
          id: "intro-cta",
          label: "LET'S GO!",
          styleSet: BUTTON_STYLES,
          onPress: () => {
            if (this.lastSnapshot?.intro?.active && this.lastSnapshot?.intro?.ready) {
              this.invokeAction("confirmIntro");
            }
          },
          width: 196,
          height: 44,
          fontSize: 18,
          hoverScale: 1,
          pressedScale: 0.98,
        });
        this.introCtaButton.container.setDepth(236);
      }
      const ctaW = compact ? 118 : 170;
      const ctaH = compact ? 32 : 42;
      const ctaX = x + modalW - modalPad - ctaW * 0.5;
      const ctaY = y + modalH - modalPad - ctaH * 0.5;
      setGradientButtonSize(this.introCtaButton, ctaW, ctaH);
      this.introCtaButton.container.setPosition(ctaX, ctaY);
      this.introCtaButton.text.setFontSize(compact ? 12 : 16);
      this.introCtaButton.text.setText("LET'S GO!");
      this.introCtaButton.enabled = Boolean(intro.active && intro.ready);
      this.setButtonVisual(this.introCtaButton, this.introCtaButton.enabled ? "idle" : "disabled");
      this.introCtaButton.container.setVisible(Boolean(intro.active));
      return;
    }

    if (this.introPortrait) {
      this.introPortrait.setVisible(false);
    }
    const introFallback = this.textNodes.get("intro-avatar-fallback");
    if (introFallback) {
      introFallback.setVisible(false);
    }
    if (this.introCtaButton) {
      this.introCtaButton.container.setVisible(false);
    }

    const resultText = snapshot.resultText || snapshot.announcement || "";
    if (!resultText) {
      this.lastResultSignature = "";
      return;
    }

    const tone = snapshot.resultTone || "neutral";
    const panelY = Math.round(layout?.messageY || height * 0.507);
    const maxPanelW = Math.round(layout?.messagePanelW || Phaser.Math.Clamp(Math.round(width * 0.44), 500, 640));
    const panelH = Math.round(layout?.messagePanelH || 60);
    const compact = this.isCompactLayout(width);
    const minPanelW = compact ? 220 : 300;
    const panelPadX = compact ? 20 : 26;
    const panelPadY = compact ? 12 : 14;
    let messageFontSize = compact ? 16 : 20;
    const minMessageFontSize = compact ? 13 : 15;
    const measureStyle = {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: `${messageFontSize}px`,
      color: "#e8e2d2",
      fontStyle: "700",
    };
    const measureNode = this.drawText("run-result-measure", resultText, -4000, -4000, measureStyle, { x: 0, y: 0 });
    while (measureNode.width > maxPanelW - panelPadX * 2 && messageFontSize > minMessageFontSize) {
      messageFontSize -= 1;
      measureNode.setFontSize(messageFontSize);
    }
    const panelW = Phaser.Math.Clamp(
      Math.round(measureNode.width + panelPadX * 2),
      minPanelW,
      maxPanelW
    );
    measureNode.setVisible(false);
    const toneFill =
      tone === "good" || tone === "win"
        ? 0x184b3d
        : tone === "bad" || tone === "loss"
          ? 0x4a2323
          : 0x3f3321;
    const toneStroke =
      tone === "good" || tone === "win"
        ? 0x76cfad
        : tone === "bad" || tone === "loss"
          ? 0xd98b8a
          : 0xd8b780;
    this.graphics.fillStyle(toneFill, 0.95);
    this.graphics.fillRoundedRect(width * 0.5 - panelW * 0.5, panelY - panelH * 0.5, panelW, panelH, 16);
    this.graphics.lineStyle(2.2, toneStroke, 0.85);
    this.graphics.strokeRoundedRect(width * 0.5 - panelW * 0.5, panelY - panelH * 0.5, panelW, panelH, 16);
    const node = this.drawText("run-result", resultText, width * 0.5, panelY + Math.round(panelPadY * 0.04), {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: `${messageFontSize}px`,
      color: "#e8e2d2",
      fontStyle: "700",
      align: "center",
    });

    const signature = `${tone}|${resultText}`;
    if (signature !== this.lastResultSignature) {
      this.lastResultSignature = signature;
      this.animateResultMessage(node, tone);
    }
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
    const palette = this.tonePalette(tone);
    if (this.resultEmitter) {
      if (typeof this.resultEmitter.setParticleTint === "function") {
        this.resultEmitter.setParticleTint(palette[1]);
      }
      this.resultEmitter.explode(28, node.x, node.y + 12);
    }

    node.setScale(0.84);
    node.setAlpha(0.44);
    this.tweens.add({
      targets: node,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 260,
      ease: "Sine.easeInOut",
    });

    this.cameras.main.shake(120, 0.0014, true);
  }

  renderButtons(snapshot, width, height, runLayout) {
    const actions = [];
    const introActive = Boolean(snapshot.intro?.active);
    const status = snapshot.status || {};
    const compact = Boolean(runLayout.compact);

    if (introActive) {
      // Intro confirm is rendered inside the dialogue modal.
    } else {
      const showTurnActions = Boolean(status.canHit || status.canStand || status.canDouble || status.canSplit);
      if (showTurnActions) {
        if (status.canHit) {
          actions.push({ id: "hit", label: "HIT", enabled: true });
        }
        if (status.canStand) {
          actions.push({ id: "stand", label: "STAND", enabled: true });
        }
        actions.push({ id: "doubleDown", label: "DOUBLE", enabled: Boolean(status.canDouble) });
        if (status.canSplit) {
          actions.push({ id: "split", label: "SPLIT", enabled: true });
        }
      } else {
        actions.push({ id: "deal", label: "DEAL", enabled: Boolean(status.canDeal) });
      }
    }

    this.rebuildButtons(actions);
    const count = actions.length;
    let spacing = compact ? 8 : 14;
    const singleWide = count <= 1;
    const buttonH = compact ? 48 : 56;
    const bandW = Math.max(220, width - runLayout.sidePad * 2 - 8);
    const singleActionId = singleWide && actions[0] ? actions[0].id : "";
    const singleWideFactor = singleActionId === "deal" ? 0.34 : 0.62;
    let buttonW = singleWide
      ? Phaser.Math.Clamp(
        Math.round(bandW * singleWideFactor),
        compact ? 118 : 164,
        compact ? 220 : 300
      )
      : Phaser.Math.Clamp(
        Math.floor((bandW - spacing * Math.max(0, count - 1)) / Math.max(1, count)),
        compact ? 82 : 160,
        compact ? 190 : 236
      );
    if (!singleWide && count > 1) {
      let totalCandidate = buttonW * count + spacing * (count - 1);
      if (totalCandidate > bandW) {
        buttonW = Math.max(compact ? 72 : 120, Math.floor((bandW - spacing * (count - 1)) / count));
        totalCandidate = buttonW * count + spacing * (count - 1);
        if (totalCandidate > bandW) {
          spacing = compact ? 6 : 10;
          buttonW = Math.max(compact ? 68 : 120, Math.floor((bandW - spacing * (count - 1)) / count));
        }
      }
    }
    const totalW = count > 0 ? buttonW * count + spacing * Math.max(0, count - 1) : 0;
    const startX = width * 0.5 - totalW * 0.5 + buttonW * 0.5;
    const tunedY = height - Math.round(runLayout.bottomBarH * 0.5);

    actions.forEach((action, index) => {
      const button = this.buttons.get(action.id);
      if (!button) {
        return;
      }
      const x = startX + index * (buttonW + spacing);
      const y = tunedY;
      const resolvedW = buttonW;
      const resolvedH = buttonH;
      button.container.setPosition(x, y);
      setGradientButtonSize(button, resolvedW, resolvedH);

      const iconKey = this.resolveDarkIconTexture(RUN_ACTION_ICON_KEYS[action.id] || RUN_ACTION_ICON_KEYS.deal);
      if (button.icon) {
        button.icon.setTexture(iconKey);
        button.icon.setDisplaySize(compact ? 21 : 27, compact ? 21 : 27);
        button.icon.setAlpha(0.92);
        button.icon.setVisible(true);
      }
      const shortcut = RUN_ACTION_SHORTCUTS[action.id] || "";
      if (button.shortcut) {
        button.shortcut.setText(shortcut);
        button.shortcut.setFontSize(compact ? 9 : 13);
        button.shortcut.setColor("#000000");
        button.shortcut.setAlpha(0.5);
        button.shortcut.setVisible(Boolean(shortcut));
      }

      button.text.setText(action.label);
      const fontSize = compact
        ? action.id === "confirmIntro"
          ? 14
          : 13
        : action.id === "confirmIntro"
          ? 20
          : 18;
      button.text.setFontSize(fontSize);
      const hasIcon = Boolean(button.icon?.visible);
      const iconPad = hasIcon ? (compact ? 28 : 38) : 10;
      button.text.setOrigin(0, 0.5);
      button.text.setPosition(-resolvedW * 0.5 + iconPad + (compact ? 4 : 10), 0);
      button.text.setAlign("left");
      if (button.icon) {
        button.icon.setPosition(-resolvedW * 0.5 + (compact ? 16 : 24), 0);
      }
      if (button.shortcut) {
        button.shortcut.setPosition(resolvedW * 0.5 - (compact ? 12 : 20), 0);
      }

      this.setButtonVisual(button, action.enabled ? "idle" : "disabled");
      button.enabled = action.enabled;
      button.container.setAlpha(action.enabled ? 1 : 0.82);
      button.container.setVisible(true);
    });
  }

  rebuildButtons(actions) {
    const signature = actions.map((entry) => entry.id).join("|");
    if (signature === this.buttonSignature) {
      return;
    }
    this.buttonSignature = signature;
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();

    actions.forEach((action) => {
      const button = createGradientButton(this, {
        id: action.id,
        label: action.label,
        styleSet: BUTTON_STYLES,
        onPress: () => this.invokeAction(action.id),
        width: 210,
        height: 64,
        fontSize: 28,
      });
      const icon = this.add.image(
        0,
        0,
        this.resolveDarkIconTexture(RUN_ACTION_ICON_KEYS[action.id] || RUN_ACTION_ICON_KEYS.deal)
      ).setDisplaySize(18, 18);
      const shortcut = this.add
        .text(0, 0, "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "13px",
          color: "#000000",
          fontStyle: "700",
        })
        .setOrigin(1, 0.5)
        .setAlpha(0.5);
      button.container.add([icon, shortcut]);
      button.icon = icon;
      button.shortcut = shortcut;
      this.buttons.set(action.id, button);
    });
  }

  setButtonVisual(button, styleName) {
    applyGradientButtonStyle(button, styleName);
  }

  hideAllText() {
    this.textNodes.forEach((node) => node.setVisible(false));
    this.cardTextNodes.forEach((node) => node.setVisible(false));
  }

  drawText(key, value, x, y, style, origin = { x: 0.5, y: 0.5 }) {
    let node = this.textNodes.get(key);
    if (!node) {
      node = this.add.text(x, y, value, style).setOrigin(origin.x, origin.y);
      this.textNodes.set(key, node);
    } else {
      node.setStyle(style);
      node.setOrigin(origin.x, origin.y);
    }
    node.setPosition(x, y);
    node.setText(value);
    node.setVisible(true);
    return node;
  }

  renderTopActions(snapshot, width, runLayout) {
    if (!snapshot) {
      this.topButtons.forEach((button) => button.container.setVisible(false));
      this.closeAllModals();
      return;
    }
    if (!this.topButtons.size) {
      const definitions = [
        {
          id: "logs",
          iconKey: RUN_TOP_ACTION_ICON_KEYS.logs,
          onPress: () => {
            this.toggleModal("logs");
          },
        },
        {
          id: "home",
          iconKey: RUN_TOP_ACTION_ICON_KEYS.home,
          onPress: () => {
            this.closeAllModals();
            this.invokeAction("goHome");
          },
        },
      ];
      definitions.forEach((entry) => {
        const button = createGradientButton(this, {
          id: `top-${entry.id}`,
          label: "",
          styleSet: BUTTON_STYLES,
          onPress: entry.onPress,
          width: 44,
          height: 44,
          fontSize: 14,
          hoverScale: 1,
          pressedScale: 0.98,
        });
        button.text.setVisible(false);
        const icon = this.add.image(0, 0, this.resolveDarkIconTexture(entry.iconKey)).setDisplaySize(16, 16).setAlpha(0.92);
        button.container.add(icon);
        button.icon = icon;
        button.container.setDepth(230);
        this.topButtons.set(entry.id, button);
      });
    }
    const buttonSize = runLayout.compact ? 38 : 42;
    const gap = 8;
    const rightX = width - runLayout.sidePad - buttonSize * 0.5;
    const y = Math.round(runLayout.topBarH * 0.5);
    const home = this.topButtons.get("home");
    const logs = this.topButtons.get("logs");
    if (home) {
      setGradientButtonSize(home, buttonSize, buttonSize);
      home.container.setPosition(rightX, y);
      home.container.setVisible(true);
      if (home.icon) {
        home.icon.setDisplaySize(buttonSize * 0.825, buttonSize * 0.825);
      }
    }
    if (logs) {
      setGradientButtonSize(logs, buttonSize, buttonSize);
      logs.container.setPosition(rightX - (buttonSize + gap), y);
      logs.container.setVisible(true);
      if (logs.icon) {
        logs.icon.setDisplaySize(buttonSize * 0.56, buttonSize * 0.56);
      }
    }
  }

  ensureModalCloseButton(kind, onPress) {
    if (kind === "logs-close" && this.logsCloseButton) {
      return this.logsCloseButton;
    }
    if (kind === "relic-close" && this.relicCloseButton) {
      return this.relicCloseButton;
    }
    const button = createModalCloseButton(this, {
      id: kind,
      styleSet: BUTTON_STYLES,
      onPress,
      depth: RUN_MODAL_CLOSE_OFFSET + RUN_MODAL_BASE_DEPTH,
      width: 42,
      height: 32,
      iconSize: 15,
    });
    if (kind === "logs-close") {
      this.logsCloseButton = button;
    } else {
      this.relicCloseButton = button;
    }
    return button;
  }

  drawLogsModal(snapshot, width, height, runLayout, layerIndex = -1) {
    if (!this.overlayGraphics) {
      return;
    }
    if (!this.logsModalOpen || layerIndex < 0) {
      if (this.logsCloseButton) {
        this.logsCloseButton.container.setVisible(false);
      }
      return;
    }
    const modalContentDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CONTENT_OFFSET;
    const modalCloseDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CLOSE_OFFSET;
    const rawLogs = Array.isArray(snapshot?.logs) ? snapshot.logs : [];
    const logs = ["Run started.", ...rawLogs.map((entry) => String(entry || ""))];
    const compact = Boolean(runLayout?.compact);
    const modalW = Phaser.Math.Clamp(width - 56, 320, 720);
    const preferredModalH = 460;
    const modalH = Phaser.Math.Clamp(preferredModalH, 240, height - 96);
    const x = Math.round(width * 0.5 - modalW * 0.5);
    const y = Math.round(runLayout.topBarH + 20);

    drawModalBackdrop(this.overlayGraphics, width, height, { color: 0x000000, alpha: 0.82 });
    drawFramedModalPanel(this.overlayGraphics, {
      x,
      y,
      width: modalW,
      height: modalH,
      radius: 20,
      fillColor: 0x0f1f30,
      fillAlpha: 0.96,
      borderColor: 0x6f95b6,
      borderAlpha: 0.46,
      borderWidth: 1.4,
      headerColor: 0x0b1623,
      headerAlpha: 0.9,
      headerHeight: 52,
    });

    const title = this.drawText("logs-title", "RUN LOGS", x + 18, y + 26, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "24px",
      color: "#f2d8a0",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    title.setDepth(modalContentDepth);

    const listX = x + 14;
    const listY = y + 60;
    const listW = modalW - 28;
    const listH = modalH - 84;
    const rowH = compact ? 34 : 38;
    const rowGap = compact ? 6 : 8;
    const bubbleAreaH = Math.max(44, listH - 24);
    const maxRows = Math.max(1, Math.floor((bubbleAreaH + rowGap) / (rowH + rowGap)));
    const visible = logs.slice(-maxRows);
    const firstY = Math.round(listY + bubbleAreaH - visible.length * (rowH + rowGap));
    const maxChars = compact ? 56 : 92;
    const absoluteStart = logs.length - visible.length;

    visible.forEach((line, index) => {
      const absIndex = absoluteStart + index;
      const isStart = absIndex === 0;
      const isHandResolution = !isStart && /(?:\bhand\b|\bblackjack\b|\bbust\b|\bdouble\b|\bsplit\b|\bhit\b|\bstand\b|\bdeal\b|\bpush\b|\bwin\b|\blose\b|\bresolved?\b)/i.test(line);
      const rowY = firstY + index * (rowH + rowGap);
      const bubbleFill = isStart || isHandResolution ? 0x1f364d : 0x16283a;
      const bubbleStroke = isStart || isHandResolution ? RUN_PRIMARY_GOLD : 0x5c7d99;
      const bubbleAlpha = isStart || isHandResolution ? 0.92 : 0.84;
      this.overlayGraphics.fillStyle(bubbleFill, bubbleAlpha);
      this.overlayGraphics.fillRoundedRect(listX, rowY, listW, rowH, 12);
      this.overlayGraphics.lineStyle(1.1, bubbleStroke, isStart || isHandResolution ? 0.54 : 0.34);
      this.overlayGraphics.strokeRoundedRect(listX, rowY, listW, rowH, 12);
      const normalized = String(line || "").replace(/\s+/g, " ").trim();
      const displayLine = normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1).trimEnd()}…` : normalized;
      const row = this.drawText(`logs-line-${index}`, displayLine, listX + 12, rowY + rowH * 0.5, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: compact ? "13px" : "15px",
        color: isStart || isHandResolution ? "#f2cd88" : "#d7e6f3",
        fontStyle: isStart ? "700" : "600",
      }, { x: 0, y: 0.5 });
      row.setDepth(modalContentDepth);
    });

    const closeButton = this.ensureModalCloseButton("logs-close", () => {
      this.setModalOpen("logs", false);
    });
    placeModalCloseButton(closeButton, {
      x: x + modalW - 26,
      y: y + 24,
      depth: modalCloseDepth,
      width: 42,
      height: 32,
      iconSize: 15,
      enabled: true,
      visible: true,
      styleName: "idle",
      applyStyle: (button, styleName) => this.setButtonVisual(button, styleName),
    });
  }

  drawRelicsModal(snapshot, width, height, runLayout, layerIndex = -1) {
    if (!this.overlayGraphics) {
      return;
    }
    if (!this.relicModalOpen || layerIndex < 0) {
      if (this.relicCloseButton) {
        this.relicCloseButton.container.setVisible(false);
      }
      return;
    }
    const modalContentDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CONTENT_OFFSET;
    const modalCloseDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CLOSE_OFFSET;
    const entries = Array.isArray(snapshot?.passives) ? snapshot.passives : [];
    const modalW = Phaser.Math.Clamp(width - 56, 340, 760);
    const modalH = Phaser.Math.Clamp(height - 128, 260, 520);
    const x = Math.round(width * 0.5 - modalW * 0.5);
    const y = Math.round(runLayout.topBarH + 16);
    drawModalBackdrop(this.overlayGraphics, width, height, { color: 0x000000, alpha: 0.82 });
    drawFramedModalPanel(this.overlayGraphics, {
      x,
      y,
      width: modalW,
      height: modalH,
      radius: 20,
      fillColor: 0x0f1f30,
      fillAlpha: 0.97,
      borderColor: 0x6f95b6,
      borderAlpha: 0.5,
      borderWidth: 1.4,
      headerColor: 0x0b1623,
      headerAlpha: 0.9,
      headerHeight: 52,
    });
    const totalRelicCount = entries.reduce((acc, entry) => acc + Math.max(1, Number(entry?.count) || 1), 0);
    const title = this.drawText("relics-title", "RELICS", x + 18, y + 26, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "24px",
      color: "#f2d8a0",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    title.setDepth(modalContentDepth);
    const summary = this.drawText("relics-summary", `${entries.length} relics • ${totalRelicCount} total`, x + modalW - 62, y + 26, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "14px",
      color: "#b7cadb",
      fontStyle: "700",
    }, { x: 1, y: 0.5 });
    summary.setDepth(modalContentDepth);
    if (!entries.length) {
      const emptyNode = this.drawText("relics-empty", "No relics collected yet.", x + 18, y + 82, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "16px",
        color: "#b7cadb",
      }, { x: 0, y: 0 });
      emptyNode.setDepth(modalContentDepth);
      return;
    }
    const listX = x + 14;
    const listY = y + 58;
    const listW = modalW - 28;
    const listH = modalH - 72;
    const gap = 8;
    let rowH = Math.floor((listH - gap * Math.max(0, entries.length - 1)) / Math.max(1, entries.length));
    let visibleCount = entries.length;
    if (rowH < 34) {
      rowH = 34;
      visibleCount = Math.max(1, Math.floor((listH + gap) / (rowH + gap)));
    }
    rowH = Phaser.Math.Clamp(rowH, 34, 58);
    const visibleEntries = entries.slice(0, visibleCount);
    visibleEntries.forEach((entry, index) => {
      const rowY = listY + index * (rowH + gap);
      this.overlayGraphics.fillStyle(0x203447, 0.9);
      this.overlayGraphics.fillRoundedRect(listX, rowY, listW, rowH, 12);
      const thumbSize = Math.min(rowH - 10, 42);
      const thumbX = listX + 8;
      const thumbY = rowY + Math.round((rowH - thumbSize) * 0.5);
      const thumbTexture = typeof entry?.thumbUrl === "string" && entry.thumbUrl.startsWith("data:image/")
        ? `run-relic-thumb-${entry.id}`
        : "";
      if (thumbTexture && !this.textures.exists(thumbTexture)) {
        try {
          this.textures.addBase64(thumbTexture, entry.thumbUrl);
        } catch {
          // ignore bad thumb payloads
        }
      }
      this.overlayGraphics.fillStyle(0x102233, 0.96);
      this.overlayGraphics.fillRoundedRect(thumbX, thumbY, thumbSize, thumbSize, 9);
      if (thumbTexture && this.textures.exists(thumbTexture)) {
        const imageKey = `relic-thumb-img-${index}`;
        let imageNode = this.textNodes.get(imageKey);
        if (!imageNode) {
          imageNode = this.add.image(0, 0, thumbTexture).setDepth(modalContentDepth + 2);
          this.textNodes.set(imageKey, imageNode);
        } else if (imageNode.texture?.key !== thumbTexture) {
          imageNode.setTexture(thumbTexture);
        }
        imageNode.setPosition(thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5);
        imageNode.setDisplaySize(thumbSize - 4, thumbSize - 4);
        imageNode.setVisible(true);
      } else {
        const glyph = this.drawText(`relic-thumb-glyph-${index}`, "◆", thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5, {
          fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
          fontSize: "15px",
          color: "#d8e8f7",
          fontStyle: "700",
        });
        glyph.setDepth(modalContentDepth + 2);
      }

      const nameX = thumbX + thumbSize + 10;
      const nameY = rowY + Math.max(16, rowH * 0.36);
      const descY = rowY + Math.max(26, rowH * 0.68);
      const rightX = listX + listW - 10;
      const rarity = String(entry?.rarityLabel || "").toUpperCase();
      const rarityNode = this.drawText(`relic-rarity-${index}`, rarity, rightX, nameY, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "11px",
        color: "#9fb4c7",
        fontStyle: "700",
      }, { x: 1, y: 0.5 });
      rarityNode.setDepth(modalContentDepth + 2);
      const nameNode = this.drawText(`relic-name-${index}`, String(entry?.name || "RELIC"), nameX, nameY, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "14px",
        color: "#eef6ff",
        fontStyle: "700",
      }, { x: 0, y: 0.5 });
      nameNode.setDepth(modalContentDepth + 2);
      const countValue = Number(entry?.count) || 1;
      const countText = countValue > 1 ? `x${countValue > 99 ? "99+" : countValue}` : "";
      const countNode = this.drawText(`relic-count-${index}`, countText, nameX + nameNode.width + 8, nameY, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "11px",
        color: "#f4d598",
        fontStyle: "700",
      }, { x: 0, y: 0.5 });
      countNode.setDepth(modalContentDepth + 2);
      const descNode = this.drawText(`relic-desc-${index}`, String(entry?.description || ""), nameX, descY, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "12px",
        color: "#c6d8e8",
      }, { x: 0, y: 0.5 });
      descNode.setDepth(modalContentDepth + 2);
    });
    if (visibleCount < entries.length) {
      const moreNode = this.drawText("relics-more", `+${entries.length - visibleCount} more`, x + modalW - 18, y + modalH - 14, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "12px",
        color: "#b7cadb",
        fontStyle: "700",
      }, { x: 1, y: 1 });
      moreNode.setDepth(modalContentDepth + 2);
    }

    const closeButton = this.ensureModalCloseButton("relic-close", () => {
      this.setModalOpen("relics", false);
    });
    placeModalCloseButton(closeButton, {
      x: x + modalW - 26,
      y: y + 24,
      depth: modalCloseDepth,
      width: 42,
      height: 32,
      iconSize: 15,
      enabled: true,
      visible: true,
      styleName: "idle",
      applyStyle: (button, styleName) => this.setButtonVisual(button, styleName),
    });
  }

  syncModalBlocker(width, height) {
    const modalOpen = this.logsModalOpen || this.relicModalOpen;
    if (!this.modalBlocker) {
      return;
    }
    this.modalBlocker.setSize(width, height);
    this.modalBlocker.setVisible(modalOpen);
    this.modalBlocker.active = modalOpen;
  }
}
