import { describe, expect, it } from "vitest";
import { buildPhaserOverlaySnapshot } from "../core/overlay-snapshot.js";

const RELIC_RARITY_META = {
  common: { glow: "#8899aa" },
  rare: { glow: "#f2cc5a" },
};

describe("overlay snapshot builder", () => {
  it("builds collection snapshot with entry mapping and summary counts", () => {
    const entries = [
      {
        relic: { id: "ember-core", name: "Ember Core", description: "Deal +2 damage." },
        rarity: "rare",
        rarityLabel: "Rare",
        unlocked: true,
        copies: 2,
        unlockText: "",
      },
      {
        relic: { id: "locked-one", name: "Locked", description: "N/A" },
        rarity: "common",
        rarityLabel: "Common",
        unlocked: false,
        copies: 0,
        unlockText: "Defeat 5 elites.",
      },
    ];

    const snapshot = buildPhaserOverlaySnapshot({
      state: { mode: "collection" },
      collectionEntries: () => entries,
      relicRarityMeta: RELIC_RARITY_META,
      passiveThumbUrl: (relic) => `/thumbs/${relic.id}.png`,
      passiveDescription: (description) => `Passive: ${description}`,
    });

    expect(snapshot.mode).toBe("collection");
    expect(snapshot.summary).toContain("Unlocked 1/2");
    expect(snapshot.summary).toContain("Found 1/2");
    expect(snapshot.summary).toContain("Copies 2");
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries[0]).toMatchObject({
      id: "ember-core",
      name: "Ember Core",
      unlocked: true,
      copies: 2,
      rarityLabel: "Rare",
      rarityColor: "#f2cc5a",
      thumbUrl: "/thumbs/ember-core.png",
      description: "Passive: Deal +2 damage.",
    });
    expect(snapshot.entries[1]).toMatchObject({
      id: "locked-one",
      name: "LOCKED",
      unlocked: false,
      copies: 0,
      thumbUrl: "",
      description: "Defeat 5 elites.",
    });
  });

  it("builds end-state overlay snapshot for victory mode", () => {
    const snapshot = buildPhaserOverlaySnapshot({
      state: {
        mode: "victory",
        run: {
          floor: 8,
          maxFloor: 8,
          enemiesDefeated: 24,
          totalHands: 36,
          player: {
            totalDamageDealt: 102,
            totalDamageTaken: 45,
            gold: 131,
          },
        },
      },
      collectionEntries: () => [],
      relicRarityMeta: RELIC_RARITY_META,
      passiveThumbUrl: () => "",
      passiveDescription: (description) => description,
    });

    expect(snapshot).toMatchObject({
      mode: "victory",
      title: "HOUSE BROKEN",
      canRestart: true,
    });
    expect(snapshot.stats).toContain("Floor reached: 8/8");
    expect(snapshot.stats).toContain("Enemies defeated: 24");
    expect(snapshot.stats).toContain("Hands played: 36");
    expect(snapshot.stats).toContain("Total damage dealt: 102");
    expect(snapshot.stats).toContain("Total damage taken: 45");
    expect(snapshot.stats).toContain("Chips banked: 131");
  });

  it("returns null outside collection and end-state modes", () => {
    const snapshot = buildPhaserOverlaySnapshot({
      state: { mode: "playing" },
      collectionEntries: () => [],
      relicRarityMeta: RELIC_RARITY_META,
      passiveThumbUrl: () => "",
      passiveDescription: (description) => description,
    });
    expect(snapshot).toBeNull();
  });
});
