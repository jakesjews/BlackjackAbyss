import { describe, expect, it } from "vitest";
import {
  countCollectedCopies,
  countDistinctCollected,
  getRelicRarityMeta,
  normalizeRelicRarity,
} from "../domain/relics.js";

const rarityMeta = {
  common: { label: "Common" },
  rare: { label: "Rare" },
};

describe("relic domain", () => {
  it("normalizes rarity safely", () => {
    expect(normalizeRelicRarity("rare", rarityMeta)).toBe("rare");
    expect(normalizeRelicRarity("legendary", rarityMeta)).toBe("common");
  });

  it("resolves rarity metadata", () => {
    const meta = getRelicRarityMeta({ rarity: "rare" }, rarityMeta);
    expect(meta.label).toBe("Rare");
  });

  it("counts collection totals", () => {
    const collection = { a: 2, b: 0, c: 3 };
    expect(countCollectedCopies(collection)).toBe(5);
    expect(countDistinctCollected(collection)).toBe(2);
  });
});
