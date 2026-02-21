import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";
import { createModalCloseButton, drawFramedModalPanel, drawModalBackdrop, placeModalCloseButton } from "./ui/modal-ui.js";
import { getRewardApi as getRewardApiFromRuntime, tickRuntime } from "./runtime-bridge.js";

const CARD_STYLE = Object.freeze({
  fill: 0x12263a,
  fillSelected: 0x18324a,
  edge: 0x2f4f68,
  edgeSelected: 0x87bce4,
  pill: 0x153a55,
  pillSelected: 0x1f4d6d,
  claim: 0xd8a255,
  claimSelected: 0xe6ba72,
});

const BUTTON_STYLE = ACTION_BUTTON_STYLE;
const REWARD_CHIPS_ICON_KEY = "__reward-chips-icon__";
const REWARD_CHIPS_ICON_TRIM_KEY = "__reward-chips-icon-trim__";
const REWARD_PRIMARY_GOLD = 0xf2cd88;
const REWARD_MODAL_BASE_DEPTH = 300;
const REWARD_MODAL_CONTENT_DEPTH = 310;
const REWARD_MODAL_CLOSE_DEPTH = 320;
const REWARD_TOP_ACTION_ICON_KEYS = Object.freeze({
  logs: "__reward-top-action-logs__",
  home: "__reward-top-action-home__",
});
const REWARD_TOP_ACTION_ICONS = Object.freeze({
  logs: "/images/icons/log.png",
  home: "/images/icons/home.png",
});
const REWARD_THEME_BLUE_HUE_MIN = 170;
const REWARD_THEME_BLUE_HUE_MAX = 255;
const REWARD_THEME_BROWN_HUE = 30 / 360;
const REWARD_THEME_SATURATION_FLOOR = 0.18;
const REWARD_THEME_SATURATION_SCALE = 0.8;

