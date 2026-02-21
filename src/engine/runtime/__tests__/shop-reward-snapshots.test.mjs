import { describe, expect, it } from "vitest";
import {
  buildPhaserRewardSnapshot,
  buildPhaserShopSnapshot,
} from "../bootstrap/shop-reward-snapshots.js";

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

describe("shop/reward snapshot builders", () => {
  it("builds reward snapshot payload in reward mode", () => {
    const state = {
      mode: "reward",
      selectionIndex: 0,
      run: {
        floor: 2,
        room: 3,
        roomsPerFloor: 5,
        player: { gold: 42 },
        eventLog: ["a", "b"],
      },
      rewardOptions: [
        {
          id: "r1",
          name: "Relic One",
          description: "Power",
          rarity: "rare",
          color: "#abc",
        },
      ],
    };
    const snapshot = buildPhaserRewardSnapshot({
      state,
      passiveDescription: (text) => text,
      passiveThumbUrl: () => "/thumb.png",
      relicRarityMeta: () => ({ label: "Rare", glow: "#fff" }),
      normalizeRelicRarity: (rarity) => rarity,
      getRunEventLog: (run) => run?.eventLog || [],
    });

    expect(snapshot.mode).toBe("reward");
    expect(snapshot.canClaim).toBe(true);
    expect(snapshot.run.floor).toBe(2);
    expect(snapshot.options[0]).toMatchObject({
      id: "r1",
      rarity: "rare",
      rarityLabel: "Rare",
      thumbUrl: "/thumb.png",
      selected: true,
    });
    expect(snapshot.logs).toEqual(["a", "b"]);
  });

  it("returns null reward snapshot outside reward mode", () => {
    const snapshot = buildPhaserRewardSnapshot({
      state: { mode: "playing", rewardOptions: [], selectionIndex: 0 },
      passiveDescription: (text) => text,
      passiveThumbUrl: () => "",
      relicRarityMeta: () => ({ label: "Common", glow: "" }),
      normalizeRelicRarity: (rarity) => rarity,
      getRunEventLog: () => [],
    });
    expect(snapshot).toBeNull();
  });

  it("builds shop snapshot with affordability and selected buy state", () => {
    const state = {
      mode: "shop",
      selectionIndex: 1,
      run: {
        floor: 1,
        room: 2,
        roomsPerFloor: 5,
        shopPurchaseMade: false,
        player: {
          gold: 25,
          streak: 3,
          bustGuardsLeft: 1,
          hp: 31,
          maxHp: 40,
        },
        eventLog: ["camp"],
      },
      shopStock: [
        { type: "relic", relic: { id: "x" }, cost: 30, sold: false },
        { type: "heal", id: "patch-kit", name: "Patch Kit", description: "Restore 10 HP.", cost: 10, sold: false },
      ],
    };
    const snapshot = buildPhaserShopSnapshot({
      state,
      nonNegInt,
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      shopItemName: (item) => (item.type === "relic" ? "Relic X" : item.name),
      shopItemDescription: (item) => (item.type === "relic" ? "Power" : item.description),
      getRunEventLog: (run) => run?.eventLog || [],
    });

    expect(snapshot.mode).toBe("shop");
    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items[0].canBuy).toBe(false);
    expect(snapshot.items[1].canBuy).toBe(true);
    expect(snapshot.canBuySelected).toBe(true);
    expect(snapshot.logs).toEqual(["camp"]);
  });

  it("returns null shop snapshot outside shop mode", () => {
    const snapshot = buildPhaserShopSnapshot({
      state: { mode: "playing", shopStock: [], selectionIndex: 0 },
      nonNegInt,
      clampNumber: (value) => value,
      shopItemName: () => "",
      shopItemDescription: () => "",
      getRunEventLog: () => [],
    });
    expect(snapshot).toBeNull();
  });
});
