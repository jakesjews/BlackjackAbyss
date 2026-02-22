export function initializeRuntimeStartup({
  state,
  loadProfile,
  loadSavedRunSnapshot,
  registerRuntimeApisFn,
  runtimeApiRegistration,
  createLandscapeLockRequesterFn,
  globalWindow,
  globalDocument,
  bindRuntimeLifecycle,
  bindRuntimeWindowLifecycle,
  unlockAudio,
  resizeCanvas,
  saveRunSnapshot,
  saveProfile,
  installRuntimeTestHooksFn,
  publishRuntimeTestHooks,
  renderGameToText,
  advanceTime,
  startRuntimeLoop,
}) {
  state.profile = loadProfile();
  state.savedRunSnapshot = loadSavedRunSnapshot();
  registerRuntimeApisFn(runtimeApiRegistration);

  const requestLandscapeLock = createLandscapeLockRequesterFn(globalWindow);

  bindRuntimeLifecycle({
    bindRuntimeWindowLifecycle,
    globalWindow,
    globalDocument,
    unlockAudio,
    requestLandscapeLock,
    resizeCanvas,
    state,
    saveRunSnapshot,
    saveProfile,
  });

  installRuntimeTestHooksFn({
    publishRuntimeTestHooks,
    renderGameToText,
    advanceTime,
  });
  requestLandscapeLock();
  startRuntimeLoop();
}
