export function installRuntimeModeSync({
  state,
  reportMode,
  resizeCanvas,
}) {
  let modeValue = typeof state?.mode === "string" ? state.mode : "menu";
  const safeReportMode = typeof reportMode === "function" ? reportMode : () => {};
  const safeResizeCanvas = typeof resizeCanvas === "function" ? resizeCanvas : () => {};

  Object.defineProperty(state, "mode", {
    configurable: true,
    enumerable: true,
    get() {
      return modeValue;
    },
    set(nextMode) {
      if (typeof nextMode !== "string" || nextMode.length === 0 || nextMode === modeValue) {
        return;
      }
      modeValue = nextMode;
      safeReportMode(modeValue);
      // Mode changes can switch between fixed menu canvas size and gameplay aspect ratio.
      // Resize immediately to avoid transient stretched frames (especially menu -> collection).
      safeResizeCanvas();
    },
  });

  safeReportMode(modeValue);
}
