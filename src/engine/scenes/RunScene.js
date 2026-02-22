import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle } from "./ui/gradient-button.js";
import {
  createBrownTheme,
  toBrownThemeTextStyle,
} from "./ui/brown-theme.js";
import {
  closeRunSceneModals,
  getRunSceneModalOpenOrder,
  syncRunSceneModalBlocker,
} from "./run/run-scene-modals.js";
import { drawRunSceneLogsModal, drawRunSceneRelicsModal } from "./run/run-scene-modal-renderers.js";
import { drawRunSceneCards } from "./run/run-scene-card-renderers.js";
import { drawRunSceneMessages } from "./run/run-scene-message-renderers.js";
import { drawRunSceneEncounterPanels } from "./run/run-scene-encounter-renderers.js";
import { preloadRunSceneAssets } from "./run/run-scene-asset-preload.js";
import {
  getRunSceneTransitionState,
  processRunSceneHpImpacts,
  renderRunSceneEnemyDefeatEffect,
  tryStartRunSceneQueuedEnemyDefeatTransition,
} from "./run/run-scene-resolution-renderers.js";
import {
  drawRunSceneBackground,
  drawRunSceneHud,
  getRunSceneLayout,
} from "./run/run-scene-layout-renderers.js";
import {
  rebuildRunSceneButtons,
  renderRunSceneRelicButton,
  renderRunSceneButtons,
  renderRunSceneTopActions,
} from "./run/run-scene-action-renderers.js";
import { resolveDarkIconTexture } from "./ui/texture-processing.js";
import {
  getRunApi as getRunApiFromRuntime,
  isCoarsePointer as isCoarsePointerFromRuntime,
  tickRuntime,
} from "./runtime-access.js";
import {
  RUN_DEALER_CARD_ENTRY_MS,
  RUN_DEALER_CARD_FLIP_MS,
  RUN_THEME_BLUE_HUE_MAX,
  RUN_THEME_BLUE_HUE_MIN,
  RUN_THEME_BROWN_HUE,
  RUN_THEME_SATURATION_FLOOR,
  RUN_THEME_SATURATION_SCALE,
} from "./run/run-scene-config.js";
import { initializeRunSceneLifecycle, teardownRunSceneLifecycle } from "./run/run-scene-lifecycle.js";
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
    preloadRunSceneAssets(this);
  }

  create() {
    initializeRunSceneLifecycle(this, RUN_BROWN_THEME);
  }

  teardown() {
    teardownRunSceneLifecycle(this);
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

  renderSnapshot(snapshot) {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const runLayout = getRunSceneLayout(this, width, height);
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

    drawRunSceneBackground(this, width, height, runLayout);
    drawRunSceneHud(this, snapshot, width, runLayout);
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
    const transitionState = getRunSceneTransitionState(snapshot);
    const layout = drawRunSceneEncounterPanels(this, {
      snapshot,
      width,
      height,
      runLayout,
      transitionState,
    });
    renderRunSceneEnemyDefeatEffect(this, transitionState, layout);
    renderRunSceneRelicButton(this, {
      snapshot,
      layout,
      runLayout,
      applyButtonStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
    });
    const cardRenderState = drawRunSceneCards(this, {
      snapshot,
      width,
      height,
      layout,
      theme: RUN_BROWN_THEME,
    });
    const deferResolutionUi = Boolean(cardRenderState?.deferResolutionUi);
    processRunSceneHpImpacts(this, {
      snapshot,
      layout,
      width,
      height,
      deferResolutionUi,
    });
    drawRunSceneMessages(this, {
      snapshot,
      width,
      height,
      layout,
      deferResolutionUi,
      styleSet: BUTTON_STYLES,
      applyButtonStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
    });
    tryStartRunSceneQueuedEnemyDefeatTransition(this, snapshot, { deferResolutionUi });
    renderRunSceneButtons(this, {
      snapshot,
      width,
      height,
      runLayout,
      deferResolutionUi,
      styleSet: BUTTON_STYLES,
      applyButtonStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
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
      applyButtonStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
    });
    drawRunSceneRelicsModal(this, {
      snapshot,
      width,
      height,
      runLayout,
      layerIndex: topModalId === "relics" ? 0 : -1,
      styleSet: BUTTON_STYLES,
      applyButtonStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
    });
    syncRunSceneModalBlocker(this, width, height);
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
