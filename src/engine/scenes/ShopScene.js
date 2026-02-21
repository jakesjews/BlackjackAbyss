import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";
import { createModalCloseButton, drawFramedModalPanel, drawModalBackdrop, placeModalCloseButton } from "./ui/modal-ui.js";
import { getShopApi as getShopApiFromRuntime, tickRuntime } from "./runtime-bridge.js";

const CARD_STYLE = Object.freeze({
  fill: 0x22384a,
  fillSelected: 0x2c475e,
  border: 0x9ec1d8,
  borderSelected: 0xf2d38e,
});

const BUTTON_STYLE = ACTION_BUTTON_STYLE;
const SHOP_CHIPS_ICON_KEY = "__shop-chips-icon__";
const SHOP_CHIPS_ICON_TRIM_KEY = "__shop-chips-icon-trim__";
const SHOP_BUY_ICON_KEY = "__shop-buy-icon__";
const SHOP_DEAL_ICON_KEY = "__shop-deal-icon__";
const SHOP_CAMP_BACKGROUND_KEY = "__shop-camp-background__";
const SHOP_PRIMARY_GOLD = 0xf2cd88;
const SHOP_MODAL_BASE_DEPTH = 300;
const SHOP_MODAL_CONTENT_DEPTH = 310;
const SHOP_MODAL_CLOSE_DEPTH = 320;
const SHOP_TOP_ACTION_ICON_KEYS = Object.freeze({
  logs: "__shop-top-action-logs__",
  home: "__shop-top-action-home__",
});
const SHOP_TOP_ACTION_ICONS = Object.freeze({
  logs: "/images/icons/log.png",
  home: "/images/icons/home.png",
});
const SHOP_THEME_BLUE_HUE_MIN = 170;
const SHOP_THEME_BLUE_HUE_MAX = 255;
const SHOP_THEME_BROWN_HUE = 30 / 360;
const SHOP_THEME_SATURATION_FLOOR = 0.18;
const SHOP_THEME_SATURATION_SCALE = 0.8;
const SHOPKEEPER_DIALOGUE_VARIANTS = Object.freeze([
  "Welcome back, traveler. Browse slow, buy smart.",
  "Camp prices are fair. The odds are not.",
  "I've got relics with stories and scars. Pick one.",
  "Spend chips here, save regrets for the next room.",
  "Everything on this rack survived someone else first.",
  "Take your time. Leave camp stronger than you arrived.",
]);

