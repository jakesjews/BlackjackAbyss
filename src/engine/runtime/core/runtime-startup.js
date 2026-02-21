export function initializeRuntimeStartup({
  state,
  loadProfile,
  loadSavedRunSnapshot,
  registerPhaserMenuActions,
  registerPhaserRunApi,
  registerPhaserRewardApi,
  registerPhaserShopApi,
  registerPhaserOverlayApi,
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
  registerPhaserMenuActions();
  registerPhaserRunApi();
  registerPhaserRewardApi();
  registerPhaserShopApi();
  registerPhaserOverlayApi();

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
