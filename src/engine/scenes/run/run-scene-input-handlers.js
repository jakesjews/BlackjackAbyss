import { closeRunSceneTopModal, setRunSceneLogsScroll, toggleRunSceneModal } from "./run-scene-modals.js";

function pointInRect(x, y, rect) {
  if (!rect) {
    return false;
  }
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function bindRunSceneKeyboardInput(scene) {
  if (!scene?.input?.keyboard) {
    return;
  }
  const bind = (eventName, handler) => {
    scene.input.keyboard.on(eventName, handler);
    scene.keyboardHandlers.push({ eventName, handler });
  };

  bind("keydown-Z", () => scene.invokeAction("hit"));
  bind("keydown-X", () => scene.invokeAction("stand"));
  bind("keydown-A", () => scene.invokeAction("hit"));
  bind("keydown-B", () => scene.invokeAction("stand"));
  bind("keydown-S", () => scene.invokeAction("split"));
  bind("keydown-C", () => scene.invokeAction("doubleDown"));
  bind("keydown-SPACE", (event) => {
    event.preventDefault();
    scene.invokeAction("doubleDown");
  });
  bind("keydown-ENTER", (event) => {
    event.preventDefault();
    if (scene.lastSnapshot?.intro?.active && scene.lastSnapshot?.intro?.ready) {
      scene.invokeAction("confirmIntro");
    } else if (scene.lastSnapshot?.intro?.active) {
      // Wait for intro text to complete.
    } else {
      scene.invokeAction("deal");
    }
  });
  bind("keydown-ESC", () => {
    closeRunSceneTopModal(scene);
  });
  bind("keydown-TAB", (event) => {
    event.preventDefault();
    const count = Array.isArray(scene.lastSnapshot?.passives) ? scene.lastSnapshot.passives.length : 0;
    if (count <= 0) {
      return;
    }
    toggleRunSceneModal(scene, "relics");
  });
}

export function bindRunScenePointerInput(scene) {
  const bind = (eventName, handler) => {
    scene.input.on(eventName, handler);
    scene.pointerHandlers.push({ eventName, handler });
  };
  bind("wheel", (pointer, gameObjects, deltaX, deltaY) => {
    if (!scene.logsModalOpen || !scene.logsViewport) {
      return;
    }
    if (!pointInRect(pointer.worldX, pointer.worldY, scene.logsViewport)) {
      return;
    }
    scene.logsPinnedToBottom = false;
    setRunSceneLogsScroll(scene, scene.logsScrollIndex + Math.sign(deltaY || 0) * 2);
  });
}
