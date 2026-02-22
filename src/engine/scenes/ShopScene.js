import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { toBrownThemeTextStyle } from "./ui/brown-theme.js";
import {
  getShopApi as getShopApiFromRuntime,
  isCoarsePointer as isCoarsePointerFromRuntime,
  tickRuntime,
} from "./runtime-access.js";
import { SHOP_BROWN_THEME, SHOPKEEPER_DIALOGUE_VARIANTS } from "./shop/shop-scene-config.js";
import {
  initializeShopSceneLifecycle,
  preloadShopSceneAssets,
  teardownShopSceneLifecycle,
} from "./shop/shop-scene-lifecycle.js";
import {
  drawShopSceneBackground,
  drawShopSceneHeader,
  syncShopSceneModalBlocker,
} from "./shop/shop-scene-layout-renderers.js";
import {
  rebuildShopSceneButtons,
  renderShopSceneButtons,
  renderShopSceneTopActions,
} from "./shop/shop-scene-action-renderers.js";
import {
  rebuildShopSceneCards,
  renderShopSceneCards,
} from "./shop/shop-scene-card-renderers.js";
import { drawShopSceneLogsModal } from "./shop/shop-scene-modal-renderers.js";

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
    preloadShopSceneAssets(this);
  }

  create() {
    initializeShopSceneLifecycle(this, SHOP_BROWN_THEME);
  }

  teardown() {
    teardownShopSceneLifecycle(this);
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

  isCompactLayout(width) {
    return width < 760;
  }

  shouldShowKeyboardHints(width) {
    const viewportWidth = Number(width) || 0;
    const coarsePointer = isCoarsePointerFromRuntime(this);
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

  getSnapshot() {
    const api = getShopApiFromRuntime(this);
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
    const api = getShopApiFromRuntime(this);
    const action = api ? api[actionName] : null;
    if (typeof action === "function") {
      action(value);
    }
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
      rebuildShopSceneCards(this, []);
      rebuildShopSceneButtons(this, []);
      this.logsViewport = null;
      this.topButtons.forEach((button) => button.container.setVisible(false));
      this.logsModalOpen = false;
      if (this.logsCloseButton) {
        this.logsCloseButton.container.setVisible(false);
      }
      if (this.shopCloseButton) {
        this.shopCloseButton.container.setVisible(false);
      }
      syncShopSceneModalBlocker(this, width, height);
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

    drawShopSceneBackground(this, width, height);
    drawShopSceneHeader(this, snapshot, width);
    this.focusedCardIndex = this.resolveSelectedIndex(snapshot, false);
    renderShopSceneCards(this, { snapshot, width, height });
    renderShopSceneButtons(this, { width, height });
    renderShopSceneTopActions(this, { width });
    drawShopSceneLogsModal(this, { snapshot, width, height });
    syncShopSceneModalBlocker(this, width, height);
  }

  hideAllText() {
    this.textNodes.forEach((text) => text.setVisible(false));
  }

  drawText(key, value, x, y, style, origin = { x: 0.5, y: 0.5 }) {
    const themedStyle = toBrownThemeTextStyle(style, SHOP_BROWN_THEME);
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
