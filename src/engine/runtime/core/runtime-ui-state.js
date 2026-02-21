export function addLogToRun({ state, message }) {
  if (!state?.run) {
    return false;
  }
  const line = typeof message === "string" ? message.trim() : "";
  if (!line) {
    return false;
  }

  state.run.log.unshift({ message: line, ttl: 12 });
  if (state.run.log.length > 6) {
    state.run.log.length = 6;
  }

  if (!Array.isArray(state.run.eventLog)) {
    state.run.eventLog = [];
  }
  state.run.eventLog.push(line);
  if (state.run.eventLog.length > 240) {
    state.run.eventLog.shift();
  }
  return true;
}

export function setAnnouncementState({ state, message, duration = 2.2 }) {
  state.announcement = typeof message === "string" ? message : "";
  const safeDuration = Math.max(0.25, Number(duration) || 2.2);
  state.announcementTimer = safeDuration;
  state.announcementDuration = safeDuration;
}

export function getRunEventLog(run) {
  if (!run || !Array.isArray(run.eventLog)) {
    return [];
  }
  return run.eventLog;
}

export function hidePassiveTooltipState(state) {
  state.passiveTooltipTimer = 0;
}

export function moveSelectionState({ state, delta, length, playUiSfx }) {
  if (!length) {
    return false;
  }
  if (delta !== 0 && typeof playUiSfx === "function") {
    playUiSfx("select");
  }
  state.selectionIndex = (state.selectionIndex + delta + length) % length;
  return true;
}

export function hasSavedRunState(state) {
  return Boolean(state?.savedRunSnapshot?.run);
}

export function openCollectionState({ state, page = 0, nonNegInt, playUiSfx }) {
  if (typeof playUiSfx === "function") {
    playUiSfx("confirm");
  }
  state.mode = "collection";
  state.collectionPage = Math.max(0, nonNegInt(page, 0));
}
