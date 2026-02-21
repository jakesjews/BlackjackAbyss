export function isEncounterIntroActive({ state, encounter = state?.encounter }) {
  return Boolean(state?.mode === "playing" && encounter && encounter.intro && encounter.intro.active);
}

export function updateEncounterIntroTyping({ encounter, dt }) {
  if (!encounter || !encounter.intro || !encounter.intro.active || encounter.intro.ready) {
    return;
  }
  const intro = encounter.intro;
  const dialogue = intro.dialogue || "";
  if (!dialogue.length) {
    intro.visibleChars = 0;
    intro.ready = true;
    intro.typeTimer = 0;
    return;
  }

  intro.typeTimer = Number.isFinite(intro.typeTimer) ? intro.typeTimer : 0;
  intro.typeTimer -= dt;

  while (intro.typeTimer <= 0 && intro.visibleChars < dialogue.length) {
    const ch = dialogue.charAt(intro.visibleChars);
    intro.visibleChars += 1;
    if (/[.!?,]/.test(ch)) {
      intro.typeTimer += 0.052;
    } else if (ch === " ") {
      intro.typeTimer += 0.008;
    } else {
      intro.typeTimer += 0.015;
    }
  }

  if (intro.visibleChars >= dialogue.length) {
    intro.visibleChars = dialogue.length;
    intro.ready = true;
    intro.typeTimer = 0;
  }
}

export function revealEncounterIntro({
  state,
  encounter = state?.encounter,
  isEncounterIntroActiveFn = isEncounterIntroActive,
  saveRunSnapshotFn,
}) {
  if (!isEncounterIntroActiveFn({ state, encounter }) || !encounter?.intro) {
    return false;
  }
  const intro = encounter.intro;
  if (intro.ready) {
    return false;
  }
  intro.visibleChars = (intro.dialogue || "").length;
  intro.ready = true;
  intro.typeTimer = 0;
  if (typeof saveRunSnapshotFn === "function") {
    saveRunSnapshotFn();
  }
  return true;
}

export function confirmEncounterIntro({
  state,
  encounter = state?.encounter,
  isEncounterIntroActiveFn = isEncounterIntroActive,
  playUiSfxFn,
  startHandFn,
  saveRunSnapshotFn,
}) {
  if (!isEncounterIntroActiveFn({ state, encounter }) || !encounter) {
    return false;
  }
  const intro = encounter.intro;
  if (!intro?.ready) {
    if (typeof playUiSfxFn === "function") {
      playUiSfxFn("error");
    }
    return false;
  }
  intro.active = false;
  intro.confirmRect = null;
  intro.typeTimer = 0;
  intro.visibleChars = (intro.dialogue || "").length;
  if (typeof playUiSfxFn === "function") {
    playUiSfxFn("confirm");
  }
  if (typeof startHandFn === "function") {
    startHandFn();
  }
  if (typeof saveRunSnapshotFn === "function") {
    saveRunSnapshotFn();
  }
  return true;
}

export function advanceEncounterIntro({
  state,
  encounter = state?.encounter,
  isEncounterIntroActiveFn = isEncounterIntroActive,
  revealEncounterIntroFn = revealEncounterIntro,
  confirmEncounterIntroFn = confirmEncounterIntro,
  playUiSfxFn,
  startHandFn,
  saveRunSnapshotFn,
}) {
  if (!isEncounterIntroActiveFn({ state, encounter })) {
    return false;
  }
  if (revealEncounterIntroFn({ state, encounter, isEncounterIntroActiveFn, saveRunSnapshotFn })) {
    if (typeof playUiSfxFn === "function") {
      playUiSfxFn("select");
    }
    return true;
  }
  return confirmEncounterIntroFn({
    state,
    encounter,
    isEncounterIntroActiveFn,
    playUiSfxFn,
    startHandFn,
    saveRunSnapshotFn,
  });
}
