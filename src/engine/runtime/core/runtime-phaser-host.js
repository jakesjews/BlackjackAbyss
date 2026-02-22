const GAME_HIDDEN_EVENT = "hidden";
const GAME_VISIBLE_EVENT = "visible";
const SCALE_RESIZE_EVENT = "resize";

export function bindRuntimePhaserHostLifecycle({
  phaserGame,
  globalWindow,
  unlockAudio,
  requestLandscapeLock,
  resizeCanvas,
  onHidden,
  onVisible,
  onBeforeUnload,
}) {
  const gameEvents = phaserGame?.events;
  if (gameEvents && typeof gameEvents.on === "function") {
    gameEvents.on(GAME_HIDDEN_EVENT, onHidden);
    gameEvents.on(GAME_VISIBLE_EVENT, onVisible);
  }

  const scale = phaserGame?.scale;
  if (scale && typeof scale.on === "function") {
    scale.on(SCALE_RESIZE_EVENT, resizeCanvas);
  }

  const inputManager = phaserGame?.input;
  if (inputManager && typeof inputManager.on === "function") {
    const unlockAndLock = () => {
      unlockAudio();
      requestLandscapeLock();
    };
    inputManager.on("pointerdown", unlockAndLock);
  }

  if (globalWindow && typeof globalWindow.addEventListener === "function") {
    globalWindow.addEventListener("beforeunload", onBeforeUnload);
  }
}
