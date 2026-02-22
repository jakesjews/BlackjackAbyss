function pauseMusicSound(sound) {
  if (!sound) {
    return;
  }
  if (typeof sound.pause === "function") {
    try {
      sound.pause();
      return;
    } catch {
      // Fall back to stop when pause is unavailable.
    }
  }
  if (typeof sound.stop === "function") {
    try {
      sound.stop();
    } catch {
      // Ignore stop failures.
    }
  }
}

function resumeMusicSound(sound) {
  if (!sound || sound.isPlaying) {
    return;
  }
  if (sound.isPaused && typeof sound.resume === "function") {
    try {
      sound.resume();
      return;
    } catch {
      // Fall through to play.
    }
  }
  if (typeof sound.play === "function") {
    try {
      const playPromise = sound.play({
        loop: true,
        volume: typeof sound.volume === "number" ? sound.volume : 0,
      });
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch {
      // Ignore play failures.
    }
  }
}

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
  if (state.audio.musicSound && state.audio.musicSound.isPlaying) {
    pauseMusicSound(state.audio.musicSound);
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
        resumeMusicSound(state.audio.musicSound);
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
