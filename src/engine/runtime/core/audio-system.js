export function createLandscapeLockRequester(globalWindow) {
  return () => {
    const orientation = globalWindow?.screen?.orientation;
    if (!orientation || typeof orientation.lock !== "function") {
      return;
    }
    orientation.lock("landscape").catch(() => {});
  };
}
