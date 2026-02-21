export function createLandscapeLockRequester(globalWindow) {
  return () => {
    const orientation = globalWindow?.screen?.orientation;
    if (!orientation || typeof orientation.lock !== "function") {
      return;
    }
    orientation.lock("landscape").catch(() => {});
  };
}

export function bindRuntimeWindowLifecycle({
  globalWindow,
  globalDocument,
  unlockAudio,
  requestLandscapeLock,
  resizeCanvas,
  onHidden,
  onVisible,
  onBeforeUnload,
}) {
  globalWindow.addEventListener("pointerdown", unlockAudio, { passive: true });
  globalWindow.addEventListener("pointerdown", requestLandscapeLock, { passive: true });
  globalWindow.addEventListener("touchstart", unlockAudio, { passive: true });
  globalWindow.addEventListener("touchstart", requestLandscapeLock, { passive: true });
  globalWindow.addEventListener("click", unlockAudio, { passive: true });
  globalWindow.addEventListener("click", requestLandscapeLock, { passive: true });
  globalWindow.addEventListener("resize", resizeCanvas);
  globalWindow.addEventListener("orientationchange", () => {
    requestLandscapeLock();
    resizeCanvas();
  });
  globalDocument.addEventListener("fullscreenchange", resizeCanvas);
  globalDocument.addEventListener("visibilitychange", () => {
    if (globalDocument.hidden) {
      onHidden();
      return;
    }
    onVisible();
  });
  globalWindow.addEventListener("beforeunload", onBeforeUnload);
}