export class RewardScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.reward);
    this.graphics = null;
    this.textNodes = new Map();
    this.cards = new Map();
    this.buttons = new Map();
    this.lastSignature = "";
    this.keyboardHandlers = [];
    this.lastSnapshot = null;
    this.chipsIcon = null;
    this.overlayGraphics = null;
    this.topButtons = new Map();
    this.logsModalOpen = false;
    this.logsCloseButton = null;
    this.modalBlocker = null;
    this.darkIconTextureBySource = new Map();
  }

  preload() {
    if (!this.textures.exists(REWARD_CHIPS_ICON_KEY)) {
      this.load.image(REWARD_CHIPS_ICON_KEY, "/images/icons/chips.png");
    }
    Object.entries(REWARD_TOP_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, REWARD_TOP_ACTION_ICONS[actionId] || "/images/icons/home.png");
      }
    });
  }

  create() {
    this.cameras.main.setBackgroundColor("#171006");
    this.cameras.main.setAlpha(1);
    this.graphics = this.add.graphics();
    this.applyBrownThemeToGraphics(this.graphics);
    this.overlayGraphics = this.add.graphics().setDepth(REWARD_MODAL_BASE_DEPTH);
    this.applyBrownThemeToGraphics(this.overlayGraphics);
    this.modalBlocker = this.add
      .zone(0, 0, 1, 1)
      .setOrigin(0, 0)
      .setDepth(REWARD_MODAL_BASE_DEPTH + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });
    this.modalBlocker.on("pointerdown", () => {});
    const chipsTextureKey = this.resolveGoldIconTexture(this.resolveTightTexture(REWARD_CHIPS_ICON_KEY, REWARD_CHIPS_ICON_TRIM_KEY));
    this.chipsIcon = this.add.image(0, 0, chipsTextureKey).setVisible(false);
    this.chipsIcon.setDisplaySize(20, 20);
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
    if (this.modalBlocker) {
      this.modalBlocker.destroy();
      this.modalBlocker = null;
    }
    if (this.chipsIcon) {
      this.chipsIcon.destroy();
      this.chipsIcon = null;
    }
    this.darkIconTextureBySource.clear();
    if (this.overlayGraphics) {
      this.overlayGraphics.destroy();
      this.overlayGraphics = null;
    }
    this.textNodes.forEach((text) => text.destroy());
    this.textNodes.clear();
    this.lastSignature = "";
    this.logsModalOpen = false;
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
    bind("keydown-LEFT", () => this.invokeAction("prev"));
    bind("keydown-RIGHT", () => this.invokeAction("next"));
    bind("keydown-ENTER", () => this.invokeAction("claim"));
    bind("keydown-SPACE", (event) => {
      event.preventDefault();
      this.invokeAction("claim");
    });
  }

  getRewardApi() {
    return getRewardApiFromRuntime(this);
  }

  getSnapshot() {
    const api = this.getRewardApi();
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
    const api = this.getRewardApi();
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
    if (sat < 0.08 || hueDeg < REWARD_THEME_BLUE_HUE_MIN || hueDeg > REWARD_THEME_BLUE_HUE_MAX) {
      return value;
    }
    const shiftedSat = Phaser.Math.Clamp(
      sat * REWARD_THEME_SATURATION_SCALE + REWARD_THEME_SATURATION_FLOOR,
      0,
      1
    );
    const shifted = this.hslToRgb(REWARD_THEME_BROWN_HUE, shiftedSat, light);
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

  ensureRewardThumbTexture(option) {
    const id = String(option?.id || "");
    const thumbUrl = option?.thumbUrl;
    if (!id || typeof thumbUrl !== "string" || !thumbUrl.startsWith("data:image/")) {
      return null;
    }
    const textureKey = `reward-thumb-${id}`;
    if (!this.textures.exists(textureKey)) {
      try {
        this.textures.addBase64(textureKey, thumbUrl);
      } catch {
        return null;
      }
      return null;
    }
    const texture = this.textures.get(textureKey);
    const source = texture?.source?.[0];
    if (!source || !source.width || !source.height) {
      return null;
    }
    return textureKey;
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
      this.rebuildCards([]);
      this.rebuildButtons([]);
      this.topButtons.forEach((button) => button.container.setVisible(false));
      this.logsModalOpen = false;
      if (this.logsCloseButton) {
        this.logsCloseButton.container.setVisible(false);
      }
      this.syncModalBlocker(width, height);
      return;
    }

    this.drawBackground(width, height);
    this.drawHeader(snapshot, width);
    this.renderCards(snapshot, width, height);
    this.rebuildButtons([]);
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
    this.graphics.fillGradientStyle(0x0b1b2a, 0x0b1b2a, 0x060f17, 0x060f17, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x000000, 0.26);
    this.graphics.fillRoundedRect(10, 8, width - 20, height - 16, 18);
  }

  drawHeader(snapshot, width) {
    const compact = width < 760;
    const titleSize = compact ? "18px" : "33px";
    const titleY = compact ? 42 : 50;
    this.drawText("reward-title", "CHOOSE A RELIC", width * 0.5, titleY, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: titleSize,
      color: "#f6e6a6",
      stroke: "#0f1b28",
      strokeThickness: 2,
    });
    const run = snapshot.run || {};
    const chipsLabel = `${run.chips || 0}`;
    const chipNode = this.drawText("reward-chips", chipsLabel, width * 0.5, compact ? 76 : 90, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: compact ? "16px" : "21px",
      color: "#f2cd88",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    const iconSize = compact ? 17 : 22;
    const iconGap = compact ? 8 : 10;
    const leftPad = compact ? 14 : 16;
    const rightPad = compact ? 14 : 18;
    let chipFont = compact ? 16 : 21;
    chipNode.setFontSize(chipFont);
    const maxTextW = compact ? Math.max(62, width * 0.24) : Math.max(96, width * 0.14);
    while (chipNode.width > maxTextW && chipFont > 12) {
      chipFont -= 1;
      chipNode.setFontSize(chipFont);
    }
    const pillW = compact
      ? Math.max(96, Math.round(leftPad + iconSize + iconGap + chipNode.width + rightPad))
      : Math.max(120, Math.round(leftPad + iconSize + iconGap + chipNode.width + rightPad));
    const pillH = compact ? 30 : 38;
    const pillX = Math.round(width * 0.5 - pillW * 0.5);
    const pillY = compact ? 62 : 72;
    this.graphics.fillStyle(0x123046, 0.82);
    this.graphics.fillRoundedRect(pillX, pillY, pillW, pillH, 19);
    this.graphics.fillStyle(0x1f4563, 0.36);
    this.graphics.fillRoundedRect(pillX + 1, pillY + 1, pillW - 2, Math.max(10, Math.round(pillH * 0.38)), 18);
    const iconX = pillX + leftPad + iconSize * 0.5;
    const textX = iconX + iconSize * 0.5 + iconGap;
    chipNode.setPosition(textX, pillY + pillH * 0.5);
    if (this.chipsIcon) {
      this.chipsIcon.setPosition(iconX, pillY + pillH * 0.5);
      this.chipsIcon.setDisplaySize(iconSize, iconSize);
      this.chipsIcon.clearTint();
      this.chipsIcon.setVisible(true);
    }
  }

  renderTopActions(width) {
    if (!this.topButtons.size) {
      const entries = [
        {
          id: "logs",
          iconKey: REWARD_TOP_ACTION_ICON_KEYS.logs,
          onPress: () => {
            this.logsModalOpen = !this.logsModalOpen;
          },
        },
        {
          id: "home",
          iconKey: REWARD_TOP_ACTION_ICON_KEYS.home,
          onPress: () => {
            this.logsModalOpen = false;
            this.invokeAction("goHome");
          },
        },
      ];
      entries.forEach((entry) => {
        const button = createGradientButton(this, {
          id: `reward-top-${entry.id}`,
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
      id: "reward-logs-close",
      styleSet: BUTTON_STYLE,
      onPress,
      depth: REWARD_MODAL_CLOSE_DEPTH,
      width: 42,
      height: 32,
      iconSize: 15,
    });
    return this.logsCloseButton;
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
    const title = this.drawText("reward-logs-title", "RUN LOGS", x + 18, y + 26, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "24px",
      color: "#f2d8a0",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    title.setDepth(REWARD_MODAL_CONTENT_DEPTH);
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
      const bubbleStroke = isStart || isHandResolution ? REWARD_PRIMARY_GOLD : 0x5c7d99;
      this.overlayGraphics.fillStyle(bubbleFill, isStart || isHandResolution ? 0.92 : 0.84);
      this.overlayGraphics.fillRoundedRect(listX, rowY, listW, rowH, 12);
      this.overlayGraphics.lineStyle(1.1, bubbleStroke, isStart || isHandResolution ? 0.54 : 0.34);
      this.overlayGraphics.strokeRoundedRect(listX, rowY, listW, rowH, 12);
      const normalized = String(line || "").replace(/\s+/g, " ").trim();
      const displayLine = normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1).trimEnd()}…` : normalized;
      const row = this.drawText(`reward-logs-line-${index}`, displayLine, listX + 12, rowY + rowH * 0.5, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: compact ? "13px" : "15px",
        color: isStart || isHandResolution ? "#f2cd88" : "#d7e6f3",
        fontStyle: isStart ? "700" : "600",
      }, { x: 0, y: 0.5 });
      row.setDepth(REWARD_MODAL_CONTENT_DEPTH);
    });
    const dots = ".".repeat((Math.floor(this.time.now / 300) % 3) + 1);
    const waiting = this.drawText("reward-logs-waiting", `waiting${dots}`, listX + listW - 2, y + modalH - 14, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: compact ? "11px" : "12px",
      color: "#f2cd88",
      fontStyle: "600",
    }, { x: 1, y: 1 });
    waiting.setDepth(REWARD_MODAL_CONTENT_DEPTH);
    const closeButton = this.ensureModalCloseButton(() => {
      this.logsModalOpen = false;
    });
    placeModalCloseButton(closeButton, {
      x: x + modalW - 26,
      y: y + 24,
      depth: REWARD_MODAL_CLOSE_DEPTH,
      width: 42,
      height: 32,
      iconSize: 15,
      enabled: true,
      visible: true,
      styleName: "idle",
      applyStyle: (button, styleName) => this.applyButtonStyle(button, styleName),
    });
  }

  renderCards(snapshot, width, height) {
    const options = Array.isArray(snapshot.options) ? snapshot.options : [];
    this.rebuildCards(options);
    const compact = width < 760;
    let cardW = Math.max(212, Math.min(332, Math.round(width * 0.245)));
    let cardH = Math.max(278, Math.min(392, Math.round(height * 0.52)));
    let gapX = Math.max(16, Math.round(width * 0.018));
    let gapY = gapX;
    let startX = 0;
    let startY = Math.max(120, Math.round(height * 0.165));

    if (compact) {
      gapY = 10;
      startY = 102;
      cardW = Math.max(220, Math.min(width - 24, 460));
      const availableH = Math.max(260, height - startY - 14);
      cardH = Phaser.Math.Clamp(
        Math.floor((availableH - gapY * Math.max(0, options.length - 1)) / Math.max(1, options.length)),
        170,
        264
      );
      startX = Math.round(width * 0.5 - cardW * 0.5);
    } else {
      const totalW = options.length * cardW + Math.max(0, options.length - 1) * gapX;
      startX = width * 0.5 - totalW * 0.5;
    }

    options.forEach((option, index) => {
      const card = this.cards.get(option.id);
      if (!card) {
        return;
      }
      const x = compact ? startX : startX + index * (cardW + gapX);
      const y = compact ? startY + index * (cardH + gapY) : startY;
      card.container.setPosition(x, y);
      const selected = Boolean(option.selected);
      const accentColor = this.toBrownThemeColorNumber(
        Phaser.Display.Color.HexStringToColor(option.color || "#9ec3df").color
      );
      const claimEnabled = Boolean(snapshot.canClaim);
      card.bg.clear();
      card.bg.fillStyle(selected ? CARD_STYLE.fillSelected : CARD_STYLE.fill, selected ? 0.97 : 0.9);
      card.bg.fillRoundedRect(0, 0, cardW, cardH, 24);
      card.bg.fillStyle(0xffffff, selected ? 0.06 : 0.03);
      card.bg.fillRoundedRect(1, 1, cardW - 2, Math.max(40, Math.round(cardH * 0.2)), 23);
      card.bg.lineStyle(1.1, selected ? CARD_STYLE.edgeSelected : CARD_STYLE.edge, selected ? 0.72 : 0.44);
      card.bg.strokeRoundedRect(0.5, 0.5, cardW - 1, cardH - 1, 24);

      const thumbSize = compact
        ? Math.max(38, Math.min(54, Math.round(cardW * 0.18)))
        : Math.max(46, Math.min(72, Math.round(cardW * 0.22)));
      const thumbX = compact ? 12 : 16;
      const thumbY = compact ? 12 : 16;
      card.thumbFrame.clear();
      card.thumbFrame.fillStyle(0x0d1f2f, 0.92);
      card.thumbFrame.fillRoundedRect(thumbX, thumbY, thumbSize, thumbSize, 13);
      card.thumbFrame.lineStyle(1, accentColor, selected ? 0.68 : 0.4);
      card.thumbFrame.strokeRoundedRect(thumbX, thumbY, thumbSize, thumbSize, 13);
      const thumbTextureKey = this.ensureRewardThumbTexture(option);
      if (thumbTextureKey) {
        if (card.thumbImage.texture?.key !== thumbTextureKey) {
          card.thumbImage.setTexture(thumbTextureKey);
        }
        card.thumbImage.setPosition(thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5);
        card.thumbImage.setDisplaySize(thumbSize - 8, thumbSize - 8);
        card.thumbImage.setVisible(true);
        card.thumbGlyph.setVisible(false);
      } else {
        card.thumbImage.setVisible(false);
        card.thumbGlyph.setVisible(true);
        card.thumbGlyph.setPosition(thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5);
        card.thumbGlyph.setColor(this.toBrownThemeColorString(selected ? "#d8ecfd" : "#a9c1d4"));
      }

      const textLeft = thumbX + thumbSize + 12;
      const rawName = String(option.name || "Relic").replace(/\s+/g, " ").trim();
      const nameSpace = Math.max(96, cardW - textLeft - 14);
      const nameCap = Math.max(10, Math.floor(nameSpace / 10.4));
      const compactName = rawName.length > nameCap ? `${rawName.slice(0, nameCap - 1).trimEnd()}…` : rawName;
      const nameFontSize = compact
        ? Phaser.Math.Clamp(Math.round(cardW * 0.064), 16, 22)
        : Phaser.Math.Clamp(Math.round(cardW * 0.075), 21, 28);
      card.name.setText(compactName);
      card.name.setFontSize(nameFontSize);
      card.rarity.setText((option.rarityLabel || "COMMON").toUpperCase());

      const rawDesc = String(option.description || "").replace(/\s+/g, " ").trim();
      const descTop = thumbY + thumbSize + (compact ? 10 : 14);
      const descW = Math.max(120, cardW - (compact ? 24 : 30));
      const claimH = compact ? 34 : 42;
      const claimY = cardH - claimH - (compact ? 10 : 16);
      const descFontSize = compact
        ? Phaser.Math.Clamp(Math.round(cardW * 0.042), 12, 14)
        : Phaser.Math.Clamp(Math.round(cardW * 0.046), 14, 17);
      const descLineHeight = descFontSize + (compact ? 3 : 4);
      const maxDescLines = Math.max(2, Math.floor((claimY - descTop - 12) / descLineHeight));
      const descCap = Math.max(36, Math.floor((descW / (descFontSize * 0.54)) * maxDescLines));
      const compactDesc = rawDesc.length > descCap ? `${rawDesc.slice(0, descCap - 1).trimEnd()}…` : rawDesc;
      card.desc.setText(compactDesc);
      card.desc.setFontSize(descFontSize);
      card.desc.setWordWrapWidth(descW, true);
      card.name.setColor(this.toBrownThemeColorString(selected ? "#f3f9ff" : "#dbeefd"));
      card.rarity.setColor(this.toBrownThemeColorString(selected ? "#d9ecfb" : "#bfd7ea"));
      card.desc.setColor(this.toBrownThemeColorString(selected ? "#d8e8f5" : "#c3d7ea"));
      card.rarityPill.clear();
      card.rarityPill.fillStyle(selected ? CARD_STYLE.pillSelected : CARD_STYLE.pill, selected ? 0.9 : 0.75);
      const rarityW = Phaser.Math.Clamp(Math.round(card.rarity.width + 16), 64, compact ? 108 : 122);
      const rarityH = compact ? 18 : 22;
      card.rarityPill.fillRoundedRect(textLeft, thumbY + 3, rarityW, rarityH, Math.round(rarityH * 0.5));
      card.rarity.setPosition(textLeft + 10, thumbY + 14);
      card.rarity.setFontSize(compact ? 11 : 12);
      card.name.setPosition(textLeft, thumbY + (compact ? 33 : 42));
      card.desc.setPosition(compact ? 12 : 15, descTop);

      const claimX = compact ? 10 : 14;
      const claimW = cardW - (compact ? 20 : 28);
      const claimRadius = compact ? 17 : 21;
      card.claimPill.clear();
      card.claimPill.fillStyle(selected ? CARD_STYLE.claimSelected : CARD_STYLE.claim, claimEnabled ? 0.97 : 0.52);
      card.claimPill.fillRoundedRect(claimX, claimY, claimW, claimH, claimRadius);
      card.claimPill.fillStyle(0xffffff, claimEnabled ? 0.16 : 0.08);
      card.claimPill.fillRoundedRect(claimX + 1, claimY + 1, claimW - 2, compact ? 11 : 14, Math.max(10, claimRadius - 1));
      card.claimPill.lineStyle(1, 0x3e2a12, claimEnabled ? 0.36 : 0.16);
      card.claimPill.strokeRoundedRect(claimX, claimY, claimW, claimH, claimRadius);
      card.claimText.setPosition(claimX + claimW * 0.5, claimY + claimH * 0.5);
      card.claimText.setFontSize(compact ? 14 : 21);
      card.claimText.setColor(this.toBrownThemeColorString(claimEnabled ? "#2b1f11" : "#6f5f48"));
      card.claimText.setText(claimEnabled ? "CLAIM" : "LOCKED");
      card.claimHit.setPosition(claimX, claimY);
      card.claimHit.setSize(claimW, claimH);
      card.claimEnabled = claimEnabled;
      if (card.claimHit.input) {
        card.claimHit.input.cursor = card.claimEnabled ? "pointer" : "default";
      }
      if (card.hitZone.input) {
        card.hitZone.input.cursor = "pointer";
      }
      card.hitZone.setSize(cardW, cardH);
      card.container.setVisible(true);
    });

    this.cards.forEach((card, id) => {
      const exists = options.some((option) => option.id === id);
      if (!exists) {
        card.container.setVisible(false);
      }
    });
  }

  rebuildCards(options) {
    const signature = options.map((option) => option.id).join("|");
    if (signature === this.lastSignature) {
      return;
    }
    this.lastSignature = signature;
    this.cards.forEach((card) => card.container.destroy());
    this.cards.clear();

    options.forEach((option, index) => {
      const container = this.add.container(0, 0);
      const bg = this.add.graphics();
      this.applyBrownThemeToGraphics(bg);
      const thumbFrame = this.add.graphics();
      this.applyBrownThemeToGraphics(thumbFrame);
      const thumbImage = this.add.image(0, 0, "__WHITE").setVisible(false);
      const thumbGlyph = this.add
        .text(0, 0, "◆", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "18px",
          color: this.toBrownThemeColorString("#cde4f6"),
          fontStyle: "700",
        })
        .setOrigin(0.5, 0.5);
      const hitZone = this.add.zone(0, 0, 1, 1).setOrigin(0, 0);
      hitZone.setInteractive({ useHandCursor: true });
      const rarity = this.add
        .text(14, 24, "COMMON", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "12px",
          color: this.toBrownThemeColorString("#cde4f6"),
          fontStyle: "700",
        })
        .setOrigin(0, 0.5);
      const rarityPill = this.add.graphics();
      this.applyBrownThemeToGraphics(rarityPill);
      const name = this.add
        .text(14, 56, option.name || "Relic", {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "24px",
          color: this.toBrownThemeColorString("#dbeefd"),
          fontStyle: "700",
        })
        .setOrigin(0, 0.5);
      const desc = this.add
        .text(14, 98, option.description || "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "16px",
          color: this.toBrownThemeColorString("#d9ecfb"),
          wordWrap: { width: 220 },
          lineSpacing: 3,
        })
        .setOrigin(0, 0);
      const claimPill = this.add.graphics();
      this.applyBrownThemeToGraphics(claimPill);
      const claimHit = this.add.zone(0, 0, 1, 1).setOrigin(0, 0);
      claimHit.setInteractive({ useHandCursor: true });
      const claimText = this.add
        .text(0, 0, "CLAIM", {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "21px",
          color: this.toBrownThemeColorString("#2b1f11"),
          fontStyle: "700",
        })
        .setOrigin(0.5, 0.5);
      const card = {
        container,
        bg,
        thumbFrame,
        thumbImage,
        thumbGlyph,
        hitZone,
        rarityPill,
        rarity,
        name,
        desc,
        claimPill,
        claimHit,
        claimText,
        claimEnabled: true,
      };
      hitZone.on("pointerdown", () => this.invokeAction("selectIndex", index));
      claimHit.on("pointerdown", () => {
        this.invokeAction("selectIndex", index);
        if (!card.claimEnabled) {
          return;
        }
        this.invokeAction("claim");
      });
      container.add([bg, thumbFrame, thumbImage, thumbGlyph, rarityPill, rarity, name, desc, claimPill, claimText, hitZone, claimHit]);
      this.cards.set(option.id, card);
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
        onPress: () => this.invokeAction(action.id),
        width: 210,
        height: 64,
        fontSize: 28,
      });
      this.buttons.set(action.id, button);
    });
  }

  applyButtonStyle(button, styleName) {
    applyGradientButtonStyle(button, styleName);
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
}
