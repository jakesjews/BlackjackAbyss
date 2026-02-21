import {
  buildSavedRunSnapshot,
  clearSavedRunState,
  hydrateResumeSnapshot,
  loadSavedRunSnapshotFromStorage,
  persistSavedRunSnapshot,
  resetTransientStateAfterResume,
} from "./run-snapshot.js";

function asFunction(callback, fallback = () => {}) {
  return typeof callback === "function" ? callback : fallback;
}

export function createRuntimeSaveResumeHandlers({
  state,
  storageKeys,
  safeGetStorage,
  safeSetStorage,
  safeRemoveStorage,
  serializeShopStock,
  sanitizeRun,
  sanitizeEncounter,
  relicById,
  hydrateShopStock,
  getGenerateCampRelicDraftStockFn,
  nonNegInt,
  setAnnouncementFn,
  updateProfileBestFn,
  unlockAudioFn,
  playUiSfxFn,
  resizeCanvasFn,
}) {
  const setAnnouncement = asFunction(setAnnouncementFn);
  const updateProfileBest = asFunction(updateProfileBestFn);
  const unlockAudio = asFunction(unlockAudioFn);
  const playUiSfx = asFunction(playUiSfxFn);
  const resizeCanvas = asFunction(resizeCanvasFn);

  function clearSavedRun() {
    clearSavedRunState({
      safeRemoveStorage,
      storageKey: storageKeys.run,
      state,
    });
  }

  function saveRunSnapshot() {
    const snapshot = buildSavedRunSnapshot({
      state,
      serializeShopStock,
    });
    if (!snapshot) {
      clearSavedRun();
      return;
    }
    persistSavedRunSnapshot({
      safeSetStorage,
      storageKey: storageKeys.run,
      snapshot,
    });
    state.savedRunSnapshot = snapshot;
  }

  function loadSavedRunSnapshot() {
    return loadSavedRunSnapshotFromStorage({
      safeGetStorage,
      storageKey: storageKeys.run,
    });
  }

  function resumeSavedRun() {
    const snapshot = state.savedRunSnapshot || loadSavedRunSnapshot();
    if (!snapshot) {
      return false;
    }

    const generateCampRelicDraftStock = asFunction(
      asFunction(getGenerateCampRelicDraftStockFn, () => null)(),
      () => []
    );

    const hydrated = hydrateResumeSnapshot({
      snapshot,
      sanitizeRun,
      sanitizeEncounter,
      relicById,
      hydrateShopStock,
      generateCampRelicDraftStock,
      nonNegInt,
    });
    if (!hydrated) {
      clearSavedRun();
      return false;
    }

    state.run = hydrated.run;
    state.encounter = hydrated.encounter;
    state.mode = hydrated.mode;
    state.rewardOptions = hydrated.rewardOptions;
    state.shopStock = hydrated.shopStock;
    state.selectionIndex = hydrated.selectionIndex;
    if (hydrated.introActive) {
      state.announcement = "";
      state.announcementTimer = 0;
      state.announcementDuration = 0;
    } else {
      setAnnouncement("Run resumed.", 1.8);
    }
    resetTransientStateAfterResume(state);
    state.savedRunSnapshot = snapshot;
    updateProfileBest(hydrated.run);
    unlockAudio();
    playUiSfx("confirm");
    resizeCanvas();
    return true;
  }

  return {
    clearSavedRun,
    saveRunSnapshot,
    loadSavedRunSnapshot,
    resumeSavedRun,
  };
}
