import { describe, expect, it, vi } from "vitest";
import {
  createRewardShopHandlers,
  generateRewardOptions,
  generateShopStock,
} from "../core/reward-shop.js";

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

const RARITY_ORDER = ["common", "uncommon", "rare", "legendary"];

const RELICS = [
  { id: "r1", name: "R1", rarity: "common", shopCost: 10, description: "d1", apply: vi.fn() },
  { id: "r2", name: "R2", rarity: "rare", shopCost: 14, description: "d2", apply: vi.fn() },
  { id: "r3", name: "R3", rarity: "legendary", shopCost: 18, description: "d3", apply: vi.fn() },
];

const BOSS_RELIC = { id: "boss", name: "Boss", rarity: "legendary", shopCost: 0, description: "boss", apply: vi.fn() };

function normalizeRelicRarity(rarity) {
  if (rarity === "legendary" || rarity === "rare" || rarity === "uncommon") {
    return rarity;
  }
  return "common";
}

function relicRarityMeta(relic) {
  const rarity = normalizeRelicRarity(relic?.rarity);
  if (rarity === "legendary") {
    return { shopMarkup: 14 };
  }
  if (rarity === "rare") {
    return { shopMarkup: 8 };
  }
  if (rarity === "uncommon") {
    return { shopMarkup: 3 };
  }
  return { shopMarkup: 0 };
}

function createBaseState() {
  return {
    mode: "shop",
    selectionIndex: 0,
    rewardOptions: [],
    shopStock: [],
    run: {
      floor: 1,
      maxFloor: 3,
      room: 1,
      roomsPerFloor: 5,
      shopPurchaseMade: false,
      player: {
        hp: 30,
        maxHp: 40,
        gold: 60,
        relics: {},
        stats: {
          critChance: 0,
          flatDamage: 0,
          block: 0,
          goldMultiplier: 1,
        },
      },
    },
    profile: {
      relicCollection: {},
      totals: {
        relicsCollected: 0,
      },
    },
  };
}

describe("reward/shop helpers", () => {
  it("generates reward options with boss relic and no duplicates", () => {
    const options = generateRewardOptions({
      count: 3,
      includeBossRelic: true,
      run: { floor: 2, player: { relics: {} } },
      profile: {},
      relics: RELICS,
      bossRelic: BOSS_RELIC,
      isRelicUnlocked: () => true,
      normalizeRelicRarity,
      rarityOrder: RARITY_ORDER,
      shuffleFn: (entries) => entries,
      random: () => 0,
    });

    expect(options).toHaveLength(3);
    expect(options[0].id).toBe("boss");
    const ids = new Set(options.map((entry) => entry.id));
    expect(ids.size).toBe(3);
  });

  it("generates shop stock with relics and heal service", () => {
    const stock = generateShopStock({
      count: 3,
      run: { floor: 2, player: { relics: {} } },
      profile: {},
      relics: RELICS,
      isRelicUnlocked: () => true,
      normalizeRelicRarity,
      rarityOrder: RARITY_ORDER,
      relicRarityMeta,
      shuffleFn: (entries) => entries,
      random: () => 0,
    });

    expect(stock).toHaveLength(3);
    expect(stock.some((item) => item.type === "heal")).toBe(true);
    const relic = stock.find((item) => item.type === "relic");
    expect(relic.cost).toBeGreaterThanOrEqual(relic.relic.shopCost);
  });

  it("buys relics, applies clamps, and updates profile progress", () => {
    const state = createBaseState();
    const relic = {
      id: "r-buy",
      name: "R Buy",
      rarity: "legendary",
      description: "Power",
      shopCost: 22,
      apply: (run) => {
        run.player.stats.critChance += 1;
        run.player.stats.flatDamage += 99;
        run.player.stats.block += 50;
        run.player.stats.goldMultiplier += 5;
      },
    };
    state.shopStock = [{ type: "relic", relic, cost: 20, sold: false }];

    const gainChips = vi.fn((delta) => {
      state.run.player.gold += delta;
    });
    const spawnFloatText = vi.fn();
    const playUiSfx = vi.fn();
    const setAnnouncement = vi.fn();
    const addLog = vi.fn();
    const saveRunSnapshot = vi.fn();
    const saveProfile = vi.fn();

    const handlers = createRewardShopHandlers({
      state,
      relics: RELICS,
      bossRelic: BOSS_RELIC,
      rarityOrder: RARITY_ORDER,
      nonNegInt,
      normalizeRelicRarity,
      relicRarityMeta,
      isRelicUnlocked: () => true,
      shuffleFn: (entries) => entries,
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      nextModeAfterRewardClaim: () => "shop",
      nextModeAfterShopContinue: () => "playing",
      passiveDescription: (text) => text,
      gainChips,
      spawnFloatText,
      playUiSfx,
      setAnnouncement,
      addLog,
      saveRunSnapshot,
      beginEncounter: vi.fn(),
      saveProfile,
      width: 1280,
    });

    handlers.buyShopItem(0);

    expect(gainChips).toHaveBeenCalledWith(-20);
    expect(state.run.player.gold).toBe(40);
    expect(state.shopStock[0].sold).toBe(true);
    expect(state.run.shopPurchaseMade).toBe(true);
    expect(state.run.player.relics["r-buy"]).toBe(1);
    expect(state.run.player.stats.critChance).toBe(0.6);
    expect(state.run.player.stats.flatDamage).toBe(14);
    expect(state.run.player.stats.block).toBe(10);
    expect(state.run.player.stats.goldMultiplier).toBe(2.35);
    expect(state.profile.relicCollection["r-buy"]).toBe(1);
    expect(state.profile.totals.relicsCollected).toBe(1);
    expect(saveProfile).toHaveBeenCalledTimes(1);
    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
    expect(playUiSfx).toHaveBeenCalledWith("coin");
    expect(spawnFloatText).toHaveBeenCalledWith("-20", 640, 646, "#ffd28a");
  });

  it("claims reward into shop stock and leaves camp into encounter", () => {
    const state = createBaseState();
    state.mode = "reward";
    state.rewardOptions = [RELICS[0]];

    const playUiSfx = vi.fn();
    const setAnnouncement = vi.fn();
    const addLog = vi.fn();
    const saveRunSnapshot = vi.fn();
    const beginEncounter = vi.fn(() => {
      state.mode = "playing";
    });

    const handlers = createRewardShopHandlers({
      state,
      relics: RELICS,
      bossRelic: BOSS_RELIC,
      rarityOrder: RARITY_ORDER,
      nonNegInt,
      normalizeRelicRarity,
      relicRarityMeta,
      isRelicUnlocked: () => true,
      shuffleFn: (entries) => entries,
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      nextModeAfterRewardClaim: () => "shop",
      nextModeAfterShopContinue: () => "playing",
      passiveDescription: (text) => text,
      gainChips: vi.fn(),
      spawnFloatText: vi.fn(),
      playUiSfx,
      setAnnouncement,
      addLog,
      saveRunSnapshot,
      beginEncounter,
      saveProfile: vi.fn(),
      width: 1280,
    });

    handlers.claimReward();
    expect(state.mode).toBe("shop");
    expect(state.shopStock.length).toBeGreaterThan(0);
    expect(state.selectionIndex).toBe(0);
    expect(playUiSfx).toHaveBeenCalledWith("confirm");
    expect(setAnnouncement).toHaveBeenCalledWith("Relics moved to camp. Spend chips to buy one.", 2);

    handlers.leaveShop();
    expect(addLog).toHaveBeenCalledWith("Left camp.");
    expect(beginEncounter).toHaveBeenCalledTimes(1);
  });
});
