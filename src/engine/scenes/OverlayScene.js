import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";
import { createModalCloseButton, drawModalBackdrop, placeModalCloseButton } from "./ui/modal-ui.js";
import { getOverlayApi as getOverlayApiFromRuntime, tickRuntime } from "./runtime-bridge.js";

const BUTTON_STYLE = ACTION_BUTTON_STYLE;
const COLLECTION_ROW_GAP = 9;
const COLLECTION_ROW_HEIGHT = 56;
const OVERLAY_THEME_BLUE_HUE_MIN = 170;
const OVERLAY_THEME_BLUE_HUE_MAX = 255;
const OVERLAY_THEME_BROWN_HUE = 30 / 360;
const OVERLAY_THEME_SATURATION_FLOOR = 0.18;
const OVERLAY_THEME_SATURATION_SCALE = 0.74;

export class OverlayScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.overlay);
    this.graphics = null;
    this.textNodes = new Map();
    this.entryCards = new Map();
    this.buttons = new Map();
    this.lastEntrySignature = "";
    this.keyboardHandlers = [];
    this.lastSnapshot = null;
    this.currentMode = null;
    this.collectionListContainer = null;
    this.collectionMaskShape = null;
    this.collectionMask = null;
    this.collectionScroll = 0;
    this.collectionScrollTarget = 0;
    this.collectionScrollMax = 0;
    this.collectionViewport = null;
    this.collectionDragPointerId = null;
    this.collectionDragStartY = 0;
    this.collectionDragStartScroll = 0;
    this.collectionSignature = "";
    this.pointerHandlers = [];
  }

  create() {
    this.cameras.main.setBackgroundColor("#171006");
    this.cameras.main.setAlpha(1);
    this.graphics = this.applyBrownThemeToGraphics(this.add.graphics());
    this.collectionListContainer = this.add.container(0, 0);
    this.collectionMaskShape = this.applyBrownThemeToGraphics(this.make.graphics({ x: 0, y: 0, add: false }));
    this.collectionMask = this.collectionMaskShape.createGeometryMask();
    this.collectionListContainer.setMask(this.collectionMask);
    this.collectionListContainer.setVisible(false);
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
    this.entryCards.forEach((card) => card.container.destroy());
    this.entryCards.clear();
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();
    if (this.collectionListContainer) {
      this.collectionListContainer.destroy();
      this.collectionListContainer = null;
    }
    if (this.collectionMaskShape) {
      this.collectionMaskShape.destroy();
      this.collectionMaskShape = null;
      this.collectionMask = null;
    }
    this.textNodes.forEach((text) => text.destroy());
    this.textNodes.clear();
    this.lastEntrySignature = "";
    this.currentMode = null;
    this.collectionSignature = "";
    this.collectionViewport = null;
    this.collectionScroll = 0;
    this.collectionScrollTarget = 0;
    this.collectionScrollMax = 0;
    this.pointerHandlers.forEach(({ eventName, handler }) => {
      this.input.off(eventName, handler);
    });
    this.pointerHandlers = [];
  }

  update(time, delta) {
    tickRuntime(this, time, delta);
    const snapshot = this.getSnapshot();
    this.lastSnapshot = snapshot;
    this.currentMode = snapshot?.mode || null;
    if (this.currentMode !== "collection") {
      this.collectionScroll = 0;
      this.collectionScrollTarget = 0;
      this.collectionScrollMax = 0;
      this.collectionViewport = null;
      this.collectionDragPointerId = null;
    }
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

    bind("keydown-LEFT", () => {
      if (this.currentMode === "collection") {
        this.scrollCollectionBy(-180);
      }
    });
    bind("keydown-RIGHT", () => {
      if (this.currentMode === "collection") {
        this.scrollCollectionBy(180);
      }
    });
    bind("keydown-UP", () => {
      if (this.currentMode === "collection") {
        this.scrollCollectionBy(-150);
      }
    });
    bind("keydown-DOWN", () => {
      if (this.currentMode === "collection") {
        this.scrollCollectionBy(150);
      }
    });
    bind("keydown-PAGEUP", () => {
      if (this.currentMode === "collection") {
        this.scrollCollectionBy(-360);
      }
    });
    bind("keydown-PAGEDOWN", () => {
      if (this.currentMode === "collection") {
        this.scrollCollectionBy(360);
      }
    });
    bind("keydown-ENTER", (event) => {
      event.preventDefault();
      this.invokeAction("confirm");
    });
    bind("keydown-SPACE", (event) => {
      event.preventDefault();
      this.invokeAction("confirm");
    });
    bind("keydown-ESC", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("backToMenu");
      }
    });
    bind("keydown-A", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("backToMenu");
      }
    });
    bind("keydown-R", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("backToMenu");
      }
    });
  }

  bindPointerInput() {
    const bind = (eventName, handler) => {
      this.input.on(eventName, handler);
      this.pointerHandlers.push({ eventName, handler });
    };

    bind("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (this.currentMode !== "collection" || !this.collectionViewport) {
        return;
      }
      if (!this.pointInRect(pointer.worldX, pointer.worldY, this.collectionViewport)) {
        return;
      }
      this.scrollCollectionBy(deltaY * 0.84);
    });

    bind("pointerdown", (pointer) => {
      if (this.currentMode !== "collection" || !this.collectionViewport) {
        return;
      }
      if (!this.pointInRect(pointer.worldX, pointer.worldY, this.collectionViewport)) {
        return;
      }
      this.collectionDragPointerId = pointer.id;
      this.collectionDragStartY = pointer.worldY;
      this.collectionDragStartScroll = this.collectionScrollTarget;
    });

    bind("pointermove", (pointer) => {
      if (this.currentMode !== "collection") {
        return;
      }
      if (this.collectionDragPointerId == null || pointer.id !== this.collectionDragPointerId) {
        return;
      }
      const delta = this.collectionDragStartY - pointer.worldY;
      this.setCollectionScroll(this.collectionDragStartScroll + delta);
      this.collectionScroll = this.collectionScrollTarget;
    });

    bind("pointerup", (pointer) => {
      if (pointer.id === this.collectionDragPointerId) {
        this.collectionDragPointerId = null;
      }
    });
    bind("pointerupoutside", (pointer) => {
      if (pointer.id === this.collectionDragPointerId) {
        this.collectionDragPointerId = null;
      }
    });
  }

  getOverlayApi() {
    return getOverlayApiFromRuntime(this);
  }

  getSnapshot() {
    const api = this.getOverlayApi();
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
    const mappedName = actionName === "closeCollection" ? "backToMenu" : actionName;
    const api = this.getOverlayApi();
    const action = api ? api[mappedName] : null;
    if (typeof action === "function") {
      action(value);
    }
  }

  pointInRect(x, y, rect) {
    if (!rect) {
      return false;
    }
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  applyBrownThemeToGraphics(graphics) {
    if (!graphics || graphics.__overlayBrownThemePatched) {
      return graphics;
    }
    const fillStyle = graphics.fillStyle;
    graphics.fillStyle = (color, alpha) => fillStyle.call(graphics, this.toBrownThemeColorNumber(color), alpha);
    const lineStyle = graphics.lineStyle;
    graphics.lineStyle = (lineWidth, color, alpha) =>
      lineStyle.call(graphics, lineWidth, this.toBrownThemeColorNumber(color), alpha);
    if (typeof graphics.fillGradientStyle === "function") {
      const fillGradientStyle = graphics.fillGradientStyle;
      graphics.fillGradientStyle = (topLeft, topRight, bottomLeft, bottomRight, alphaTopLeft, alphaTopRight, alphaBottomLeft, alphaBottomRight) =>
        fillGradientStyle.call(
          graphics,
          this.toBrownThemeColorNumber(topLeft),
          this.toBrownThemeColorNumber(topRight),
          this.toBrownThemeColorNumber(bottomLeft),
          this.toBrownThemeColorNumber(bottomRight),
          alphaTopLeft,
          alphaTopRight,
          alphaBottomLeft,
          alphaBottomRight
        );
    }
    graphics.__overlayBrownThemePatched = true;
    return graphics;
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
    if (typeof value !== "string") {
      return value;
    }
    const match = value.trim().match(/^#([0-9a-fA-F]{6})$/);
    if (!match) {
      return value;
    }
    const input = parseInt(match[1], 16);
    const output = this.toBrownThemeColorNumber(input);
    return `#${output.toString(16).padStart(6, "0")}`;
  }

  toBrownThemeColorNumber(value) {
    if (!Number.isFinite(value)) {
      return value;
    }
    const color = Phaser.Display.Color.IntegerToColor(value);
    const hsl = this.rgbToHsl(color.red, color.green, color.blue);
    const hueDeg = (Number(hsl.h) || 0) * 360;
    const sat = Number(hsl.s) || 0;
    const light = Number(hsl.l) || 0;
    if (sat < 0.08 || hueDeg < OVERLAY_THEME_BLUE_HUE_MIN || hueDeg > OVERLAY_THEME_BLUE_HUE_MAX) {
      return value;
    }
    const shiftedSat = Phaser.Math.Clamp(Math.max(OVERLAY_THEME_SATURATION_FLOOR, sat * OVERLAY_THEME_SATURATION_SCALE), 0, 1);
    const shiftedLight = Phaser.Math.Clamp(light * 0.98 + 0.02, 0, 1);
    const shifted = this.hslToRgb(OVERLAY_THEME_BROWN_HUE, shiftedSat, shiftedLight);
    return Phaser.Display.Color.GetColor(shifted.r, shifted.g, shifted.b);
  }

  rgbToHsl(r, g, b) {
    const rn = Phaser.Math.Clamp((Number(r) || 0) / 255, 0, 1);
    const gn = Phaser.Math.Clamp((Number(g) || 0) / 255, 0, 1);
    const bn = Phaser.Math.Clamp((Number(b) || 0) / 255, 0, 1);
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) * 0.5;
    if (delta > 0) {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      if (max === rn) {
        h = (gn - bn) / delta + (gn < bn ? 6 : 0);
      } else if (max === gn) {
        h = (bn - rn) / delta + 2;
      } else {
        h = (rn - gn) / delta + 4;
      }
      h /= 6;
    }
    return { h, s, l };
  }

  hslToRgb(h, s, l) {
    const hue = ((Number(h) || 0) % 1 + 1) % 1;
    const sat = Phaser.Math.Clamp(Number(s) || 0, 0, 1);
    const light = Phaser.Math.Clamp(Number(l) || 0, 0, 1);
    if (sat === 0) {
      const v = Math.round(light * 255);
      return { r: v, g: v, b: v };
    }
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    const hue2rgb = (t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    return {
      r: Math.round(hue2rgb(hue + 1 / 3) * 255),
      g: Math.round(hue2rgb(hue) * 255),
      b: Math.round(hue2rgb(hue - 1 / 3) * 255),
    };
  }

  setCollectionScroll(next) {
    this.collectionScrollTarget = Phaser.Math.Clamp(Number(next) || 0, 0, this.collectionScrollMax);
  }

  scrollCollectionBy(delta) {
    this.setCollectionScroll(this.collectionScrollTarget + (Number(delta) || 0));
  }

  ensureCollectionThumbTexture(entry) {
    const id = String(entry?.id || "");
    const thumbUrl = entry?.thumbUrl;
    if (!id || typeof thumbUrl !== "string" || !thumbUrl.startsWith("data:image/")) {
      return null;
    }
    const textureKey = `collection-thumb-${id}`;
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

  renderSnapshot(snapshot) {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    this.graphics.clear();
    this.hideAllText();
    if (!snapshot) {
      if (this.collectionListContainer) {
        this.collectionListContainer.setVisible(false);
      }
      this.rebuildEntryCards([]);
      this.rebuildButtons([]);
      return;
    }

    if (snapshot.mode === "collection") {
      this.renderCollection(snapshot, width, height);
      return;
    }
    if (this.collectionListContainer) {
      this.collectionListContainer.setVisible(false);
    }
    this.rebuildEntryCards([]);
    this.renderEndOverlay(snapshot, width, height);
  }

  renderCollection(snapshot, width, height) {
    this.graphics.fillGradientStyle(0x0a1d2c, 0x0a1d2c, 0x06121d, 0x06121d, 1);
    this.graphics.fillRect(0, 0, width, height);
    drawModalBackdrop(this.graphics, width, height, { color: 0x000000, alpha: 0.82 });

    const panelInsetX = 6;
    const panelInsetY = 8;
    const panelX = panelInsetX;
    const panelY = panelInsetY;
    const panelW = Math.max(320, width - panelInsetX * 2);
    const panelH = Math.max(240, height - panelInsetY * 2);
    const panelRadius = 20;

    this.graphics.fillGradientStyle(0x112435, 0x112435, 0x0d1d2c, 0x0d1d2c, 0.97);
    this.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, panelRadius);
    this.graphics.lineStyle(1, 0xd2e6f7, 0.18);
    this.graphics.strokeRoundedRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2, panelRadius - 2);

    this.drawText("collection-title", "COLLECTIONS", width * 0.5, panelY + 34, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "34px",
      color: "#f2d8a0",
      stroke: "#0a1118",
      strokeThickness: 2,
      fontStyle: "700",
    });
    this.drawText("collection-summary", snapshot.summary || "", width * 0.5, panelY + 62, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "15px",
      color: "#bdd5e8",
    });

    const viewportPadX = 12;
    const viewportY = panelY + 78;
    const viewportH = panelH - 90;
    const scrollBarW = 14;
    const viewportX = panelX + viewportPadX;
    const viewportW = panelW - viewportPadX * 2 - scrollBarW - 8;

    this.graphics.fillStyle(0x0d1b29, 0.4);
    this.graphics.fillRoundedRect(viewportX, viewportY, viewportW, viewportH, 16);
    this.graphics.lineStyle(1, 0xa8c6db, 0.22);
    this.graphics.strokeRoundedRect(viewportX, viewportY, viewportW, viewportH, 16);

    const entries = Array.isArray(snapshot.entries)
      ? snapshot.entries
      : Array.isArray(snapshot.pageEntries)
        ? snapshot.pageEntries
        : [];
    const signature = entries.map((entry) => entry.id).join("|");
    if (signature !== this.collectionSignature) {
      this.collectionSignature = signature;
      this.collectionScroll = 0;
      this.collectionScrollTarget = 0;
    }
    this.rebuildEntryCards(entries);
    this.collectionViewport = { x: viewportX, y: viewportY, width: viewportW, height: viewportH };
    if (this.collectionMaskShape) {
      this.collectionMaskShape.clear();
      this.collectionMaskShape.fillStyle(0xffffff, 1);
      this.collectionMaskShape.fillRoundedRect(viewportX, viewportY, viewportW, viewportH, 14);
    }

    const cardW = viewportW - 12;
    const cardH = COLLECTION_ROW_HEIGHT;
    const contentH = Math.max(0, entries.length * (cardH + COLLECTION_ROW_GAP) - COLLECTION_ROW_GAP);
    this.collectionScrollMax = Math.max(0, contentH - viewportH);
    this.setCollectionScroll(this.collectionScrollTarget);
    this.collectionScroll = Phaser.Math.Linear(this.collectionScroll, this.collectionScrollTarget, 0.34);
    const listStartX = viewportX + 6;
    const listStartY = viewportY + 6 - this.collectionScroll;

    entries.forEach((entry, index) => {
      const card = this.entryCards.get(entry.id);
      if (!card) {
        return;
      }
      const x = listStartX;
      const y = listStartY + index * (cardH + COLLECTION_ROW_GAP);
      const bottom = y + cardH;
      const visible = bottom >= viewportY - 24 && y <= viewportY + viewportH + 24;
      card.container.setPosition(x, y);
      card.bg.clear();
      card.bg.fillStyle(entry.unlocked ? 0x203447 : 0x172634, entry.unlocked ? 0.92 : 0.82);
      card.bg.fillRoundedRect(0, 0, cardW, cardH, 12);

      card.thumbFrame.clear();
      card.thumbFrame.fillStyle(0x0f1f2d, 0.95);
      card.thumbFrame.fillRoundedRect(12, 7, 34, 42, 10);
      const thumbBorderColor = this.toBrownThemeColorNumber(
        Phaser.Display.Color.HexStringToColor(entry.rarityColor || "#8ca4ba").color
      );
      card.thumbFrame.lineStyle(1, thumbBorderColor, entry.unlocked ? 0.42 : 0.22);
      card.thumbFrame.strokeRoundedRect(12, 7, 34, 42, 10);

      const thumbTextureKey = this.ensureCollectionThumbTexture(entry);
      if (thumbTextureKey) {
        if (card.thumbImage.texture?.key !== thumbTextureKey) {
          card.thumbImage.setTexture(thumbTextureKey);
        }
        card.thumbImage.setPosition(29, 28);
        card.thumbImage.setDisplaySize(32, 40);
        card.thumbImage.setVisible(true);
        card.thumbGlyph.setVisible(false);
      } else {
        card.thumbImage.setPosition(29, 28);
        card.thumbImage.setDisplaySize(32, 40);
        card.thumbImage.setVisible(false);
        card.thumbGlyph.setVisible(true);
      }

      card.rarity.setText((entry.rarityLabel || "").toUpperCase());
      const ownedText = entry.copies > 0 ? `OWNED ${entry.copies > 99 ? "99+" : entry.copies}` : "NONE";
      card.owned.setText(ownedText);
      const ownedChipW = Phaser.Math.Clamp(Math.round(card.owned.width + 14), 50, 94);
      const rarityChipW = Phaser.Math.Clamp(Math.round(card.rarity.width + 14), 48, 98);
      const badgeGap = 8;
      const badgeTop = 8;
      const rarityChipLeft = cardW - 12 - rarityChipW;
      const ownedChipLeft = rarityChipLeft - badgeGap - ownedChipW;
      const ownedChipX = ownedChipLeft + ownedChipW * 0.5;
      card.ownedChip.clear();
      card.ownedChip.fillStyle(entry.copies > 0 ? 0x3b2d16 : 0x243240, entry.copies > 0 ? 0.96 : 0.78);
      card.ownedChip.fillRoundedRect(ownedChipLeft, badgeTop, ownedChipW, 18, 9);
      card.owned.setPosition(ownedChipX, badgeTop + 9);

      card.rarityChip.clear();
      card.rarityChip.fillStyle(0x123046, entry.unlocked ? 0.88 : 0.58);
      card.rarityChip.fillRoundedRect(rarityChipLeft, badgeTop, rarityChipW, 18, 9);
      card.rarity.setPosition(rarityChipLeft + rarityChipW * 0.5, badgeTop + 9);
      card.rarity.setColor(this.toBrownThemeColorString(entry.unlocked ? (entry.rarityColor || "#b7c9d8") : "#96a7b5"));

      const nameX = 58;
      const nameSpace = Math.max(100, ownedChipLeft - 10 - nameX);
      const rawName = String(entry.name || "LOCKED").replace(/\s+/g, " ").trim();
      const nameCharCap = Math.max(10, Math.floor(nameSpace / 8.6));
      const compactName = rawName.length > nameCharCap ? `${rawName.slice(0, nameCharCap - 1).trimEnd()}…` : rawName;
      card.name.setText(compactName);
      card.name.setPosition(nameX, 17);

      const descW = Math.max(140, cardW - 76);
      const rawDesc = String(entry.description || "").replace(/\s+/g, " ").trim();
      const descCharCap = Math.max(24, Math.floor((descW - 8) / 6.2));
      const compactDesc = rawDesc.length > descCharCap ? `${rawDesc.slice(0, descCharCap - 1).trimEnd()}…` : rawDesc;
      card.desc.setText(compactDesc);
      card.desc.setWordWrapWidth(descW, false);
      card.desc.setPosition(58, 36);
      card.name.setColor(this.toBrownThemeColorString(entry.unlocked ? "#eef6ff" : "#b5c2cf"));
      card.desc.setColor(this.toBrownThemeColorString(entry.unlocked ? "#c6d8e8" : "#96a8b7"));
      card.owned.setColor(this.toBrownThemeColorString(entry.copies > 0 ? "#f4d598" : "#8ea4b8"));
      card.thumbGlyph.setColor(this.toBrownThemeColorString(entry.unlocked ? "#f0f8ff" : "#8ea3b7"));
      card.container.setVisible(visible);
    });

    this.entryCards.forEach((card, id) => {
      const exists = entries.some((entry) => entry.id === id);
      if (!exists) {
        card.container.setVisible(false);
      }
    });

    if (this.collectionListContainer) {
      this.collectionListContainer.setVisible(true);
    }

    const actions = [{ id: "closeCollection", label: "", enabled: true, modalClose: true }];
    this.rebuildButtons(actions);
    const closeButton = this.buttons.get("closeCollection");
    if (closeButton) {
      placeModalCloseButton(closeButton, {
        x: panelX + panelW - 28,
        y: panelY + 26,
        depth: 220,
        width: 42,
        height: 32,
        iconSize: 15,
        enabled: true,
        visible: true,
        styleName: "idle",
        applyStyle: (button, styleName) => this.applyButtonStyle(button, styleName),
      });
    }

    const scrollTrackX = viewportX + viewportW + 4;
    const scrollTrackY = viewportY;
    const scrollTrackH = viewportH;
    this.graphics.fillStyle(0x102233, 0.74);
    this.graphics.fillRoundedRect(scrollTrackX, scrollTrackY, scrollBarW, scrollTrackH, 6);
    if (this.collectionScrollMax > 0) {
      const thumbMin = 40;
      const thumbH = Math.max(thumbMin, Math.round((viewportH / contentH) * viewportH));
      const scrollRatio = this.collectionScrollMax > 0 ? this.collectionScroll / this.collectionScrollMax : 0;
      const thumbY = scrollTrackY + Math.round((scrollTrackH - thumbH) * scrollRatio);
      const thumbX = scrollTrackX + 1;
      const thumbW = scrollBarW - 2;
      this.graphics.fillStyle(0xf2c56d, 0.98);
      this.graphics.fillRoundedRect(thumbX, thumbY, thumbW, thumbH, 6);
    } else {
      this.graphics.fillStyle(0xf2c56d, 0.44);
      this.graphics.fillRoundedRect(scrollTrackX + 1, scrollTrackY + 1, scrollBarW - 2, scrollTrackH - 2, 6);
    }
  }

  renderEndOverlay(snapshot, width, height) {
    if (this.collectionListContainer) {
      this.collectionListContainer.setVisible(false);
    }
    drawModalBackdrop(this.graphics, width, height, { color: 0x000000, alpha: 0.82 });
    const panelW = Math.max(660, Math.min(width - 70, 780));
    const panelH = Math.max(370, Math.min(height - 80, 430));
    const panelX = width * 0.5 - panelW * 0.5;
    const panelY = height * 0.5 - panelH * 0.5;

    this.graphics.fillStyle(0x0e1c2a, 0.95);
    this.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
    this.graphics.lineStyle(2, 0xb2d8f5, 0.25);
    this.graphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    this.drawText("overlay-title", snapshot.title || "", width * 0.5, panelY + 84, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "56px",
      color: "#f6e6a6",
    });
    this.drawText("overlay-subtitle", snapshot.subtitle || "", width * 0.5, panelY + 126, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "22px",
      color: "#c0d9ec",
    });

    const stats = Array.isArray(snapshot.stats) ? snapshot.stats : [];
    stats.slice(0, 6).forEach((line, index) => {
      this.drawText(`overlay-stat-${index}`, line, width * 0.5, panelY + 178 + index * 32, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "20px",
        color: "#dbe9f7",
      });
    });
    this.drawText("overlay-prompt", snapshot.prompt || "", width * 0.5, panelY + panelH - 64, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "23px",
      color: "#f8d37b",
    });

    const actions = [{ id: "restart", label: "NEW RUN", enabled: Boolean(snapshot.canRestart) }];
    this.rebuildButtons(actions);
    const button = this.buttons.get("restart");
    if (!button) {
      return;
    }
    button.container.setPosition(width * 0.5, panelY + panelH - 24);
    setGradientButtonSize(button, Math.min(300, panelW - 120), 52);
    button.text.setFontSize(24);
    button.text.setText("NEW RUN");
    button.enabled = Boolean(snapshot.canRestart);
    this.applyButtonStyle(button, button.enabled ? "idle" : "disabled");
    button.container.setVisible(true);
  }

  rebuildEntryCards(entries) {
    const signature = entries.map((entry) => entry.id).join("|");
    if (signature === this.lastEntrySignature) {
      return;
    }
    this.lastEntrySignature = signature;
    this.entryCards.forEach((card) => card.container.destroy());
    this.entryCards.clear();

    entries.forEach((entry) => {
      const container = this.add.container(0, 0);
      const bg = this.applyBrownThemeToGraphics(this.add.graphics());
      const thumbFrame = this.applyBrownThemeToGraphics(this.add.graphics());
      const thumbImage = this.add.image(29, 28, "__WHITE").setVisible(false);
      thumbImage.setDisplaySize(32, 40);
      thumbImage.setAlpha(0.98);
      const thumbGlyph = this.add
        .text(29, 28, "◆", this.toBrownThemeTextStyle({
          fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
          fontSize: "14px",
          color: "#f0f8ff",
          stroke: "#0d1520",
          strokeThickness: 2,
          fontStyle: "700",
        }))
        .setOrigin(0.5, 0.5);
      const rarity = this.add
        .text(0, 0, "", this.toBrownThemeTextStyle({
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "9px",
          color: "#9aa9b8",
          stroke: "#0b121a",
          strokeThickness: 1,
          fontStyle: "700",
        }))
        .setOrigin(0.5, 0.5);
      const rarityChip = this.applyBrownThemeToGraphics(this.add.graphics());
      const name = this.add
        .text(0, 0, "", this.toBrownThemeTextStyle({
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "14px",
          color: "#ecf4ff",
          stroke: "#0a121a",
          strokeThickness: 1,
        }))
        .setOrigin(0, 0.5)
        .setFontStyle("700");
      const desc = this.add
        .text(0, 0, "", this.toBrownThemeTextStyle({
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "10px",
          color: "#e2f1ff",
          stroke: "#08131d",
          strokeThickness: 1,
          align: "left",
          wordWrap: { width: 260 },
        }))
        .setOrigin(0, 0.5);
      const ownedChip = this.applyBrownThemeToGraphics(this.add.graphics());
      const owned = this.add
        .text(0, 0, "", this.toBrownThemeTextStyle({
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "10px",
          color: "#90a9bf",
          stroke: "#0a121a",
          strokeThickness: 1,
          fontStyle: "700",
        }))
        .setOrigin(0.5, 0.5);

      rarity.setPosition(96, 15);
      name.setPosition(128, 17);
      desc.setPosition(58, 36);
      owned.setPosition(208, 17);
      container.add([bg, thumbFrame, thumbImage, thumbGlyph, rarityChip, rarity, name, desc, ownedChip, owned]);
      if (this.collectionListContainer) {
        this.collectionListContainer.add(container);
      }
      this.entryCards.set(entry.id, { container, bg, thumbFrame, thumbImage, thumbGlyph, rarityChip, rarity, name, desc, ownedChip, owned });
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
      const button = action.modalClose
        ? createModalCloseButton(this, {
            id: action.id,
            styleSet: BUTTON_STYLE,
            onPress: () => this.invokeAction(action.id),
            depth: 220,
            width: 42,
            height: 32,
            iconSize: 15,
          })
        : createGradientButton(this, {
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
