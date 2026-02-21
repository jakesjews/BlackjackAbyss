export function handleRuntimeHidden({
  globalDocument,
  state,
  saveRunSnapshot,
  saveProfile,
}) {
  if (!globalDocument.hidden) {
    return;
  }
  saveRunSnapshot();
  saveProfile();
  if (state.audio.context && state.audio.context.state === "running") {
    state.audio.context.suspend().catch(() => {});
  }
  if (state.audio.musicElement && !state.audio.musicElement.paused) {
    state.audio.musicElement.pause();
  }
}

export function handleRuntimeVisible({
  state,
  requestLandscapeLock,
}) {
  if (state.audio.enabled && state.audio.started && state.audio.context && state.audio.context.state === "suspended") {
    state.audio.context
      .resume()
      .then(() => {
        if (state.audio.musicElement && state.audio.musicElement.paused) {
          const playPromise = state.audio.musicElement.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        }
      })
      .catch(() => {});
  }
  requestLandscapeLock();
}

export function handleRuntimeBeforeUnload({
  saveRunSnapshot,
  saveProfile,
}) {
  saveRunSnapshot();
  saveProfile();
}

export function bindRuntimeLifecycle({
  bindRuntimeWindowLifecycle,
  globalWindow,
  globalDocument,
  unlockAudio,
  requestLandscapeLock,
  resizeCanvas,
  state,
  saveRunSnapshot,
  saveProfile,
}) {
  bindRuntimeWindowLifecycle({
    globalWindow,
    globalDocument,
    unlockAudio,
    requestLandscapeLock,
    resizeCanvas,
    onHidden: () => {
      handleRuntimeHidden({
        globalDocument,
        state,
        saveRunSnapshot,
        saveProfile,
      });
    },
    onVisible: () => {
      handleRuntimeVisible({
        state,
        requestLandscapeLock,
      });
    },
    onBeforeUnload: () => {
      handleRuntimeBeforeUnload({
        saveRunSnapshot,
        saveProfile,
      });
    },
  });
}
