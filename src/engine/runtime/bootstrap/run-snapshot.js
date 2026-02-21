export function clearSavedRunState({ safeRemoveStorage, storageKey, state }) {
  safeRemoveStorage(storageKey);
  state.savedRunSnapshot = null;
}

export function buildSavedRunSnapshot({ state, serializeShopStock, now = () => Date.now() }) {
  if (!state?.run) {
    return null;
  }
  return {
    version: 1,
    savedAt: now(),
    mode: state.mode,
    run: state.run,
    encounter: state.encounter,
    rewardOptionIds: state.rewardOptions.map((relic) => relic.id),
    shopStock: serializeShopStock(state.shopStock),
    selectionIndex: state.selectionIndex,
    announcement: state.announcement,
    announcementTimer: state.announcementTimer,
  };
}

export function parseSavedRunSnapshot(raw) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.run) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadSavedRunSnapshotFromStorage({ safeGetStorage, storageKey }) {
  const raw = safeGetStorage(storageKey);
  return parseSavedRunSnapshot(raw);
}

export function persistSavedRunSnapshot({ safeSetStorage, storageKey, snapshot }) {
  safeSetStorage(storageKey, JSON.stringify(snapshot));
}

export function resolveSavedRunMode(mode) {
  const rawMode = ["playing", "reward", "shop", "gameover", "victory"].includes(mode) ? mode : "playing";
  return rawMode === "reward" ? "shop" : rawMode;
}

export function hydrateResumeSnapshot({
  snapshot,
  sanitizeRun,
  sanitizeEncounter,
  relicById,
  hydrateShopStock,
  generateCampRelicDraftStock,
  nonNegInt,
}) {
  const run = sanitizeRun(snapshot.run);
  const encounter = sanitizeEncounter(snapshot.encounter, run);
  if (!run || !encounter) {
    return null;
  }

  const mode = resolveSavedRunMode(snapshot.mode);
  const rewardOptions = Array.isArray(snapshot.rewardOptionIds)
    ? snapshot.rewardOptionIds.map((id) => relicById.get(id)).filter(Boolean)
    : [];
  let shopStock = hydrateShopStock(snapshot.shopStock, relicById);
  if (mode === "shop" && !shopStock.length && rewardOptions.length) {
    shopStock = generateCampRelicDraftStock(rewardOptions);
  }

  return {
    run,
    encounter,
    mode,
    rewardOptions,
    shopStock,
    selectionIndex: nonNegInt(snapshot.selectionIndex, 0),
    introActive: Boolean(encounter.intro?.active),
  };
}

export function resetTransientStateAfterResume(state) {
  state.floatingTexts = [];
  state.cardBursts = [];
  state.sparkParticles = [];
  state.handTackles = [];
  state.flashOverlays = [];
  state.screenShakeTime = 0;
  state.screenShakeDuration = 0;
  state.screenShakePower = 0;
  state.pendingTransition = null;
  state.combatLayout = null;
  state.autosaveTimer = 0;
  if (state.run && Array.isArray(state.run.log)) {
    state.run.log = [];
  }
}
