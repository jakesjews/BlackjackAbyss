import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { toBrownThemeTextStyle } from "./ui/brown-theme.js";
import { tickRuntime } from "./runtime-access.js";
import { OVERLAY_BROWN_THEME } from "./overlay/overlay-scene-config.js";
import {
  getOverlaySnapshot,
  initializeOverlaySceneLifecycle,
  invokeOverlayAction,
  teardownOverlaySceneLifecycle,
} from "./overlay/overlay-scene-lifecycle.js";
import { renderOverlaySceneSnapshot } from "./overlay/overlay-scene-renderers.js";

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
    initializeOverlaySceneLifecycle(this, OVERLAY_BROWN_THEME);
  }

  teardown() {
    teardownOverlaySceneLifecycle(this);
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

  getSnapshot() {
    return getOverlaySnapshot(this);
  }

  invokeAction(actionName, value = undefined) {
    invokeOverlayAction(this, actionName, value);
  }

  renderSnapshot(snapshot) {
    renderOverlaySceneSnapshot(this, snapshot);
  }

  hideAllText() {
    this.textNodes.forEach((text) => text.setVisible(false));
  }

  drawText(key, value, x, y, style, origin = { x: 0.5, y: 0.5 }) {
    const themedStyle = toBrownThemeTextStyle(style, OVERLAY_BROWN_THEME);
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
