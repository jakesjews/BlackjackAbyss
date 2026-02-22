import Phaser from "phaser";
import { applyBrownThemeToGraphics } from "../ui/brown-theme.js";
import { createTightTextureFromAlpha, resolveGoldIconTexture } from "../ui/texture-processing.js";
import {
  REWARD_CHIPS_ICON_KEY,
  REWARD_CHIPS_ICON_TRIM_KEY,
  REWARD_MODAL_BASE_DEPTH,
  REWARD_TOP_ACTION_ICON_KEYS,
  REWARD_TOP_ACTION_ICONS,
} from "./reward-scene-config.js";

function bindRewardSceneKeyboardInput(scene) {
  if (!scene.input.keyboard) {
    return;
  }
  const bind = (eventName, handler) => {
    scene.input.keyboard.on(eventName, handler);
    scene.keyboardHandlers.push({ eventName, handler });
  };
  bind("keydown-LEFT", () => scene.invokeAction("prev"));
  bind("keydown-RIGHT", () => scene.invokeAction("next"));
  bind("keydown-ENTER", () => scene.invokeAction("claim"));
  bind("keydown-SPACE", (event) => {
    event.preventDefault();
    scene.invokeAction("claim");
  });
}

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

export function preloadRewardSceneAssets(scene) {
  if (!scene.textures.exists(REWARD_CHIPS_ICON_KEY)) {
    scene.load.image(REWARD_CHIPS_ICON_KEY, "/images/icons/chips.png");
  }
  Object.entries(REWARD_TOP_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, REWARD_TOP_ACTION_ICONS[actionId] || "/images/icons/home.png");
    }
  });
}

export function initializeRewardSceneLifecycle(scene, theme) {
  scene.cameras.main.setBackgroundColor("#171006");
  scene.cameras.main.setAlpha(1);

  scene.graphics = scene.add.graphics();
  applyBrownThemeToGraphics(scene.graphics, theme);

  scene.overlayGraphics = scene.add.graphics().setDepth(REWARD_MODAL_BASE_DEPTH);
  applyBrownThemeToGraphics(scene.overlayGraphics, theme);

  scene.modalBlocker = scene.add
    .zone(0, 0, 1, 1)
    .setOrigin(0, 0)
    .setDepth(REWARD_MODAL_BASE_DEPTH + 1)
    .setVisible(false)
    .setInteractive({ useHandCursor: false });
  scene.modalBlocker.on("pointerdown", () => {});

  const chipsTextureKey = resolveGoldIconTexture(
    scene,
    createTightTextureFromAlpha(scene, {
      sourceKey: REWARD_CHIPS_ICON_KEY,
      outputKey: REWARD_CHIPS_ICON_TRIM_KEY,
    })
  );
  scene.chipsIcon = scene.add.image(0, 0, chipsTextureKey).setVisible(false);
  scene.chipsIcon.setDisplaySize(20, 20);

  bindRewardSceneKeyboardInput(scene);
  scene.scale.on("resize", scene.onResize, scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.teardown());
}

export function teardownRewardSceneLifecycle(scene) {
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

  destroyNode(scene, "modalBlocker");
  destroyNode(scene, "chipsIcon");

  scene.darkIconTextureBySource.clear();

  destroyNode(scene, "overlayGraphics");

  scene.textNodes.forEach((text) => text.destroy());
  scene.textNodes.clear();

  scene.lastSignature = "";
  scene.logsModalOpen = false;
}
