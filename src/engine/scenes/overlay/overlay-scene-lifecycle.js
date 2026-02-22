import Phaser from "phaser";
import { applyBrownThemeToGraphics } from "../ui/brown-theme.js";
import { getOverlayApi as getOverlayApiFromRuntime } from "../runtime-access.js";

function pointInRect(x, y, rect) {
  if (!rect) {
    return false;
  }
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function bindOverlaySceneKeyboardInput(scene) {
  if (!scene.input.keyboard) {
    return;
  }
  const bind = (eventName, handler) => {
    scene.input.keyboard.on(eventName, handler);
    scene.keyboardHandlers.push({ eventName, handler });
  };

  bind("keydown-LEFT", () => {
    if (scene.currentMode === "collection") {
      scrollOverlayCollectionBy(scene, -180);
    }
  });
  bind("keydown-RIGHT", () => {
    if (scene.currentMode === "collection") {
      scrollOverlayCollectionBy(scene, 180);
    }
  });
  bind("keydown-UP", () => {
    if (scene.currentMode === "collection") {
      scrollOverlayCollectionBy(scene, -150);
    }
  });
  bind("keydown-DOWN", () => {
    if (scene.currentMode === "collection") {
      scrollOverlayCollectionBy(scene, 150);
    }
  });
  bind("keydown-PAGEUP", () => {
    if (scene.currentMode === "collection") {
      scrollOverlayCollectionBy(scene, -360);
    }
  });
  bind("keydown-PAGEDOWN", () => {
    if (scene.currentMode === "collection") {
      scrollOverlayCollectionBy(scene, 360);
    }
  });
  bind("keydown-ENTER", (event) => {
    event.preventDefault();
    invokeOverlayAction(scene, "confirm");
  });
  bind("keydown-SPACE", (event) => {
    event.preventDefault();
    invokeOverlayAction(scene, "confirm");
  });
  bind("keydown-ESC", () => {
    if (scene.currentMode === "collection") {
      invokeOverlayAction(scene, "backToMenu");
    }
  });
  bind("keydown-A", () => {
    if (scene.currentMode === "collection") {
      invokeOverlayAction(scene, "backToMenu");
    }
  });
  bind("keydown-R", () => {
    if (scene.currentMode === "collection") {
      invokeOverlayAction(scene, "backToMenu");
    }
  });
}

function bindOverlayScenePointerInput(scene) {
  const bind = (eventName, handler) => {
    scene.input.on(eventName, handler);
    scene.pointerHandlers.push({ eventName, handler });
  };

  bind("wheel", (pointer, gameObjects, deltaX, deltaY) => {
    if (scene.currentMode !== "collection" || !scene.collectionViewport) {
      return;
    }
    if (!pointInRect(pointer.worldX, pointer.worldY, scene.collectionViewport)) {
      return;
    }
    scrollOverlayCollectionBy(scene, deltaY * 0.84);
  });

  bind("pointerdown", (pointer) => {
    if (scene.currentMode !== "collection" || !scene.collectionViewport) {
      return;
    }
    if (!pointInRect(pointer.worldX, pointer.worldY, scene.collectionViewport)) {
      return;
    }
    scene.collectionDragPointerId = pointer.id;
    scene.collectionDragStartY = pointer.worldY;
    scene.collectionDragStartScroll = scene.collectionScrollTarget;
  });

  bind("pointermove", (pointer) => {
    if (scene.currentMode !== "collection") {
      return;
    }
    if (scene.collectionDragPointerId == null || pointer.id !== scene.collectionDragPointerId) {
      return;
    }
    const delta = scene.collectionDragStartY - pointer.worldY;
    setOverlayCollectionScroll(scene, scene.collectionDragStartScroll + delta);
    scene.collectionScroll = scene.collectionScrollTarget;
  });

  bind("pointerup", (pointer) => {
    if (pointer.id === scene.collectionDragPointerId) {
      scene.collectionDragPointerId = null;
    }
  });
  bind("pointerupoutside", (pointer) => {
    if (pointer.id === scene.collectionDragPointerId) {
      scene.collectionDragPointerId = null;
    }
  });
}

export function initializeOverlaySceneLifecycle(scene, theme) {
  scene.cameras.main.setBackgroundColor("#171006");
  scene.cameras.main.setAlpha(1);
  scene.graphics = applyBrownThemeToGraphics(scene.add.graphics(), theme);
  scene.collectionListContainer = scene.add.container(0, 0);
  scene.collectionMaskShape = applyBrownThemeToGraphics(scene.make.graphics({ x: 0, y: 0, add: false }), theme);
  scene.collectionMask = scene.collectionMaskShape.createGeometryMask();
  scene.collectionListContainer.setMask(scene.collectionMask);
  scene.collectionListContainer.setVisible(false);

  bindOverlaySceneKeyboardInput(scene);
  bindOverlayScenePointerInput(scene);

  scene.scale.on("resize", scene.onResize, scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.teardown());
}

export function teardownOverlaySceneLifecycle(scene) {
  scene.scale.off("resize", scene.onResize, scene);

  scene.keyboardHandlers.forEach(({ eventName, handler }) => {
    scene.input.keyboard?.off(eventName, handler);
  });
  scene.keyboardHandlers = [];

  scene.entryCards.forEach((card) => card.container.destroy());
  scene.entryCards.clear();

  scene.buttons.forEach((button) => button.container.destroy());
  scene.buttons.clear();

  if (scene.collectionListContainer) {
    scene.collectionListContainer.destroy();
    scene.collectionListContainer = null;
  }
  if (scene.collectionMaskShape) {
    scene.collectionMaskShape.destroy();
    scene.collectionMaskShape = null;
    scene.collectionMask = null;
  }

  scene.textNodes.forEach((text) => text.destroy());
  scene.textNodes.clear();

  scene.lastEntrySignature = "";
  scene.currentMode = null;
  scene.collectionSignature = "";
  scene.collectionViewport = null;
  scene.collectionScroll = 0;
  scene.collectionScrollTarget = 0;
  scene.collectionScrollMax = 0;

  scene.pointerHandlers.forEach(({ eventName, handler }) => {
    scene.input.off(eventName, handler);
  });
  scene.pointerHandlers = [];
}

export function getOverlaySnapshot(scene) {
  const api = getOverlayApiFromRuntime(scene);
  if (!api || typeof api.getSnapshot !== "function") {
    return null;
  }
  try {
    return api.getSnapshot();
  } catch {
    return null;
  }
}

export function invokeOverlayAction(scene, actionName, value = undefined) {
  const mappedName = actionName === "closeCollection" ? "backToMenu" : actionName;
  const api = getOverlayApiFromRuntime(scene);
  const action = api ? api[mappedName] : null;
  if (typeof action === "function") {
    action(value);
  }
}

export function setOverlayCollectionScroll(scene, next) {
  scene.collectionScrollTarget = Phaser.Math.Clamp(Number(next) || 0, 0, scene.collectionScrollMax);
}

export function scrollOverlayCollectionBy(scene, delta) {
  setOverlayCollectionScroll(scene, scene.collectionScrollTarget + (Number(delta) || 0));
}
