import { describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "../constants.js";
import { createProfile, defaultPlayerStats } from "../state/store.js";
import { createRuntimeProfileHandlers } from "../bootstrap/runtime-profile.js";

const RELIC_RARITY_META = {
  common: { label: "Common", shopMarkup: 0 },
  uncommon: { label: "Uncommon", shopMarkup: 2 },
  rare: { label: "Rare", shopMarkup: 5 },
  legendary: { label: "Legendary", shopMarkup: 9 },
};

function createHandlers({ state = {}, storage = {}, now = () => 12345 } = {}) {
  return createRuntimeProfileHandlers({
    state,
    createProfile,
    defaultPlayerStats,
    maxRunHistory: 2,
    storageKeys: STORAGE_KEYS,
    safeGetStorage: (key) => storage[key] || null,
    safeSetStorage: (key, value) => {
      storage[key] = value;
    },
    countCollectedCopies: (collectionLike) =>
      Object.values(collectionLike || {}).reduce((total, count) => total + Math.max(0, Number(count) || 0), 0),
    countDistinctCollected: (collectionLike) =>
      Object.values(collectionLike || {}).filter((count) => Math.max(0, Number(count) || 0) > 0).length,
    normalizeRelicRarityFromDomain: (rarity, metaTable) =>
      Object.prototype.hasOwnProperty.call(metaTable, rarity) ? rarity : "common",
    getRelicRarityMetaFromDomain: (relic, metaTable) => metaTable[relic?.rarity] || metaTable.common,
    relicRarityMetaTable: RELIC_RARITY_META,
    now,
  });
}

describe("runtime-profile handlers", () => {
  it("normalizes and saves profile state via storage adapters", () => {
    const state = {};
    const storage = {
      [STORAGE_KEYS.profile]: JSON.stringify({
        totals: { runsStarted: 3, bestRoom: 4 },
        relicCollection: { "lucky-coin": 2 },
        runs: [
          { at: 10, outcome: "victory", floor: 2, room: 3, enemiesDefeated: 1, hands: 5, chips: 11 },
          { outcome: "defeat", floor: 1, room: 2, enemiesDefeated: 0, hands: 2, chips: 4 },
          { outcome: "victory", floor: 3, room: 5, enemiesDefeated: 8, hands: 12, chips: 40 },
        ],
      }),
    };
    const handlers = createHandlers({ state, storage, now: () => 77 });

    const profile = handlers.loadProfile();
    expect(profile.totals.runsStarted).toBe(3);
    expect(profile.totals.bestRoom).toBe(4);
    expect(profile.relicCollection["lucky-coin"]).toBe(2);
    expect(profile.runs).toHaveLength(2);
    expect(profile.runs[1].at).toBe(77);

    state.profile = profile;
    handlers.saveProfile();
    expect(JSON.parse(storage[STORAGE_KEYS.profile]).totals.runsStarted).toBe(3);
  });

  it("computes unlock progress and unlock labels from profile totals/collection", () => {
    const state = {
      profile: {
        ...createProfile(),
        totals: {
          ...createProfile().totals,
          enemiesDefeated: 9,
        },
        relicCollection: {
          alpha: 1,
          beta: 2,
          gamma: 0,
        },
      },
    };
    const handlers = createHandlers({ state });

    const distinctProgress = handlers.unlockProgressFor({ unlock: { key: "distinctRelics", min: 2, label: "Find relics" } });
    expect(distinctProgress).toEqual({
      unlocked: true,
      current: 2,
      target: 2,
      label: "Find relics",
    });

    const totalsProgress = handlers.unlockProgressFor({ unlock: { key: "enemiesDefeated", min: 10 } });
    expect(totalsProgress.unlocked).toBe(false);
    expect(handlers.relicUnlockLabel({ unlock: { key: "enemiesDefeated", min: 10, label: "Beat foes" } })).toBe(
      "Beat foes (9/10)"
    );
  });

  it("merges and clamps player stats for persisted save data", () => {
    const handlers = createHandlers();
    const merged = handlers.mergePlayerStats({
      flatDamage: 99,
      block: 15,
      critChance: 2,
      goldMultiplier: 10,
      bustGuardPerEncounter: -2,
      luckyStart: -10,
    });

    expect(merged.flatDamage).toBe(14);
    expect(merged.block).toBe(10);
    expect(merged.critChance).toBe(0.6);
    expect(merged.goldMultiplier).toBe(2.35);
    expect(merged.bustGuardPerEncounter).toBe(0);
    expect(merged.luckyStart).toBe(0);
  });

  it("normalizes relic rarity metadata lookups", () => {
    const handlers = createHandlers();
    expect(handlers.normalizeRelicRarity("mystery")).toBe("common");
    expect(handlers.relicRarityMeta({ rarity: "legendary" })).toEqual(RELIC_RARITY_META.legendary);
  });
});
