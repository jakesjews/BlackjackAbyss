import Phaser from "phaser";
import { applyBrownThemeToGraphics } from "../ui/brown-theme.js";
import {
  createTightTextureFromAlpha,
  resolveGoldIconTexture,
  resolveWatermarkTexture,
} from "../ui/texture-processing.js";
import { isVisualFxDisabled } from "../runtime-access.js";
import {
  RUN_CHIPS_ICON_KEY,
  RUN_CHIPS_ICON_TRIM_KEY,
  RUN_FIRE_CORE_PARTICLE_KEY,
  RUN_FIRE_GLOW_PARTICLE_KEY,
  RUN_MODAL_BASE_DEPTH,
  RUN_PARTICLE_KEY,
  RUN_PLAYER_AVATAR_KEY,
  RUN_WATERMARK_ALPHA,
  RUN_WATERMARK_KEY,
  RUN_WATERMARK_RENDER_KEY,
} from "./run-scene-config.js";
import { bindRunSceneKeyboardInput, bindRunScenePointerInput } from "./run-scene-input-handlers.js";
import { ensureRunSceneCardShadowTexture, ensureRunSceneParticleTextures } from "./run-scene-texture-seeding.js";

function initializeRunSceneWatermark(scene) {
  if (!scene.textures.exists(RUN_WATERMARK_KEY)) {
    return;
  }
  const watermarkTexture = resolveWatermarkTexture(scene, {
    sourceKey: RUN_WATERMARK_KEY,
    outputKey: RUN_WATERMARK_RENDER_KEY,
    alphaScale: RUN_WATERMARK_ALPHA,
  });
  scene.watermarkBackground = scene.add
    .image(
      scene.scale.gameSize.width * 0.5,
      scene.scale.gameSize.height * 0.5,
      watermarkTexture || RUN_WATERMARK_KEY
    )
    .setVisible(false)
    .setAlpha(1)
    .setBlendMode(Phaser.BlendModes.NORMAL)
    .setDepth(3);
  scene.watermarkMaskShape = scene.make.graphics({ x: 0, y: 0, add: false });
  scene.watermarkMask = scene.watermarkMaskShape.createGeometryMask();
  scene.watermarkBackground.setMask(scene.watermarkMask);
}

function initializeRunSceneHudChipsIcon(scene) {
  const chipsIconKey = resolveGoldIconTexture(
    scene,
    createTightTextureFromAlpha(scene, {
      sourceKey: RUN_CHIPS_ICON_KEY,
      outputKey: RUN_CHIPS_ICON_TRIM_KEY,
    })
  );
  scene.hudChipsIcon = scene.add.image(0, 0, chipsIconKey).setVisible(false).setDepth(26);
}

function initializeRunSceneModalBlocker(scene) {
  scene.modalBlocker = scene.add
    .zone(0, 0, 1, 1)
    .setOrigin(0, 0)
    .setDepth(RUN_MODAL_BASE_DEPTH + 1)
    .setVisible(false)
    .setInteractive({ useHandCursor: false });
  scene.modalBlocker.on("pointerdown", () => {});
}

function initializeRunScenePortraits(scene, theme) {
  scene.enemyPortrait = scene.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(16);
  scene.enemyPortraitMaskShape = applyBrownThemeToGraphics(scene.make.graphics({ x: 0, y: 0, add: false }), theme);
  scene.enemyPortraitMask = scene.enemyPortraitMaskShape.createGeometryMask();
  scene.enemyPortrait.setMask(scene.enemyPortraitMask);

  scene.playerPortrait = scene.add
    .image(0, 0, scene.textures.exists(RUN_PLAYER_AVATAR_KEY) ? RUN_PLAYER_AVATAR_KEY : RUN_PARTICLE_KEY)
    .setVisible(false)
    .setAlpha(0.75)
    .setDepth(16);
  scene.playerPortraitMaskShape = applyBrownThemeToGraphics(scene.make.graphics({ x: 0, y: 0, add: false }), theme);
  scene.playerPortraitMask = scene.playerPortraitMaskShape.createGeometryMask();
  scene.playerPortrait.setMask(scene.playerPortraitMask);

  scene.introPortrait = scene.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(116);
  scene.introPortraitMaskShape = applyBrownThemeToGraphics(scene.make.graphics({ x: 0, y: 0, add: false }), theme);
  scene.introPortraitMask = scene.introPortraitMaskShape.createGeometryMask();
  scene.introPortrait.setMask(scene.introPortraitMask);
}

function initializeRunSceneEffectEmitters(scene) {
  scene.resultEmitter = scene.add
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
  scene.resultEmitter.stop();

  scene.fireTrailEmitter = scene.add
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
  scene.fireTrailEmitter.stop();

  scene.fireImpactEmitter = scene.add
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
  scene.fireImpactEmitter.stop();

  scene.enemyDefeatEmitter = scene.add
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
  scene.enemyDefeatEmitter.stop();
}

