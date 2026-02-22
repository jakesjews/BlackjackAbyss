import Phaser from "phaser";
import { applyBrownThemeToGraphics } from "../ui/brown-theme.js";
import { createTightTextureFromAlpha, resolveGoldIconTexture } from "../ui/texture-processing.js";
import {
  SHOP_CAMP_BACKGROUND_KEY,
  SHOP_CHIPS_ICON_KEY,
  SHOP_CHIPS_ICON_TRIM_KEY,
  SHOP_TOP_ACTION_ICON_KEYS,
  SHOP_TOP_ACTION_ICONS,
  SHOP_BUY_ICON_KEY,
  SHOP_DEAL_ICON_KEY,
  SHOP_MODAL_BASE_DEPTH,
} from "./shop-scene-config.js";
import { bindShopSceneKeyboardInput, bindShopScenePointerInput } from "./shop-scene-input-handlers.js";

function destroyButton(buttonRef) {
  if (buttonRef?.container) {
    buttonRef.container.destroy();
  }
}

function destroyNode(scene, key) {
  const node = scene[key];
  if (node) {
    node.destroy();
    scene[key] = null;
  }
}

export function preloadShopSceneAssets(scene) {
  if (!scene.textures.exists(SHOP_CHIPS_ICON_KEY)) {
    scene.load.image(SHOP_CHIPS_ICON_KEY, "/images/icons/chips.png");
  }
  Object.entries(SHOP_TOP_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, SHOP_TOP_ACTION_ICONS[actionId] || "/images/icons/home.png");
    }
  });
  if (!scene.textures.exists(SHOP_BUY_ICON_KEY)) {
    scene.load.image(SHOP_BUY_ICON_KEY, "/images/icons/buy.png");
  }
  if (!scene.textures.exists(SHOP_DEAL_ICON_KEY)) {
    scene.load.image(SHOP_DEAL_ICON_KEY, "/images/icons/deal.png");
  }
  if (!scene.textures.exists(SHOP_CAMP_BACKGROUND_KEY)) {
    scene.load.image(SHOP_CAMP_BACKGROUND_KEY, "/images/scenes/camp.png");
  }
}

export function initializeShopSceneLifecycle(scene, theme) {
  scene.cameras.main.setBackgroundColor("#171006");
  scene.cameras.main.setAlpha(1);

  scene.graphics = scene.add.graphics();
  applyBrownThemeToGraphics(scene.graphics, theme);

  scene.campBackground = scene.textures.exists(SHOP_CAMP_BACKGROUND_KEY)
    ? scene.add.image(0, 0, SHOP_CAMP_BACKGROUND_KEY).setOrigin(0.5, 0.5).setDepth(-10).setVisible(false)
    : null;

  scene.overlayGraphics = scene.add.graphics().setDepth(SHOP_MODAL_BASE_DEPTH);
  applyBrownThemeToGraphics(scene.overlayGraphics, theme);

  scene.modalBlocker = scene.add
    .zone(0, 0, 1, 1)
    .setOrigin(0, 0)
    .setDepth(SHOP_MODAL_BASE_DEPTH + 1)
    .setVisible(false)
    .setInteractive({ useHandCursor: false });
  scene.modalBlocker.on("pointerdown", () => {});

  const chipsTextureKey = resolveGoldIconTexture(
    scene,
    createTightTextureFromAlpha(scene, {
      sourceKey: SHOP_CHIPS_ICON_KEY,
      outputKey: SHOP_CHIPS_ICON_TRIM_KEY,
    })
  );
  scene.chipsIcon = scene.add.image(0, 0, chipsTextureKey).setVisible(false);
  scene.chipsIcon.setDisplaySize(20, 20);

  scene.shopOpen = false;
  scene.bottomBarRect = null;
  scene.visitSignature = "";
  scene.shopListMaskShape = scene.make.graphics({ x: 0, y: 0, add: false });
  scene.shopListMask = scene.shopListMaskShape.createGeometryMask();

  bindShopSceneKeyboardInput(scene);
  bindShopScenePointerInput(scene);
  scene.scale.on("resize", scene.onResize, scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.teardown());
}

export function teardownShopSceneLifecycle(scene) {
  scene.scale.off("resize", scene.onResize, scene);

  scene.keyboardHandlers.forEach(({ eventName, handler }) => {
    scene.input.keyboard?.off(eventName, handler);
  });
  scene.keyboardHandlers = [];

  scene.cards.forEach((card) => card.container.destroy());
  scene.cards.clear();
  scene.buttons.forEach((button) => button.container.destroy());
  scene.buttons.clear();
  scene.topButtons.forEach((button) => button.container.destroy());
  scene.topButtons.clear();

  destroyButton(scene.logsCloseButton);
  scene.logsCloseButton = null;
  destroyButton(scene.shopCloseButton);
  scene.shopCloseButton = null;

  destroyNode(scene, "chipsIcon");
  destroyNode(scene, "campBackground");
  destroyNode(scene, "modalBlocker");
  destroyNode(scene, "overlayGraphics");

  scene.textNodes.forEach((text) => text.destroy());
  scene.textNodes.clear();

  scene.lastCardSignature = "";
  scene.visitSignature = "";
  scene.shopOpen = false;
  scene.shopDialogueIndex = -1;
  scene.shopDialogueText = "";
  scene.bottomBarRect = null;
  scene.logsModalOpen = false;
  scene.darkIconTextureBySource.clear();

  scene.pointerHandlers.forEach(({ eventName, handler }) => {
    scene.input.off(eventName, handler);
  });
  scene.pointerHandlers = [];

  scene.hoveredCardIndex = null;
  scene.focusedCardIndex = 0;
  scene.logsScrollIndex = 0;
  scene.logsScrollMax = 0;
  scene.logsLastCount = 0;
  scene.logsPinnedToBottom = true;
  scene.logsViewport = null;

  if (scene.shopListMaskShape) {
    scene.shopListMaskShape.destroy();
    scene.shopListMaskShape = null;
    scene.shopListMask = null;
  }
}
