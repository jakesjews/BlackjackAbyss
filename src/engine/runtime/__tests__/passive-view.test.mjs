import { describe, expect, it, vi } from "vitest";
import {
  collectionEntries,
  collectionPageLayout,
  passiveDescription,
  passiveStacksForRun,
  passiveSummary,
  passiveThumbUrl,
} from "../core/passive-view.js";

describe("passive view helpers", () => {
  it("normalizes passive descriptions", () => {
    expect(passiveDescription("")).toBe("Passive: No effect.");
    expect(passiveDescription("Passive: keep")).toBe("Passive: keep");
    expect(passiveDescription("gain block")).toBe("Passive: gain block");
  });

  it("builds and caches passive thumb URLs", () => {
    const cache = new Map();
    const applyHexAlpha = vi.fn(() => "rgba(1,2,3,0.35)");
    const relic = { id: "a", name: "Ace", color: "#abcdef" };
    const first = passiveThumbUrl({ relic, cache, applyHexAlpha });
    const second = passiveThumbUrl({ relic, cache, applyHexAlpha });
    expect(first.startsWith("data:image/svg+xml,")).toBe(true);
    expect(second).toBe(first);
    expect(applyHexAlpha).toHaveBeenCalledTimes(1);
  });

  it("creates sorted passive stack entries", () => {
    const run = { player: { relics: { b: 1, a: 2, c: 2 } } };
    const relicById = new Map([
      ["a", { id: "a", name: "Alpha" }],
      ["b", { id: "b", name: "Beta" }],
      ["c", { id: "c", name: "Gamma" }],
    ]);
    const stacks = passiveStacksForRun({
      run,
      relicById,
      nonNegInt: (value, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(0, Math.floor(n));
      },
    });
    expect(stacks.map((entry) => `${entry.relic.name}:${entry.count}`)).toEqual(["Alpha:2", "Gamma:2", "Beta:1"]);
  });

  it("summarizes key passive stats", () => {
    const run = {
      player: {
        stats: {
          flatDamage: 2,
          block: 1,
          critChance: 0.12,
          healOnWinHand: 0,
          goldMultiplier: 1.3,
          bustGuardPerEncounter: 1,
          firstHandDamage: 0,
          chipsOnWinHand: 0,
          chipsOnPush: 0,
        },
      },
    };
    expect(passiveSummary(run)).toBe("+2 dmg | -1 incoming | 12% crit | +30% chips");
  });

  it("maps and sorts collection entries", () => {
    const entries = collectionEntries({
      profile: { relicCollection: { a: 2, b: 0 } },
      relics: [
        { id: "b", name: "Beta", rarity: "rare" },
        { id: "a", name: "Alpha", rarity: "common" },
      ],
      normalizeRelicRarity: (rarity) => rarity,
      rarityMeta: { common: { label: "Common" }, rare: { label: "Rare" } },
      rarityOrder: ["common", "rare"],
      isRelicUnlocked: (relic) => relic.id === "a",
      relicUnlockLabel: (relic) => (relic.id === "a" ? "Unlocked" : "Locked"),
      nonNegInt: (value, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(0, Math.floor(n));
      },
    });
    expect(entries.map((entry) => `${entry.relic.name}:${entry.rarityLabel}:${entry.copies}`)).toEqual([
      "Alpha:Common:2",
      "Beta:Rare:0",
    ]);
    expect(entries[0].unlocked).toBe(true);
    expect(entries[1].unlockText).toBe("Locked");
  });

  it("returns collection layout by orientation", () => {
    expect(collectionPageLayout(true)).toEqual({ cols: 2, rows: 3 });
    expect(collectionPageLayout(false)).toEqual({ cols: 4, rows: 3 });
  });
});
