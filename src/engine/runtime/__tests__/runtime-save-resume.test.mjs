import { describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../constants.js";
import { createRuntimeSaveResumeHandlers } from "../core/runtime-save-resume.js";

function createStorageHarness(initial = {}) {
  const storage = { ...initial };
  return {
    storage,
    safeGetStorage: (key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
    safeSetStorage: (key, value) => {
      storage[key] = value;
    },
    safeRemoveStorage: (key) => {
      delete storage[key];
    },
  };
}

describe("runtime save/resume handlers", () => {
  it("clears persisted snapshot when run state is absent", () => {
    const state = {
      run: null,
      savedRunSnapshot: { stale: true },
      rewardOptions: [],
      shopStock: [],
      selectionIndex: 0,
    };
    const { storage, safeGetStorage, safeSetStorage, safeRemoveStorage } = createStorageHarness({
      [STORAGE_KEYS.run]: JSON.stringify({ run: { old: true } }),
    });

    const handlers = createRuntimeSaveResumeHandlers({
      state,
      storageKeys: STORAGE_KEYS,
      safeGetStorage,
      safeSetStorage,
      safeRemoveStorage,
      serializeShopStock: () => [],
      sanitizeRun: () => null,
      sanitizeEncounter: () => null,
      relicById: new Map(),
      hydrateShopStock: () => [],
      getGenerateCampRelicDraftStockFn: () => () => [],
      nonNegInt: (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
      },
      setAnnouncementFn: vi.fn(),
      updateProfileBestFn: vi.fn(),
      unlockAudioFn: vi.fn(),
      playUiSfxFn: vi.fn(),
      resizeCanvasFn: vi.fn(),
    });

    handlers.saveRunSnapshot();
    expect(state.savedRunSnapshot).toBeNull();
    expect(storage[STORAGE_KEYS.run]).toBeUndefined();
  });

  it("hydrates saved run snapshot and applies resume side effects", () => {
    const rewardRelic = { id: "ember-core", name: "Ember Core" };
    const savedSnapshot = {
      version: 1,
      mode: "shop",
      run: { floor: 2 },
      encounter: { enemy: { name: "Warden" }, intro: null },
      rewardOptionIds: ["ember-core"],
      shopStock: [],
      selectionIndex: 3,
    };

    const state = {
      run: null,
      encounter: null,
      mode: "menu",
      rewardOptions: [],
      shopStock: [],
      selectionIndex: 0,
      announcement: "old",
      announcementTimer: 5,
      announcementDuration: 5,
      floatingTexts: [{ x: 1 }],
      cardBursts: [{ x: 1 }],
      sparkParticles: [{ x: 1 }],
      handTackles: [{ x: 1 }],
      flashOverlays: [{ x: 1 }],
      screenShakeTime: 1,
      screenShakeDuration: 1,
      screenShakePower: 1,
      pendingTransition: { active: true },
      combatLayout: { id: 1 },
      autosaveTimer: 9,
      savedRunSnapshot: null,
    };

    const { storage, safeGetStorage, safeSetStorage, safeRemoveStorage } = createStorageHarness({
      [STORAGE_KEYS.run]: JSON.stringify(savedSnapshot),
    });
    const setAnnouncementFn = vi.fn();
    const updateProfileBestFn = vi.fn();
    const unlockAudioFn = vi.fn();
    const playUiSfxFn = vi.fn();
    const resizeCanvasFn = vi.fn();

    const handlers = createRuntimeSaveResumeHandlers({
      state,
      storageKeys: STORAGE_KEYS,
      safeGetStorage,
      safeSetStorage,
      safeRemoveStorage,
      serializeShopStock: () => [],
      sanitizeRun: () => ({ player: { gold: 10 }, log: ["stale"], room: 2, floor: 1 }),
      sanitizeEncounter: () => ({ enemy: { name: "Warden" }, intro: { active: false } }),
      relicById: new Map([["ember-core", rewardRelic]]),
      hydrateShopStock: () => [],
      getGenerateCampRelicDraftStockFn: () => (rewardOptions) => rewardOptions.map((relic) => ({ relic, sold: false })),
      nonNegInt: (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
      },
      setAnnouncementFn,
      updateProfileBestFn,
      unlockAudioFn,
      playUiSfxFn,
      resizeCanvasFn,
    });

    const resumed = handlers.resumeSavedRun();

    expect(resumed).toBe(true);
    expect(state.mode).toBe("shop");
    expect(state.selectionIndex).toBe(3);
    expect(state.rewardOptions).toEqual([rewardRelic]);
    expect(state.shopStock).toEqual([{ relic: rewardRelic, sold: false }]);
    expect(state.run.log).toEqual([]);
    expect(state.floatingTexts).toEqual([]);
    expect(state.cardBursts).toEqual([]);
    expect(state.sparkParticles).toEqual([]);
    expect(state.handTackles).toEqual([]);
    expect(state.flashOverlays).toEqual([]);
    expect(state.pendingTransition).toBeNull();
    expect(state.combatLayout).toBeNull();
    expect(state.autosaveTimer).toBe(0);
    expect(setAnnouncementFn).toHaveBeenCalledWith("Run resumed.", 1.8);
    expect(updateProfileBestFn).toHaveBeenCalledTimes(1);
    expect(unlockAudioFn).toHaveBeenCalledTimes(1);
    expect(playUiSfxFn).toHaveBeenCalledWith("confirm");
    expect(resizeCanvasFn).toHaveBeenCalledTimes(1);
    expect(storage[STORAGE_KEYS.run]).toBeDefined();
    expect(state.savedRunSnapshot).toEqual(savedSnapshot);
  });

  it("clears invalid snapshot when hydration fails", () => {
    const snapshot = {
      run: { floor: 1 },
      encounter: { enemy: { name: "Wisp" } },
    };
    const state = {
      run: null,
      encounter: null,
      rewardOptions: [],
      shopStock: [],
      selectionIndex: 0,
      savedRunSnapshot: snapshot,
    };
    const { storage, safeGetStorage, safeSetStorage, safeRemoveStorage } = createStorageHarness({
      [STORAGE_KEYS.run]: JSON.stringify(snapshot),
    });

    const handlers = createRuntimeSaveResumeHandlers({
      state,
      storageKeys: STORAGE_KEYS,
      safeGetStorage,
      safeSetStorage,
      safeRemoveStorage,
      serializeShopStock: () => [],
      sanitizeRun: () => null,
      sanitizeEncounter: () => null,
      relicById: new Map(),
      hydrateShopStock: () => [],
      getGenerateCampRelicDraftStockFn: () => () => [],
      nonNegInt: (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
      },
      setAnnouncementFn: vi.fn(),
      updateProfileBestFn: vi.fn(),
      unlockAudioFn: vi.fn(),
      playUiSfxFn: vi.fn(),
      resizeCanvasFn: vi.fn(),
    });

    expect(handlers.resumeSavedRun()).toBe(false);
    expect(state.savedRunSnapshot).toBeNull();
    expect(storage[STORAGE_KEYS.run]).toBeUndefined();
  });
});
