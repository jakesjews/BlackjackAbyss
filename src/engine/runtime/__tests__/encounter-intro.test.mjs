import { describe, expect, it, vi } from "vitest";
import {
  advanceEncounterIntro,
  confirmEncounterIntro,
  isEncounterIntroActive,
  revealEncounterIntro,
  updateEncounterIntroTyping,
} from "../core/encounter-intro.js";

function createIntroState() {
  return {
    mode: "playing",
    encounter: {
      intro: {
        active: true,
        ready: false,
        dialogue: "Deal the cards.",
        visibleChars: 0,
        typeTimer: 0,
        confirmRect: { x: 1, y: 1, w: 1, h: 1 },
      },
    },
  };
}

describe("encounter intro helpers", () => {
  it("detects active intro state only when in playing mode", () => {
    const state = createIntroState();
    expect(isEncounterIntroActive({ state })).toBe(true);
    state.mode = "menu";
    expect(isEncounterIntroActive({ state })).toBe(false);
  });

  it("advances intro typing and marks ready at end of dialogue", () => {
    const encounter = {
      intro: {
        active: true,
        ready: false,
        dialogue: "Hi.",
        visibleChars: 0,
        typeTimer: 0,
      },
    };
    updateEncounterIntroTyping({ encounter, dt: 0.1 });
    expect(encounter.intro.visibleChars).toBeGreaterThan(0);

    for (let i = 0; i < 20 && !encounter.intro.ready; i += 1) {
      updateEncounterIntroTyping({ encounter, dt: 0.1 });
    }
    expect(encounter.intro.ready).toBe(true);
    expect(encounter.intro.visibleChars).toBe((encounter.intro.dialogue || "").length);
    expect(encounter.intro.typeTimer).toBe(0);
  });

  it("reveals intro immediately and snapshots state", () => {
    const state = createIntroState();
    const saveRunSnapshotFn = vi.fn();
    const revealed = revealEncounterIntro({ state, saveRunSnapshotFn });
    expect(revealed).toBe(true);
    expect(state.encounter.intro.ready).toBe(true);
    expect(state.encounter.intro.visibleChars).toBe(state.encounter.intro.dialogue.length);
    expect(saveRunSnapshotFn).toHaveBeenCalledTimes(1);
  });

  it("confirms intro only after it is ready", () => {
    const state = createIntroState();
    const playUiSfxFn = vi.fn();
    const startHandFn = vi.fn();
    const saveRunSnapshotFn = vi.fn();

    const blocked = confirmEncounterIntro({ state, playUiSfxFn, startHandFn, saveRunSnapshotFn });
    expect(blocked).toBe(false);
    expect(playUiSfxFn).toHaveBeenCalledWith("error");
    expect(startHandFn).not.toHaveBeenCalled();

    state.encounter.intro.ready = true;
    const confirmed = confirmEncounterIntro({ state, playUiSfxFn, startHandFn, saveRunSnapshotFn });
    expect(confirmed).toBe(true);
    expect(playUiSfxFn).toHaveBeenCalledWith("confirm");
    expect(startHandFn).toHaveBeenCalledTimes(1);
    expect(saveRunSnapshotFn).toHaveBeenCalledTimes(1);
    expect(state.encounter.intro.active).toBe(false);
  });

  it("advances intro by reveal first, then confirm", () => {
    const state = createIntroState();
    const playUiSfxFn = vi.fn();
    const startHandFn = vi.fn();
    const saveRunSnapshotFn = vi.fn();

    const first = advanceEncounterIntro({ state, playUiSfxFn, startHandFn, saveRunSnapshotFn });
    expect(first).toBe(true);
    expect(state.encounter.intro.ready).toBe(true);
    expect(playUiSfxFn).toHaveBeenCalledWith("select");

    const second = advanceEncounterIntro({ state, playUiSfxFn, startHandFn, saveRunSnapshotFn });
    expect(second).toBe(true);
    expect(playUiSfxFn).toHaveBeenCalledWith("confirm");
    expect(startHandFn).toHaveBeenCalledTimes(1);
  });
});
