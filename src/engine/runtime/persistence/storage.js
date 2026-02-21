export function safeGetStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and continue gameplay.
  }
}

export function safeRemoveStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures and continue gameplay.
  }
}

export function loadAudioEnabled(storageKeys) {
  const raw = safeGetStorage(storageKeys.audioEnabled);
  if (raw === "0" || raw === "false") {
    return false;
  }
  if (raw === "1" || raw === "true") {
    return true;
  }
  return true;
}

export function saveAudioEnabled(enabled, storageKeys) {
  safeSetStorage(storageKeys.audioEnabled, enabled ? "1" : "0");
}
