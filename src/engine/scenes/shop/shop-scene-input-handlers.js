import Phaser from "phaser";

function pointInRect(x, y, rect) {
  if (!rect) {
    return false;
  }
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function bindShopSceneKeyboardInput(scene) {
  if (!scene.input.keyboard) {
    return;
  }

  const bind = (eventName, handler) => {
    scene.input.keyboard.on(eventName, handler);
    scene.keyboardHandlers.push({ eventName, handler });
  };

  bind("keydown-TAB", (event) => {
    if (!scene.shopOpen) {
      return;
    }
    event.preventDefault();
    const count = Array.isArray(scene.lastSnapshot?.items) ? scene.lastSnapshot.items.length : 0;
    if (count <= 0) {
      return;
    }
    const direction = event.shiftKey ? -1 : 1;
    const baseIndex = scene.resolveSelectedIndex(scene.lastSnapshot, false);
    const nextIndex = Phaser.Math.Wrap(baseIndex + direction, 0, count);
    scene.focusedCardIndex = nextIndex;
    scene.hoveredCardIndex = null;
    scene.invokeAction("selectIndex", nextIndex);
  });

  bind("keydown-Z", () => {
    if (!scene.shopOpen) {
      return;
    }
    const selectedIndex = scene.resolveSelectedIndex(scene.lastSnapshot);
    scene.invokeAction("buy", selectedIndex);
  });

  bind("keydown-S", (event) => {
    event.preventDefault();
    scene.setShopOpen(!scene.shopOpen);
  });

  bind("keydown-ENTER", (event) => {
    event.preventDefault();
    scene.invokeAction("continueRun");
  });

  bind("keydown-ESC", () => {
    scene.logsModalOpen = false;
    if (scene.shopOpen) {
      scene.setShopOpen(false);
    }
  });
}

export function bindShopScenePointerInput(scene) {
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
    scene.setLogsScroll(scene.logsScrollIndex + Math.sign(deltaY || 0) * 2);
  });
}
