import Phaser from "phaser";
import { applyGradientButtonStyle } from "../ui/gradient-button.js";
import {
  getMenuActions as getMenuActionsFromRuntime,
  isCoarsePointer as isCoarsePointerFromRuntime,
  isVisualFxDisabled as isVisualFxDisabledFromRuntime,
} from "../runtime-access.js";
import { MENU_SPLASH_BUNDLED_URL, MENU_SPLASH_KEY, MENU_SPLASH_KEY_ALT } from "./menu-scene-config.js";
import { buildMenuSceneUi, playMenuSceneIntroAnimation, resizeMenuSceneLayout } from "./menu-scene-layout-renderers.js";

function bindMenuSceneKeyboardInput(scene) {
  if (!scene.input.keyboard) {
    return;
  }
  const bind = (eventName, handler) => {
    scene.input.keyboard.on(eventName, handler);
    scene.keyboardHandlers.push({ eventName, handler });
  };

  bind("keydown-ENTER", () => runMenuSceneAction(scene, "startRun"));
  bind("keydown-R", () => runMenuSceneAction(scene, "resumeRun"));
  bind("keydown-A", () => runMenuSceneAction(scene, "openCollection"));
}

function setMenuSceneButtonEnabled(button, enabled) {
  if (!button) {
    return;
  }
  const active = Boolean(enabled);
  button.enabled = active;
  button.container.setAlpha(active ? 1 : 0.7);
  applyGradientButtonStyle(button, active ? "idle" : "disabled");
}

export function preloadMenuSceneAssets(scene) {
  if (!scene.textures.exists(MENU_SPLASH_KEY)) {
    scene.load.image(MENU_SPLASH_KEY, MENU_SPLASH_BUNDLED_URL);
  }
  if (!scene.textures.exists(MENU_SPLASH_KEY_ALT)) {
    scene.load.image(MENU_SPLASH_KEY_ALT, "/images/splash_art.png");
  }
}

export function initializeMenuSceneLifecycle(scene) {
  scene.cameras.main.setBackgroundColor("#081420");
  scene.cameras.main.setAlpha(1);
  scene.disableVisualFx = isVisualFxDisabledFromRuntime(scene);

  buildMenuSceneUi(scene);
  bindMenuSceneKeyboardInput(scene);
  resizeMenuSceneLayout(scene, scene.scale.gameSize);
  refreshMenuSceneResumeAvailability(scene);

  scene.actionsPollEvent = scene.time.addEvent({
    delay: 250,
    loop: true,
    callback: () => refreshMenuSceneResumeAvailability(scene),
  });

  scene.scale.on("resize", scene.onResize, scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.teardown());
}

export function teardownMenuSceneLifecycle(scene) {
  scene.scale.off("resize", scene.onResize, scene);

  scene.keyboardHandlers.forEach(({ eventName, handler }) => {
    scene.input.keyboard?.off(eventName, handler);
  });
  scene.keyboardHandlers = [];

  if (scene.actionsPollEvent) {
    scene.actionsPollEvent.remove(false);
    scene.actionsPollEvent = null;
  }

  if (Array.isArray(scene.introTweens) && scene.introTweens.length > 0) {
    scene.introTweens.forEach((tween) => tween?.stop?.());
    scene.introTweens = [];
  }

  if (Array.isArray(scene.emberSprites) && scene.emberSprites.length > 0) {
    scene.emberSprites.forEach((ember) => ember?.destroy?.());
    scene.emberSprites = [];
  }

  if (scene.frameMaskShape) {
    scene.frameMaskShape.destroy();
    scene.frameMaskShape = null;
    scene.frameMask = null;
  }

  scene.menuColumnContainer = null;
  scene.menuFrameRect = null;
}

export function refreshMenuSceneResumeAvailability(scene) {
  const actions = getMenuActionsFromRuntime(scene);
  const hasSavedRun = actions && typeof actions.hasSavedRun === "function" ? Boolean(actions.hasSavedRun()) : false;
  setMenuSceneButtonEnabled(scene.menuButtons?.resume, hasSavedRun);
}

export function runMenuSceneAction(scene, actionName) {
  const actions = getMenuActionsFromRuntime(scene);
  const action = actions ? actions[actionName] : null;
  if (typeof action !== "function") {
    return;
  }
  action();
}

export function shouldUseFullscreenMobileMenu(scene, width = scene.scale.gameSize.width) {
  const viewportWidth = Number(width) || 0;
  const coarsePointer = isCoarsePointerFromRuntime(scene);
  return coarsePointer || viewportWidth <= 980;
}

export { playMenuSceneIntroAnimation, resizeMenuSceneLayout };
