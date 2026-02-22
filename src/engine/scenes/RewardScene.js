import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { toBrownThemeTextStyle } from "./ui/brown-theme.js";
import { getRewardApi as getRewardApiFromRuntime, tickRuntime } from "./runtime-access.js";
import { REWARD_BROWN_THEME } from "./reward/reward-scene-config.js";
import {
  initializeRewardSceneLifecycle,
  preloadRewardSceneAssets,
  teardownRewardSceneLifecycle,
} from "./reward/reward-scene-lifecycle.js";
import {
  drawRewardSceneBackground,
  drawRewardSceneHeader,
  syncRewardSceneModalBlocker,
} from "./reward/reward-scene-layout-renderers.js";
import { rebuildRewardSceneButtons, renderRewardSceneTopActions } from "./reward/reward-scene-action-renderers.js";
import { rebuildRewardSceneCards, renderRewardSceneCards } from "./reward/reward-scene-card-renderers.js";
import { drawRewardSceneLogsModal } from "./reward/reward-scene-modal-renderers.js";

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
    preloadRewardSceneAssets(this);
  }

  create() {
    initializeRewardSceneLifecycle(this, REWARD_BROWN_THEME);
  }

  teardown() {
    teardownRewardSceneLifecycle(this);
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

  getSnapshot() {
    const api = getRewardApiFromRuntime(this);
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
    const api = getRewardApiFromRuntime(this);
    const action = api ? api[actionName] : null;
    if (typeof action === "function") {
      action(value);
    }
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
      rebuildRewardSceneCards(this, []);
      rebuildRewardSceneButtons(this, []);
      this.topButtons.forEach((button) => button.container.setVisible(false));
      this.logsModalOpen = false;
      if (this.logsCloseButton) {
        this.logsCloseButton.container.setVisible(false);
      }
      syncRewardSceneModalBlocker(this, width, height);
      return;
    }

    drawRewardSceneBackground(this, width, height);
    drawRewardSceneHeader(this, snapshot, width);
    renderRewardSceneCards(this, { snapshot, width, height });
    rebuildRewardSceneButtons(this, []);
    renderRewardSceneTopActions(this, { width });
    drawRewardSceneLogsModal(this, { snapshot, width, height });
    syncRewardSceneModalBlocker(this, width, height);
  }

  hideAllText() {
    this.textNodes.forEach((text) => text.setVisible(false));
  }

  drawText(key, value, x, y, style, origin = { x: 0.5, y: 0.5 }) {
    const themedStyle = toBrownThemeTextStyle(style, REWARD_BROWN_THEME);
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
