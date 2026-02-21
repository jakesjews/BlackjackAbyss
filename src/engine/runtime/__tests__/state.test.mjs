import { describe, expect, it } from "vitest";
import { createProfile, createRuntimeState, defaultPlayerStats } from "../state/store.js";

describe("runtime state", () => {
  it("creates default player stats", () => {
    const stats = defaultPlayerStats();
    expect(stats.flatDamage).toBe(0);
    expect(stats.goldMultiplier).toBe(1);
    expect(stats.bustGuardPerEncounter).toBe(1);
  });

  it("creates profile defaults", () => {
    const profile = createProfile();
    expect(profile.version).toBe(1);
    expect(profile.totals.runsStarted).toBe(0);
    expect(Array.isArray(profile.runs)).toBe(true);
  });

  it("creates runtime state with viewport and audio defaults", () => {
    const state = createRuntimeState({ width: 1280, height: 720, audioEnabled: true });
    expect(state.mode).toBe("menu");
    expect(state.viewport.width).toBe(1280);
    expect(state.viewport.height).toBe(720);
    expect(state.audio.enabled).toBe(true);
  });
});