export function initializeRunSceneLifecycle(scene, theme) {
  scene.cameras.main.setBackgroundColor("#171006");
  scene.cameras.main.setAlpha(1);
  scene.disableVisualFx = isVisualFxDisabled(scene);

  scene.graphics = applyBrownThemeToGraphics(scene.add.graphics(), theme);
  scene.overlayGraphics = applyBrownThemeToGraphics(scene.add.graphics().setDepth(RUN_MODAL_BASE_DEPTH), theme);

  initializeRunSceneWatermark(scene);
  initializeRunSceneHudChipsIcon(scene);
  initializeRunSceneModalBlocker(scene);

  ensureRunSceneParticleTextures(scene);
  ensureRunSceneCardShadowTexture(scene);
  initializeRunScenePortraits(scene, theme);
  initializeRunSceneEffectEmitters(scene);

  bindRunSceneKeyboardInput(scene);
  bindRunScenePointerInput(scene);
  scene.scale.on("resize", scene.onResize, scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.teardown());
}

function destroyButton(buttonRef) {
  if (buttonRef?.container) {
    buttonRef.container.destroy();
  }
}

function destroyDisplayObject(scene, key) {
  const node = scene[key];
  if (node) {
    node.destroy();
    scene[key] = null;
  }
}

function destroyMaskedPortrait(scene, imageKey, maskShapeKey, maskKey) {
  destroyDisplayObject(scene, imageKey);
  const maskShape = scene[maskShapeKey];
  if (maskShape) {
    maskShape.destroy();
  }
  scene[maskShapeKey] = null;
  scene[maskKey] = null;
}

export function teardownRunSceneLifecycle(scene) {
  scene.scale.off("resize", scene.onResize, scene);

  scene.keyboardHandlers.forEach(({ eventName, handler }) => {
    scene.input.keyboard?.off(eventName, handler);
  });
  scene.keyboardHandlers = [];

  scene.pointerHandlers.forEach(({ eventName, handler }) => {
    scene.input.off(eventName, handler);
  });
  scene.pointerHandlers = [];

  scene.buttons.forEach((button) => button.container.destroy());
  scene.buttons.clear();
  scene.buttonSignature = "";

  scene.textNodes.forEach((node) => node.destroy());
  scene.textNodes.clear();
  scene.cardTextNodes.forEach((node) => node.destroy());
  scene.cardTextNodes.clear();

  scene.cardNodes.forEach((node) => {
    if (node.backMaskShape) {
      node.backMaskShape.destroy();
      node.backMaskShape = null;
      node.backMask = null;
    }
    node.container.destroy();
  });
  scene.cardNodes.clear();
  scene.cardAnimStates.clear();
  scene.cardAnimSeen.clear();
  scene.cardFlipStates.clear();
  scene.cardHiddenStateBySlot.clear();
  scene.rowCardCountByPrefix.clear();
  scene.nextGlobalDealStartAt = 0;
  scene.cardDealSequenceId = 0;
  scene.lastOpeningDealSignature = "";
  scene.lastHandRenderSignature = "";
  scene.handOpeningDealPending = false;
  scene.prevCanDeal = false;

  scene.topButtons.forEach((button) => button.container.destroy());
  scene.topButtons.clear();

  destroyButton(scene.relicButton);
  scene.relicButton = null;
  destroyButton(scene.logsCloseButton);
  scene.logsCloseButton = null;
  destroyButton(scene.relicCloseButton);
  scene.relicCloseButton = null;
  destroyButton(scene.introCtaButton);
  scene.introCtaButton = null;

  destroyDisplayObject(scene, "modalBlocker");
  scene.logsModalOpen = false;
  scene.relicModalOpen = false;
  scene.modalOpenOrder = [];

  destroyDisplayObject(scene, "overlayGraphics");
  destroyDisplayObject(scene, "hudChipsIcon");
  destroyDisplayObject(scene, "watermarkBackground");
  if (scene.watermarkMaskShape) {
    scene.watermarkMaskShape.destroy();
    scene.watermarkMaskShape = null;
    scene.watermarkMask = null;
  }

  destroyDisplayObject(scene, "fireTrailEmitter");
  destroyDisplayObject(scene, "fireImpactEmitter");
  destroyDisplayObject(scene, "enemyDefeatEmitter");

  scene.enemyDefeatSignature = "";
  scene.enemyDefeatBurstStep = -1;
  scene.enemyDefeatLastPulseAt = 0;
  scene.lastHpState = null;
  scene.darkIconTextureBySource.clear();

  destroyMaskedPortrait(scene, "enemyPortrait", "enemyPortraitMaskShape", "enemyPortraitMask");
  destroyMaskedPortrait(scene, "playerPortrait", "playerPortraitMaskShape", "playerPortraitMask");
  destroyMaskedPortrait(scene, "introPortrait", "introPortraitMaskShape", "introPortraitMask");

  scene.introButtonLayout = null;
  destroyDisplayObject(scene, "resultEmitter");

  scene.logsScrollIndex = 0;
  scene.logsScrollMax = 0;
  scene.logsLastCount = 0;
  scene.logsPinnedToBottom = true;
  scene.logsViewport = null;
  scene.topActionTooltip = null;

  scene.buttonEnabledState.clear();
  scene.buttonPulseTweens.forEach((tween) => tween?.stop?.());
  scene.buttonPulseTweens.clear();
  scene.activeResolutionAnimations = 0;
}
