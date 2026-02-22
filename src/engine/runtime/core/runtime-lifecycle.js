export function handleRuntimeHidden({
  state,
  saveRunSnapshot,
  saveProfile,
}) {
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
  bindRuntimeHostLifecycle,
  phaserGame,
  globalWindow,
  unlockAudio,
  requestLandscapeLock,
  resizeCanvas,
  state,
  saveRunSnapshot,
  saveProfile,
}) {
  bindRuntimeHostLifecycle({
    phaserGame,
    globalWindow,
    unlockAudio,
    requestLandscapeLock,
    resizeCanvas,
    onHidden: () => {
      handleRuntimeHidden({
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
