export function initializeRuntimeStartup({
  state,
  loadProfile,
  loadSavedRunSnapshot,
  registerRuntimeApisFn,
  runtimeApiRegistration,
  createLandscapeLockRequesterFn,
  globalWindow,
  phaserGame,
  bindRuntimeLifecycle,
  bindRuntimeHostLifecycle,
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
    bindRuntimeHostLifecycle,
    phaserGame,
    globalWindow,
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
