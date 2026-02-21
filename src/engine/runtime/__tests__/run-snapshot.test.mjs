import { describe, expect, it, vi } from "vitest";
import {
  buildSavedRunSnapshot,
  hydrateResumeSnapshot,
  parseSavedRunSnapshot,
  resetTransientStateAfterResume,
  resolveSavedRunMode,
} from "../core/run-snapshot.js";

describe("run snapshot helpers", () => {
  it("builds snapshot payload when a run exists", () => {
    const snapshot = buildSavedRunSnapshot({
      state: {
        mode: "playing",
        run: { id: 1 },
        encounter: { id: 2 },
        rewardOptions: [{ id: "r1" }],
        shopStock: [{ type: "heal" }],
        selectionIndex: 3,
        announcement: "a",
        announcementTimer: 1.5,
      },
      serializeShopStock: (stock) => stock,
      now: () => 123,
    });
    expect(snapshot).toEqual({
      version: 1,
      savedAt: 123,
      mode: "playing",
      run: { id: 1 },
      encounter: { id: 2 },
      rewardOptionIds: ["r1"],
      shopStock: [{ type: "heal" }],
      selectionIndex: 3,
      announcement: "a",
      announcementTimer: 1.5,
    });
  });

  it("parses and validates stored snapshot payload", () => {
    expect(parseSavedRunSnapshot("")).toBeNull();
    expect(parseSavedRunSnapshot("{\"foo\":1}")).toBeNull();
    expect(parseSavedRunSnapshot("{bad json")).toBeNull();
    expect(parseSavedRunSnapshot("{\"run\":{\"ok\":true}}")).toEqual({ run: { ok: true } });
  });

  it("hydrates resume data and normalizes legacy reward mode", () => {
    const relicById = new Map([["r1", { id: "r1" }]]);
    const hydrated = hydrateResumeSnapshot({
      snapshot: {
        mode: "reward",
        run: { run: true },
        encounter: { encounter: true },
        rewardOptionIds: ["r1", "missing"],
        shopStock: [],
        selectionIndex: 7,
      },
      sanitizeRun: () => ({ run: true }),
      sanitizeEncounter: () => ({ intro: { active: false } }),
      relicById,
      hydrateShopStock: () => [],
      generateCampRelicDraftStock: vi.fn(() => [{ type: "relic" }]),
      nonNegInt: (value, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(0, Math.floor(n));
      },
    });

    expect(hydrated.mode).toBe("shop");
    expect(hydrated.rewardOptions).toEqual([{ id: "r1" }]);
    expect(hydrated.shopStock).toEqual([{ type: "relic" }]);
    expect(hydrated.selectionIndex).toBe(7);
    expect(hydrated.introActive).toBe(false);
  });

  it("resets transient state after resume", () => {
    const state = {
      floatingTexts: [1],
      cardBursts: [1],
      sparkParticles: [1],
      handTackles: [1],
      flashOverlays: [1],
      screenShakeTime: 9,
      screenShakeDuration: 9,
      screenShakePower: 9,
      pendingTransition: { t: true },
      combatLayout: { a: 1 },
      autosaveTimer: 9,
      run: { log: [{ message: "x" }] },
    };
    resetTransientStateAfterResume(state);
    expect(state.floatingTexts).toEqual([]);
    expect(state.cardBursts).toEqual([]);
    expect(state.sparkParticles).toEqual([]);
    expect(state.handTackles).toEqual([]);
    expect(state.flashOverlays).toEqual([]);
    expect(state.screenShakeTime).toBe(0);
    expect(state.screenShakeDuration).toBe(0);
    expect(state.screenShakePower).toBe(0);
    expect(state.pendingTransition).toBeNull();
    expect(state.combatLayout).toBeNull();
    expect(state.autosaveTimer).toBe(0);
    expect(state.run.log).toEqual([]);
  });

  it("resolves stored mode mapping", () => {
    expect(resolveSavedRunMode("playing")).toBe("playing");
    expect(resolveSavedRunMode("reward")).toBe("shop");
    expect(resolveSavedRunMode("bogus")).toBe("playing");
  });
});