export class ShopScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.shop);
    this.graphics = null;
    this.textNodes = new Map();
    this.cards = new Map();
    this.buttons = new Map();
    this.lastCardSignature = "";
    this.keyboardHandlers = [];
    this.lastSnapshot = null;
    this.overlayGraphics = null;
    this.topButtons = new Map();
    this.logsModalOpen = false;
    this.logsCloseButton = null;
    this.shopCloseButton = null;
    this.modalBlocker = null;
    this.chipsIcon = null;
    this.campBackground = null;
    this.shopOpen = false;
    this.shopDialogueIndex = -1;
    this.shopDialogueText = "";
    this.bottomBarRect = null;
    this.visitSignature = "";
    this.darkIconTextureBySource = new Map();
    this.hoveredCardIndex = null;
    this.focusedCardIndex = 0;
    this.pointerHandlers = [];
    this.logsScrollIndex = 0;
    this.logsScrollMax = 0;
    this.logsLastCount = 0;
    this.logsPinnedToBottom = true;
    this.logsViewport = null;
    this.shopListMaskShape = null;
    this.shopListMask = null;
  }

  preload() {
    if (!this.textures.exists(SHOP_CHIPS_ICON_KEY)) {
      this.load.image(SHOP_CHIPS_ICON_KEY, "/images/icons/chips.png");
    }
    Object.entries(SHOP_TOP_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, SHOP_TOP_ACTION_ICONS[actionId] || "/images/icons/home.png");
      }
    });
    if (!this.textures.exists(SHOP_BUY_ICON_KEY)) {
      this.load.image(SHOP_BUY_ICON_KEY, "/images/icons/buy.png");
    }
    if (!this.textures.exists(SHOP_DEAL_ICON_KEY)) {
      this.load.image(SHOP_DEAL_ICON_KEY, "/images/icons/deal.png");
    }
    if (!this.textures.exists(SHOP_CAMP_BACKGROUND_KEY)) {
      this.load.image(SHOP_CAMP_BACKGROUND_KEY, "/images/scenes/camp.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#171006");
    this.cameras.main.setAlpha(1);
    this.graphics = this.add.graphics();
    this.applyBrownThemeToGraphics(this.graphics);
    this.campBackground = this.textures.exists(SHOP_CAMP_BACKGROUND_KEY)
      ? this.add.image(0, 0, SHOP_CAMP_BACKGROUND_KEY).setOrigin(0.5, 0.5).setDepth(-10).setVisible(false)
      : null;
    this.overlayGraphics = this.add.graphics().setDepth(SHOP_MODAL_BASE_DEPTH);
    this.applyBrownThemeToGraphics(this.overlayGraphics);
    this.modalBlocker = this.add
      .zone(0, 0, 1, 1)
      .setOrigin(0, 0)
      .setDepth(SHOP_MODAL_BASE_DEPTH + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });
    this.modalBlocker.on("pointerdown", () => {});
    const chipsTextureKey = this.resolveGoldIconTexture(this.resolveTightTexture(SHOP_CHIPS_ICON_KEY, SHOP_CHIPS_ICON_TRIM_KEY));
    this.chipsIcon = this.add.image(0, 0, chipsTextureKey).setVisible(false);
    this.chipsIcon.setDisplaySize(20, 20);
    this.shopOpen = false;
    this.bottomBarRect = null;
    this.visitSignature = "";
    this.shopListMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
    this.shopListMask = this.shopListMaskShape.createGeometryMask();
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
    this.cards.forEach((card) => card.container.destroy());
    this.cards.clear();
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();
    this.topButtons.forEach((button) => button.container.destroy());
    this.topButtons.clear();
    if (this.logsCloseButton) {
      this.logsCloseButton.container.destroy();
      this.logsCloseButton = null;
    }
    if (this.shopCloseButton) {
      this.shopCloseButton.container.destroy();
      this.shopCloseButton = null;
    }
    if (this.chipsIcon) {
      this.chipsIcon.destroy();
      this.chipsIcon = null;
    }
    if (this.campBackground) {
      this.campBackground.destroy();
      this.campBackground = null;
    }
    if (this.modalBlocker) {
      this.modalBlocker.destroy();
      this.modalBlocker = null;
    }
    if (this.overlayGraphics) {
      this.overlayGraphics.destroy();
      this.overlayGraphics = null;
    }
    this.textNodes.forEach((text) => text.destroy());
    this.textNodes.clear();
    this.lastCardSignature = "";
    this.visitSignature = "";
    this.shopOpen = false;
    this.shopDialogueIndex = -1;
    this.shopDialogueText = "";
    this.bottomBarRect = null;
    this.logsModalOpen = false;
    this.darkIconTextureBySource.clear();
    this.pointerHandlers.forEach(({ eventName, handler }) => {
      this.input.off(eventName, handler);
    });
    this.pointerHandlers = [];
    this.hoveredCardIndex = null;
    this.focusedCardIndex = 0;
    this.logsScrollIndex = 0;
    this.logsScrollMax = 0;
    this.logsLastCount = 0;
    this.logsPinnedToBottom = true;
    this.logsViewport = null;
    if (this.shopListMaskShape) {
      this.shopListMaskShape.destroy();
      this.shopListMaskShape = null;
      this.shopListMask = null;
    }
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

  bindKeyboardInput() {
    if (!this.input.keyboard) {
      return;
    }
    const bind = (eventName, handler) => {
      this.input.keyboard.on(eventName, handler);
      this.keyboardHandlers.push({ eventName, handler });
    };

    bind("keydown-TAB", (event) => {
      if (!this.shopOpen) {
        return;
      }
      event.preventDefault();
      const count = Array.isArray(this.lastSnapshot?.items) ? this.lastSnapshot.items.length : 0;
      if (count <= 0) {
        return;
      }
      const direction = event.shiftKey ? -1 : 1;
      const baseIndex = this.resolveSelectedIndex(this.lastSnapshot, false);
      const nextIndex = Phaser.Math.Wrap(baseIndex + direction, 0, count);
      this.focusedCardIndex = nextIndex;
      this.hoveredCardIndex = null;
      this.invokeAction("selectIndex", nextIndex);
    });
    bind("keydown-Z", () => {
      if (!this.shopOpen) {
        return;
      }
      const selectedIndex = this.resolveSelectedIndex(this.lastSnapshot);
      this.invokeAction("buy", selectedIndex);
    });
    bind("keydown-S", (event) => {
      event.preventDefault();
      this.setShopOpen(!this.shopOpen);
    });
    bind("keydown-ENTER", (event) => {
      event.preventDefault();
      this.invokeAction("continueRun");
    });
    bind("keydown-ESC", () => {
      this.logsModalOpen = false;
      if (this.shopOpen) {
        this.setShopOpen(false);
      }
    });
  }

  setShopOpen(open) {
    const next = Boolean(open);
    if (next === this.shopOpen) {
      return;
    }
    this.shopOpen = next;
    if (next) {
      this.pickShopDialogue();
    } else {
      this.hoveredCardIndex = null;
    }
  }

  pickShopDialogue() {
    const variants = SHOPKEEPER_DIALOGUE_VARIANTS;
    if (!Array.isArray(variants) || variants.length === 0) {
      this.shopDialogueText = "";
      this.shopDialogueIndex = -1;
      return;
    }
    const previous = Number.isFinite(this.shopDialogueIndex) ? this.shopDialogueIndex : -1;
    let next = Phaser.Math.Between(0, variants.length - 1);
    if (variants.length > 1 && next === previous) {
      next = (next + 1 + Phaser.Math.Between(0, variants.length - 2)) % variants.length;
    }
    this.shopDialogueIndex = next;
    this.shopDialogueText = String(variants[next] || "");
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
      this.setLogsScroll(this.logsScrollIndex + Math.sign(deltaY || 0) * 2);
    });
  }

  pointInRect(x, y, rect) {
    if (!rect) {
      return false;
    }
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  isCompactLayout(width) {
    return width < 760;
  }

  shouldShowKeyboardHints(width) {
    const viewportWidth = Number(width) || 0;
    const coarsePointer = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(pointer: coarse)").matches;
    return viewportWidth >= 1100 && !coarsePointer;
  }

  setLogsScroll(next) {
    this.logsScrollIndex = Phaser.Math.Clamp(Math.round(next), 0, this.logsScrollMax);
    this.logsPinnedToBottom = this.logsScrollIndex >= this.logsScrollMax;
  }

  resolveSelectedIndex(snapshot, includeHover = true) {
    const count = Array.isArray(snapshot?.items) ? snapshot.items.length : 0;
    if (count <= 0) {
      return 0;
    }
    if (includeHover && Number.isFinite(this.hoveredCardIndex)) {
      return Phaser.Math.Clamp(Math.round(this.hoveredCardIndex), 0, count - 1);
    }
    if (Number.isFinite(this.focusedCardIndex)) {
      return Phaser.Math.Clamp(Math.round(this.focusedCardIndex), 0, count - 1);
    }
    return Phaser.Math.Clamp(Math.round(Number(snapshot?.selectionIndex) || 0), 0, count - 1);
  }

  handleCardHover(index) {
    if (!Number.isFinite(index)) {
      return;
    }
    const safeIndex = Math.max(0, Math.round(index));
    this.hoveredCardIndex = safeIndex;
    this.focusedCardIndex = safeIndex;
    this.invokeAction("selectIndex", safeIndex);
  }

  getShopApi() {
    return getShopApiFromRuntime(this);
  }

  getSnapshot() {
    const api = this.getShopApi();
    if (!api || typeof api.getSnapshot !== "function") {
      return null;
    }
    try {
      return api.getSnapshot();
    } catch {
      return null;
    }
  }

  invokeAction(actionName, value = undefined) {
    const api = this.getShopApi();
    const action = api ? api[actionName] : null;
    if (typeof action === "function") {
      action(value);
    }
  }

  applyBrownThemeToGraphics(graphics) {
    if (!graphics || graphics.__brownThemePatched) {
      return;
    }
    const fillStyle = graphics.fillStyle;
    const lineStyle = graphics.lineStyle;
    const fillGradientStyle = graphics.fillGradientStyle;
    graphics.fillStyle = (color, alpha) => fillStyle.call(graphics, this.toBrownThemeColorNumber(color), alpha);
    graphics.lineStyle = (lineWidth, color, alpha) => {
      lineStyle.call(graphics, lineWidth, this.toBrownThemeColorNumber(color), alpha);
    };
    graphics.fillGradientStyle = (topLeft, topRight, bottomLeft, bottomRight, alpha) => {
      fillGradientStyle.call(
        graphics,
        this.toBrownThemeColorNumber(topLeft),
        this.toBrownThemeColorNumber(topRight),
        this.toBrownThemeColorNumber(bottomLeft),
        this.toBrownThemeColorNumber(bottomRight),
        alpha
      );
    };
    graphics.__brownThemePatched = true;
  }

  toBrownThemeTextStyle(style) {
    if (!style || typeof style !== "object") {
      return style;
    }
    const themed = { ...style };
    if (typeof themed.color === "string") {
      themed.color = this.toBrownThemeColorString(themed.color);
    }
    if (typeof themed.stroke === "string") {
      themed.stroke = this.toBrownThemeColorString(themed.stroke);
    }
    if (typeof themed.backgroundColor === "string") {
      themed.backgroundColor = this.toBrownThemeColorString(themed.backgroundColor);
    }
    return themed;
  }

  toBrownThemeColorString(value) {
    if (typeof value !== "string" || !value.startsWith("#")) {
      return value;
    }
    const input = Number.parseInt(value.slice(1), 16);
    if (!Number.isFinite(input)) {
      return value;
    }
    const output = this.toBrownThemeColorNumber(input);
    return `#${output.toString(16).padStart(6, "0")}`;
  }

  toBrownThemeColorNumber(value) {
    if (!Number.isFinite(value)) {
      return value;
    }
    const r = (value >> 16) & 0xff;
    const g = (value >> 8) & 0xff;
    const b = value & 0xff;
    const [hue, sat, light] = this.rgbToHsl(r, g, b);
    const hueDeg = hue * 360;
    if (sat < 0.08 || hueDeg < SHOP_THEME_BLUE_HUE_MIN || hueDeg > SHOP_THEME_BLUE_HUE_MAX) {
      return value;
    }
    const shiftedSat = Phaser.Math.Clamp(sat * SHOP_THEME_SATURATION_SCALE + SHOP_THEME_SATURATION_FLOOR, 0, 1);
    const shifted = this.hslToRgb(SHOP_THEME_BROWN_HUE, shiftedSat, light);
    return (shifted[0] << 16) | (shifted[1] << 8) | shifted[2];
  }

  rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    let h = 0;
    let s = 0;
    const l = (max + min) * 0.5;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rn) {
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
      } else if (max === gn) {
        h = (bn - rn) / d + 2;
      } else {
        h = (rn - gn) / d + 4;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  hslToRgb(h, s, l) {
    if (s === 0) {
      const value = Math.round(l * 255);
      return [value, value, value];
    }
    const hue2rgb = (p, q, t) => {
      let tl = t;
      if (tl < 0) tl += 1;
      if (tl > 1) tl -= 1;
      if (tl < 1 / 6) return p + (q - p) * 6 * tl;
      if (tl < 1 / 2) return q;
      if (tl < 2 / 3) return p + (q - p) * (2 / 3 - tl) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = hue2rgb(p, q, h + 1 / 3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1 / 3);
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  renderSnapshot(snapshot) {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    this.graphics.clear();
    if (this.overlayGraphics) {
      this.overlayGraphics.clear();
    }
    if (this.chipsIcon) {
      this.chipsIcon.setVisible(false);
    }
    this.hideAllText();
    if (!snapshot) {
      if (this.campBackground) {
        this.campBackground.setVisible(false);
      }
      this.setShopOpen(false);
      this.visitSignature = "";
      this.bottomBarRect = null;
      this.rebuildCards([]);
      this.rebuildButtons([]);
      this.logsViewport = null;
      this.topButtons.forEach((button) => button.container.setVisible(false));
      this.logsModalOpen = false;
      if (this.logsCloseButton) {
        this.logsCloseButton.container.setVisible(false);
      }
      if (this.shopCloseButton) {
        this.shopCloseButton.container.setVisible(false);
      }
      this.syncModalBlocker(width, height);
      return;
    }

    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    const visitSignature = [
      snapshot.run?.floor || 0,
      snapshot.run?.room || 0,
      items.map((item) => item.id).join("|"),
    ].join(":");
    if (visitSignature !== this.visitSignature) {
      this.visitSignature = visitSignature;
      this.setShopOpen(false);
    }

    this.drawBackground(width, height);
    this.drawHeader(snapshot, width);
    this.focusedCardIndex = this.resolveSelectedIndex(snapshot, false);
    this.renderCards(snapshot, width, height);
    this.renderButtons(snapshot, width, height);
    this.renderTopActions(width);
    this.drawLogsModal(snapshot, width, height);
    this.syncModalBlocker(width, height);
  }

  syncModalBlocker(width, height) {
    if (!this.modalBlocker) {
      return;
    }
    const open = Boolean(this.logsModalOpen);
    this.modalBlocker.setSize(width, height);
    this.modalBlocker.setVisible(open);
    this.modalBlocker.active = open;
  }

  drawBackground(width, height) {
    const compact = this.isCompactLayout(width);
    if (this.campBackground && this.textures.exists(SHOP_CAMP_BACKGROUND_KEY)) {
      const cover = this.coverSizeForTexture(SHOP_CAMP_BACKGROUND_KEY, width, height);
      this.campBackground
        .setPosition(width * 0.5, height * 0.5)
        .setDisplaySize(cover.width, cover.height)
        .setAlpha(0.82)
        .setVisible(true);
    } else if (this.campBackground) {
      this.campBackground.setVisible(false);
    }
    this.graphics.fillStyle(0x060303, 0.62);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillGradientStyle(0x120c07, 0x120c07, 0x060403, 0x060403, 0.78);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x000000, 0.3);
    this.graphics.fillRoundedRect(12, 10, width - 24, height - 20, 16);
    const bottomBarH = compact
      ? Phaser.Math.Clamp(Math.round(height * 0.19), 108, 146)
      : Math.max(74, Math.round(height * 0.115));
    const bottomBarY = height - bottomBarH - 12;
    this.graphics.fillStyle(0x120b07, 0.94);
    this.graphics.fillRoundedRect(12, bottomBarY, width - 24, bottomBarH, 16);
    this.graphics.lineStyle(1.2, 0x5d4a34, 0.42);
    this.graphics.strokeRoundedRect(12, bottomBarY, width - 24, bottomBarH, 16);
    this.bottomBarRect = {
      x: 12,
      y: bottomBarY,
      width: width - 24,
      height: bottomBarH,
    };
  }

  drawHeader(snapshot, width) {
    const run = snapshot.run || {};
    const compact = this.isCompactLayout(width);
    const topBarH = compact ? 76 : 74;
    const sidePad = Math.max(compact ? 16 : 22, Math.round(width * (compact ? 0.016 : 0.02)));
    this.graphics.fillStyle(0x140d07, 0.94);
    this.graphics.fillRect(0, 0, width, topBarH);
    this.graphics.fillStyle(0x000000, 0.24);
    this.graphics.fillRect(0, topBarH - 1, width, 1);
    const topY = compact ? Math.round(topBarH * 0.5) : Math.round(topBarH * 0.48);
    const leftStartX = sidePad + 8;
    if (this.chipsIcon) {
      this.chipsIcon.setPosition(leftStartX, topY);
      this.chipsIcon.setDisplaySize(compact ? 18 : 20, compact ? 18 : 20);
      this.chipsIcon.clearTint();
      this.chipsIcon.setVisible(true);
    }
    const chipsNode = this.drawText("shop-top-chips", `${run.chips || 0}`, leftStartX + (compact ? 20 : 22), topY, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: compact ? "16px" : "17px",
      color: "#f6e6a6",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    const progressLabel = `Floor ${run.floor || 1}/${run.roomsPerFloor || 5}  Room ${run.room || 1}`;
    const progressX = compact ? chipsNode.x + chipsNode.width + 26 : width * 0.5;
    this.drawText("shop-top-progress", progressLabel, progressX, topY, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: compact ? "15px" : "16px",
      color: "#e0cfb0",
      fontStyle: "700",
    }, { x: compact ? 0 : 0.5, y: 0.5 });

    this.drawText("shop-title", "CAMP", width * 0.5, 108, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "38px",
      color: "#f6e6a6",
      stroke: "#0f1b28",
      strokeThickness: 5,
    });
    if (this.shopOpen) {
      this.drawText("shop-subtitle", "ONE PURCHASE PER CAMP. CHOOSE CAREFULLY.", width * 0.5, 142, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "18px",
        color: "#d7e6f3",
      });
    }
  }

  renderCards(snapshot, width, height) {
    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    this.rebuildCards(items);
    const showKeyboardHints = this.shouldShowKeyboardHints(width);
    if (!this.shopOpen) {
      this.cards.forEach((card) => card.container.setVisible(false));
      if (this.shopCloseButton) {
        this.shopCloseButton.container.setVisible(false);
      }
      if (this.shopListMaskShape) {
        this.shopListMaskShape.clear();
      }
      this.cards.forEach((card) => {
        card.container.clearMask();
      });
      return;
    }

    if (!this.shopDialogueText) {
      this.pickShopDialogue();
    }

    const compact = this.isCompactLayout(width);
    const bottomLimit = (this.bottomBarRect?.y || (height - 90)) - 10;
    const panelX = compact ? 12 : 16;
    const panelY = compact ? Math.max(142, Math.round(height * 0.19)) : Math.max(154, Math.round(height * 0.205));
    const maxPanelW = Math.max(220, width - panelX * 2);
    const panelW = compact
      ? maxPanelW
      : Phaser.Math.Clamp(Math.round(width * 0.335), Math.min(308, maxPanelW), Math.min(460, maxPanelW));
    const panelH = Math.max(120, bottomLimit - panelY);
    const panelRadius = 18;

    this.graphics.fillStyle(0x100906, 0.94);
    this.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, panelRadius);
    this.graphics.lineStyle(1.35, 0x6a5238, 0.56);
    this.graphics.strokeRoundedRect(panelX, panelY, panelW, panelH, panelRadius);
    this.graphics.fillStyle(0x000000, 0.22);
    this.graphics.fillRoundedRect(panelX + 1, panelY + 1, panelW - 2, 46, panelRadius - 2);
    const panelTitleFont = compact ? "22px" : "27px";
    this.drawText("shop-panel-title", "CAMP STORE", panelX + 16, panelY + 24, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: panelTitleFont,
      color: "#f6e6a6",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });

    const shopCloseButton = this.ensureShopCloseButton();
    placeModalCloseButton(shopCloseButton, {
      x: panelX + panelW - 20,
      y: panelY + 24,
      depth: 130,
      width: 34,
      height: 30,
      iconSize: 13,
      enabled: true,
      visible: true,
      styleName: "idle",
      applyStyle: (button, styleName) => this.applyButtonStyle(button, styleName),
    });

    const rightColumnX = panelX + panelW + 16;
    const rightColumnW = Math.max(0, width - rightColumnX - 16);
    const dialogueInsidePanel = compact || rightColumnW < 180;
    const dialogueX = dialogueInsidePanel ? panelX + 12 : rightColumnX;
    const dialogueW = dialogueInsidePanel
      ? Math.max(140, panelW - 24)
      : Phaser.Math.Clamp(rightColumnW, 160, 420);
    const dialogueY = dialogueInsidePanel ? panelY + 54 : panelY + 10;
    const dialogueH = dialogueInsidePanel
      ? Phaser.Math.Clamp(Math.round(panelH * (compact ? 0.22 : 0.18)), 74, 112)
      : Math.min(124, Math.max(90, Math.round(panelH * 0.25)));
    this.graphics.fillStyle(0x110a07, 0.9);
    this.graphics.fillRoundedRect(dialogueX, dialogueY, dialogueW, dialogueH, 14);
    this.graphics.lineStyle(1.2, 0x614b34, 0.5);
    this.graphics.strokeRoundedRect(dialogueX, dialogueY, dialogueW, dialogueH, 14);
    this.drawText("shopkeeper-label", "SHOPKEEPER", dialogueX + 14, dialogueY + 18, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: compact ? "14px" : "16px",
      color: "#f2cd88",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    this.drawText("shopkeeper-dialogue", this.shopDialogueText || SHOPKEEPER_DIALOGUE_VARIANTS[0], dialogueX + 14, dialogueY + 32, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: compact ? "13px" : "16px",
      color: "#dcc7a6",
      lineSpacing: compact ? 2 : 4,
      wordWrap: { width: Math.max(120, dialogueW - 28) },
    }, { x: 0, y: 0 });

    const listPadX = compact ? 10 : 12;
    const listTop = dialogueInsidePanel ? dialogueY + dialogueH + 10 : panelY + 56;
    const listBottom = panelY + panelH - 12;
    const listH = Math.max(96, listBottom - listTop);
    const cardW = panelW - listPadX * 2;
    const listX = panelX + listPadX;
    if (this.shopListMaskShape) {
      this.shopListMaskShape.clear();
      this.shopListMaskShape.fillStyle(0xffffff, 1);
      this.shopListMaskShape.fillRect(listX, listTop, cardW, listH);
    }
    let gap = compact ? 8 : 10;
    const count = Math.max(1, items.length);
    let cardH = Math.floor((listH - gap * Math.max(0, count - 1)) / count);
    cardH = Phaser.Math.Clamp(cardH, compact ? 88 : 104, compact ? 168 : 188);
    let stackH = count * cardH + Math.max(0, count - 1) * gap;
    if (stackH > listH) {
      cardH = Math.max(compact ? 68 : 84, Math.floor((listH - gap * Math.max(0, count - 1)) / count));
      stackH = count * cardH + Math.max(0, count - 1) * gap;
    }
    if (stackH > listH && gap > 4) {
      gap = 4;
      cardH = Math.max(compact ? 66 : 80, Math.floor((listH - gap * Math.max(0, count - 1)) / count));
      stackH = count * cardH + Math.max(0, count - 1) * gap;
    }
    const startY = listTop + Math.max(0, Math.round((listH - stackH) * 0.5));

    items.forEach((item, index) => {
      const card = this.cards.get(item.id);
      if (!card) {
        return;
      }
      const x = listX;
      const y = startY + index * (cardH + gap);
      const selectedIndex = this.resolveSelectedIndex(snapshot);
      const selected = index === selectedIndex;
      card.currentIndex = index;
      card.container.setPosition(x, y);
      card.bg.clear();
      card.bg.fillStyle(this.toBrownThemeColorNumber(selected ? CARD_STYLE.fillSelected : CARD_STYLE.fill), selected ? 0.98 : 0.9);
      card.bg.fillRoundedRect(0, 0, cardW, cardH, 18);
      card.bg.fillStyle(0xffffff, selected ? 0.06 : 0.03);
      card.bg.fillRoundedRect(1, 1, cardW - 2, Math.max(30, Math.round(cardH * 0.22)), 18);
      const cardPadX = Phaser.Math.Clamp(Math.round(cardW * 0.045), 12, 18);
      const buttonH = Phaser.Math.Clamp(Math.round(cardH * 0.3), compact ? 34 : 40, 52);
      const buttonBottomPad = Phaser.Math.Clamp(Math.round(cardH * 0.07), 6, 12);
      const buttonY = cardH - Math.round(buttonH * 0.5) - buttonBottomPad;
      const costGap = Phaser.Math.Clamp(Math.round(cardH * 0.08), 10, 18);
      const costY = buttonY - Math.round(buttonH * 0.5) - costGap;
      const typeY = Phaser.Math.Clamp(Math.round(cardH * 0.13), 16, 26);
      const nameY = typeY + Phaser.Math.Clamp(Math.round(cardH * 0.15), 20, 36);
      const descTop = nameY + Phaser.Math.Clamp(Math.round(cardH * 0.09), 10, 16);
      const descBottom = costY - Phaser.Math.Clamp(Math.round(cardH * 0.07), 8, 14);
      const descHeight = Math.max(20, descBottom - descTop);
      const descPanelW = Math.max(120, cardW - cardPadX * 2);
      card.descPanel.setPosition(cardPadX, descTop);
      card.descPanel.setSize(descPanelW, descHeight);
      card.descPanel.setFillStyle(this.toBrownThemeColorNumber(0x0b1622), selected ? 0.26 : 0.2);
      card.desc.setPosition(cardPadX, descTop + 4);
      card.type.setText(String(item.type || "SERVICE").toUpperCase());
      card.type.setPosition(cardPadX, typeY);
      card.name.setText(item.name || "Item");
      card.name.setPosition(cardPadX, nameY);
      card.desc.setText(item.description || "");
      card.desc.setWordWrapWidth(Math.max(120, descPanelW - 8));
      const typeFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.11), 12, 17);
      const nameFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.145), 18, 30);
      const descFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.098), 12, 19);
      const costFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.112), 14, 22);
      card.type.setFontSize(typeFontSize);
      card.type.setFontStyle("700");
      card.name.setFontSize(nameFontSize);
      card.name.setFontStyle("700");
      card.desc.setFontSize(descFontSize);
      card.desc.setLineSpacing(Math.max(2, Math.round(descFontSize * 0.2)));
      card.cost.setFontSize(costFontSize);
      card.cost.setText(`${item.cost || 0}`);
      card.cost.setPosition(cardW * 0.5, costY);

      const purchaseLocked = Boolean(snapshot.run?.shopPurchaseMade);
      const sold = Boolean(item.sold);
      const buyEnabled = Boolean(item.canBuy);
      card.buyEnabled = buyEnabled;
      const buyButtonWidth = Math.max(128, cardW - cardPadX * 2);
      const buyButtonHeight = buttonH;
      setGradientButtonSize(card.buyButton, buyButtonWidth, buyButtonHeight);
      card.buyButton.container.setPosition(cardW * 0.5, buttonY);

      if (sold) {
        card.buyButton.enabled = false;
        card.buyButton.text.setText("SOLD");
        this.applyBuyButtonStyle(card.buyButton, "disabled");
      } else if (purchaseLocked) {
        card.buyButton.enabled = false;
        card.buyButton.text.setText("LOCKED");
        this.applyBuyButtonStyle(card.buyButton, "disabled");
      } else if (buyEnabled) {
        card.buyButton.enabled = true;
        card.buyButton.text.setText("BUY");
        this.applyBuyButtonStyle(card.buyButton, "idle");
      } else {
        card.buyButton.enabled = false;
        card.buyButton.text.setText("NEED CHIPS");
        this.applyBuyButtonStyle(card.buyButton, "disabled");
      }
      card.buyButton.container.setAlpha(card.buyButton.enabled ? 1 : 0.86);
      const buyLabelFontSize = Phaser.Math.Clamp(Math.round(buyButtonHeight * 0.36), 13, 18);
      card.buyButton.text.setFontSize(buyLabelFontSize);
      card.buyButton.text.setOrigin(0, 0.5);
      card.buyButton.text.setAlign("left");
      card.buyButton.text.setPosition(-buyButtonWidth * 0.5 + Math.max(34, Math.round(buyButtonHeight * 0.9)), 0);
      if (card.buyIcon) {
        card.buyIcon.setTexture(this.resolveDarkIconTexture(SHOP_BUY_ICON_KEY));
        const buyIconSize = Phaser.Math.Clamp(Math.round(buyButtonHeight * 0.66), 18, 33);
        card.buyIcon.setDisplaySize(buyIconSize, buyIconSize);
        card.buyIcon.setPosition(-buyButtonWidth * 0.5 + Math.max(16, Math.round(buyButtonHeight * 0.44)), 0);
        card.buyIcon.setVisible(true);
      }
      if (card.buyShortcut) {
        card.buyShortcut.setText("Z");
        card.buyShortcut.setFontSize(Phaser.Math.Clamp(Math.round(buyButtonHeight * 0.24), 10, 13));
        card.buyShortcut.setColor("#000000");
        card.buyShortcut.setAlpha(card.buyButton.enabled ? 0.58 : 0.46);
        card.buyShortcut.setPosition(buyButtonWidth * 0.5 - Math.max(12, Math.round(buyButtonHeight * 0.3)), 0);
        card.buyShortcut.setVisible(showKeyboardHints);
      }
      card.type.setColor(this.toBrownThemeColorString(selected ? "#f8e7b8" : "#cde4f6"));
      card.name.setColor(this.toBrownThemeColorString(sold ? "#9aa8b7" : selected ? "#f1f8ff" : "#dceefe"));
      card.desc.setColor(this.toBrownThemeColorString(sold ? "#a0afbe" : selected ? "#eef7ff" : "#d9ecfb"));
      card.cost.setColor(this.toBrownThemeColorString(sold ? "#aab6c4" : "#f8e7b8"));
      if (card.hitZone) {
        card.hitZone.setPosition(0, 0);
        card.hitZone.setSize(cardW, cardH);
        const hitArea = card.hitZone.input?.hitArea;
        if (hitArea && typeof hitArea.setTo === "function") {
          hitArea.setTo(0, 0, cardW, cardH);
        }
      }
      if (this.shopListMask) {
        card.container.setMask(this.shopListMask);
      } else {
        card.container.clearMask();
      }
      card.container.setVisible(true);
    });

    this.cards.forEach((card, id) => {
      const exists = items.some((item) => item.id === id);
      if (!exists) {
        card.container.clearMask();
        card.container.setVisible(false);
      }
    });
  }

  renderButtons(snapshot, width, height) {
    const actions = [
      { id: "openShop", label: this.shopOpen ? "Close Shop" : "Shop", enabled: true },
      { id: "continueRun", label: "LEAVE CAMP", enabled: true },
    ];
    this.rebuildButtons(actions);
    const compact = this.isCompactLayout(width);
    const bar = this.bottomBarRect || {
      x: 12,
      y: height - 88,
      width: width - 24,
      height: 76,
    };
    const sidePad = 16;
    const shopButton = this.buttons.get("openShop");
    const showKeyboardHints = this.shouldShowKeyboardHints(width);
    if (compact) {
      const rowGap = 10;
      const verticalPad = 10;
      const buttonH = Math.max(38, Math.floor((bar.height - verticalPad * 2 - rowGap) * 0.5));
      const buttonW = Math.max(156, bar.width - sidePad * 2);
      const centerX = bar.x + bar.width * 0.5;
      const firstY = bar.y + verticalPad + buttonH * 0.5;
      const secondY = firstY + buttonH + rowGap;
      if (shopButton) {
        shopButton.container.setPosition(centerX, firstY);
        setGradientButtonSize(shopButton, buttonW, buttonH);
        shopButton.text.setFontSize(Math.max(14, Math.round(buttonH * 0.34)));
        shopButton.text.setText(this.shopOpen ? "Close Shop" : "Shop");
        shopButton.text.setOrigin(0.5, 0.5);
        shopButton.text.setAlign("center");
        shopButton.text.setPosition(0, 0);
        if (shopButton.icon) {
          shopButton.icon.setVisible(false);
        }
        if (shopButton.shortcut) {
          shopButton.shortcut.setVisible(false);
        }
        shopButton.enabled = true;
        this.applyButtonStyle(shopButton, "idle");
        shopButton.container.setAlpha(1);
        shopButton.container.setVisible(true);
      }
      const continueButton = this.buttons.get("continueRun");
      if (continueButton) {
        continueButton.container.setPosition(centerX, secondY);
        setGradientButtonSize(continueButton, buttonW, buttonH);
        continueButton.text.setFontSize(Math.max(14, Math.round(buttonH * 0.34)));
        continueButton.text.setText("LEAVE CAMP");
        continueButton.text.setOrigin(0, 0.5);
        continueButton.text.setAlign("left");
        continueButton.text.setPosition(-buttonW * 0.5 + 18, 0);
        if (continueButton.icon) {
          continueButton.icon.setVisible(false);
        }
        if (continueButton.shortcut) {
          continueButton.shortcut.setText("ENTER");
          continueButton.shortcut.setPosition(buttonW * 0.5 - 14, 0);
          continueButton.shortcut.setVisible(showKeyboardHints);
        }
        continueButton.enabled = true;
        this.applyButtonStyle(continueButton, "idle");
        continueButton.container.setAlpha(1);
        continueButton.container.setVisible(true);
      }
      return;
    }
    const buttonH = Math.max(50, Math.min(62, Math.round(bar.height * 0.72)));
    const shopButtonW = Math.max(170, Math.min(230, Math.round(width * 0.17)));
    const leaveButtonW = Math.max(220, Math.min(320, Math.round(width * 0.24)));
    const y = bar.y + bar.height * 0.5;
    if (shopButton) {
      shopButton.container.setPosition(bar.x + sidePad + shopButtonW * 0.5, y);
      setGradientButtonSize(shopButton, shopButtonW, buttonH);
      shopButton.text.setFontSize(Math.max(17, Math.round(buttonH * 0.34)));
      shopButton.text.setText(this.shopOpen ? "Close Shop" : "Shop");
      shopButton.text.setOrigin(0.5, 0.5);
      shopButton.text.setAlign("center");
      shopButton.text.setPosition(0, 0);
      if (shopButton.icon) {
        shopButton.icon.setVisible(false);
      }
      if (shopButton.shortcut) {
        shopButton.shortcut.setVisible(false);
      }
      shopButton.enabled = true;
      this.applyButtonStyle(shopButton, "idle");
      shopButton.container.setAlpha(1);
      shopButton.container.setVisible(true);
    }
    const continueButton = this.buttons.get("continueRun");
    if (continueButton) {
      continueButton.container.setPosition(bar.x + bar.width - sidePad - leaveButtonW * 0.5, y);
      setGradientButtonSize(continueButton, leaveButtonW, buttonH);
      continueButton.text.setFontSize(Math.max(17, Math.round(buttonH * 0.34)));
      continueButton.text.setText("LEAVE CAMP");
      continueButton.text.setOrigin(0, 0.5);
      continueButton.text.setAlign("left");
      continueButton.text.setPosition(-leaveButtonW * 0.5 + 22, 0);
      if (continueButton.icon) {
        continueButton.icon.setVisible(false);
      }
      if (continueButton.shortcut) {
        continueButton.shortcut.setText("ENTER");
        continueButton.shortcut.setPosition(leaveButtonW * 0.5 - 16, 0);
        continueButton.shortcut.setVisible(showKeyboardHints);
      }
      continueButton.enabled = true;
      this.applyButtonStyle(continueButton, "idle");
      continueButton.container.setAlpha(1);
      continueButton.container.setVisible(true);
    }
  }

  rebuildCards(items) {
    const signature = items.map((item) => item.id).join("|");
    if (signature === this.lastCardSignature) {
      return;
    }
    this.lastCardSignature = signature;
    this.cards.forEach((card) => card.container.destroy());
    this.cards.clear();

    items.forEach((item, index) => {
      const container = this.add.container(0, 0);
      const bg = this.add.graphics();
      this.applyBrownThemeToGraphics(bg);
      const type = this.add
        .text(14, 24, "SERVICE", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "17px",
          color: this.toBrownThemeColorString("#cde4f6"),
        })
        .setOrigin(0, 0.5);
      const name = this.add
        .text(14, 58, item.name || "Item", {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "29px",
          color: this.toBrownThemeColorString("#dceefe"),
        })
        .setOrigin(0, 0.5);
      const descPanel = this.add
        .rectangle(14, 92, 222, 174, this.toBrownThemeColorNumber(0x0a1520), 0.34)
        .setOrigin(0, 0);
      const desc = this.add
        .text(14, 96, item.description || "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "20px",
          color: this.toBrownThemeColorString("#d9ecfb"),
          wordWrap: { width: 220 },
          lineSpacing: 7,
        })
        .setOrigin(0, 0);
      const cost = this.add
        .text(125, 270, `${item.cost || 0}`, {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "20px",
          color: this.toBrownThemeColorString("#f8e7b8"),
          fontStyle: "700",
        })
        .setOrigin(0.5, 0.5);
      const card = {
        id: item.id,
        currentIndex: index,
        container,
        bg,
        type,
        name,
        descPanel,
        desc,
        cost,
        buyButton: null,
        buyIcon: null,
        buyShortcut: null,
        buyEnabled: false,
      };
      const buyButton = createGradientButton(this, {
        id: `buy-${item.id}`,
        label: "BUY",
        styleSet: BUTTON_STYLE,
        onPress: () => {
          if (!card.buyEnabled) {
            return;
          }
          this.invokeAction("buy", card.currentIndex);
        },
        width: 220,
        height: 50,
        fontSize: 18,
      });
      buyButton.hitZone.on("pointerover", () => this.handleCardHover(card.currentIndex));
      buyButton.hitZone.on("pointerdown", () => this.handleCardHover(card.currentIndex));
      buyButton.container.setPosition(125, 310);
      const buyIcon = this.add
        .image(0, 0, this.resolveDarkIconTexture(SHOP_BUY_ICON_KEY))
        .setDisplaySize(33, 33)
        .setAlpha(0.92);
      const buyShortcut = this.add
        .text(0, 0, "Z", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "13px",
          color: "#000000",
          fontStyle: "700",
        })
        .setOrigin(1, 0.5)
        .setAlpha(0.58);
      buyButton.container.add([buyIcon, buyShortcut]);
      card.buyIcon = buyIcon;
      card.buyShortcut = buyShortcut;
      card.buyButton = buyButton;

      container.add([bg, type, name, descPanel, desc, cost]);

      const cardHit = this.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      cardHit.on("pointerover", () => this.handleCardHover(card.currentIndex));
      cardHit.on("pointerdown", () => this.invokeAction("selectIndex", card.currentIndex));
      container.add(cardHit);
      container.add(buyButton.container);
      card.hitZone = cardHit;

      this.cards.set(item.id, card);
    });
  }

  rebuildButtons(actions) {
    const expected = new Set(actions.map((entry) => entry.id));
    this.buttons.forEach((button, id) => {
      if (!expected.has(id)) {
        button.container.destroy();
        this.buttons.delete(id);
      }
    });

    actions.forEach((action) => {
      if (this.buttons.has(action.id)) {
        return;
      }
      const button = createGradientButton(this, {
        id: action.id,
        label: action.label,
        styleSet: BUTTON_STYLE,
        onPress: () => {
          if (action.id === "openShop") {
            this.setShopOpen(!this.shopOpen);
            return;
          }
          this.invokeAction(action.id);
        },
        width: 210,
        height: 64,
        fontSize: 28,
      });
      const icon = this.add.image(0, 0, this.resolveDarkIconTexture(SHOP_DEAL_ICON_KEY)).setDisplaySize(20, 20).setAlpha(0.92);
      const shortcut = this.add
        .text(0, 0, "ENTER", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "12px",
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

  applyButtonStyle(button, styleName) {
    applyGradientButtonStyle(button, styleName);
  }

  applyBuyButtonStyle(button, styleName) {
    applyGradientButtonStyle(button, styleName);
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

  hideAllText() {
    this.textNodes.forEach((text) => text.setVisible(false));
  }

  drawText(key, value, x, y, style, origin = { x: 0.5, y: 0.5 }) {
    const themedStyle = this.toBrownThemeTextStyle(style);
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

  resolveTightTexture(sourceKey, outputKey, alphaThreshold = 8) {
    if (!sourceKey || !outputKey || !this.textures.exists(sourceKey)) {
      return sourceKey;
    }
    if (this.textures.exists(outputKey) || typeof this.textures.createCanvas !== "function") {
      return this.textures.exists(outputKey) ? outputKey : sourceKey;
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

  renderTopActions(width) {
    if (!this.topButtons.size) {
      const entries = [
        {
          id: "logs",
          iconKey: SHOP_TOP_ACTION_ICON_KEYS.logs,
          onPress: () => {
            this.logsModalOpen = !this.logsModalOpen;
          },
        },
        {
          id: "home",
          iconKey: SHOP_TOP_ACTION_ICON_KEYS.home,
          onPress: () => {
            this.logsModalOpen = false;
            this.invokeAction("goHome");
          },
        },
      ];
      entries.forEach((entry) => {
        const button = createGradientButton(this, {
          id: `shop-top-${entry.id}`,
          label: "",
          styleSet: BUTTON_STYLE,
          onPress: entry.onPress,
          width: 42,
          height: 42,
          fontSize: 14,
          hoverScale: 1,
          pressedScale: 0.98,
        });
        button.text.setVisible(false);
        const icon = this.add
          .image(0, 0, this.resolveDarkIconTexture(entry.iconKey))
          .setDisplaySize(18, 18)
          .setAlpha(0.92);
        button.container.add(icon);
        button.icon = icon;
        button.container.setDepth(230);
        this.topButtons.set(entry.id, button);
      });
    }
    const buttonSize = width < 760 ? 38 : 42;
    const gap = 8;
    const rightX = width - 20 - buttonSize * 0.5;
    const y = 32;
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

  ensureModalCloseButton(onPress) {
    if (this.logsCloseButton) {
      return this.logsCloseButton;
    }
    this.logsCloseButton = createModalCloseButton(this, {
      id: "shop-logs-close",
      styleSet: BUTTON_STYLE,
      onPress,
      depth: SHOP_MODAL_CLOSE_DEPTH,
      width: 42,
      height: 32,
      iconSize: 15,
    });
    return this.logsCloseButton;
  }

  ensureShopCloseButton() {
    if (this.shopCloseButton) {
      return this.shopCloseButton;
    }
    this.shopCloseButton = createModalCloseButton(this, {
      id: "shop-panel-close",
      styleSet: BUTTON_STYLE,
      onPress: () => this.setShopOpen(false),
      depth: 130,
      width: 34,
      height: 30,
      iconSize: 13,
    });
    return this.shopCloseButton;
  }

  drawLogsModal(snapshot, width, height) {
    if (!this.overlayGraphics || !this.logsModalOpen) {
      if (this.logsCloseButton) {
        this.logsCloseButton.container.setVisible(false);
      }
      return;
    }
    const rawLogs = Array.isArray(snapshot?.logs) ? snapshot.logs : [];
    const logs = ["Run started.", ...rawLogs.map((entry) => String(entry || ""))];
    const compact = width < 760;
    const modalW = Phaser.Math.Clamp(width - 56, 320, 720);
    const modalH = Phaser.Math.Clamp(460, 240, height - 96);
    const x = Math.round(width * 0.5 - modalW * 0.5);
    const y = Math.round(height * 0.5 - modalH * 0.5);
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
    const title = this.drawText("shop-logs-title", "RUN LOGS", x + 18, y + 26, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "24px",
      color: "#f2d8a0",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    title.setDepth(SHOP_MODAL_CONTENT_DEPTH);
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
      const bubbleStroke = isStart || isHandResolution ? SHOP_PRIMARY_GOLD : 0x5c7d99;
      this.overlayGraphics.fillStyle(bubbleFill, isStart || isHandResolution ? 0.92 : 0.84);
      this.overlayGraphics.fillRoundedRect(listX, rowY, listW, rowH, 12);
      this.overlayGraphics.lineStyle(1.1, bubbleStroke, isStart || isHandResolution ? 0.54 : 0.34);
      this.overlayGraphics.strokeRoundedRect(listX, rowY, listW, rowH, 12);
      const normalized = String(line || "").replace(/\s+/g, " ").trim();
      const displayLine = normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1).trimEnd()}…` : normalized;
      const row = this.drawText(`shop-logs-line-${index}`, displayLine, listX + 12, rowY + rowH * 0.5, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: compact ? "13px" : "15px",
        color: isStart || isHandResolution ? "#f2cd88" : "#d7e6f3",
        fontStyle: isStart ? "700" : "600",
      }, { x: 0, y: 0.5 });
      row.setDepth(SHOP_MODAL_CONTENT_DEPTH);
    });
    const dots = ".".repeat((Math.floor(this.time.now / 300) % 3) + 1);
    const waiting = this.drawText("shop-logs-waiting", `waiting${dots}`, listX + listW - 2, y + modalH - 14, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: compact ? "11px" : "12px",
      color: "#f2cd88",
      fontStyle: "600",
    }, { x: 1, y: 1 });
    waiting.setDepth(SHOP_MODAL_CONTENT_DEPTH);
    const closeButton = this.ensureModalCloseButton(() => {
      this.logsModalOpen = false;
    });
    placeModalCloseButton(closeButton, {
      x: x + modalW - 26,
      y: y + 24,
      depth: SHOP_MODAL_CLOSE_DEPTH,
      width: 42,
      height: 32,
      iconSize: 15,
      enabled: true,
      visible: true,
      styleName: "idle",
      applyStyle: (button, styleName) => this.applyButtonStyle(button, styleName),
    });
  }
}
