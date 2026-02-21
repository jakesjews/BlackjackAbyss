export function normalizeRelicRarity(rarity, rarityMeta) {
  if (typeof rarity === "string" && rarityMeta[rarity]) {
    return rarity;
  }
  return "common";
}

export function getRelicRarityMeta(relic, rarityMeta) {
  const rarity = normalizeRelicRarity(relic?.rarity, rarityMeta);
  return rarityMeta[rarity];
}

export function countCollectedCopies(relicCollection) {
  if (!relicCollection || typeof relicCollection !== "object") {
    return 0;
  }
  let total = 0;
  for (const value of Object.values(relicCollection)) {
    total += nonNegInt(value, 0);
  }
  return total;
}

export function countDistinctCollected(relicCollection) {
  if (!relicCollection || typeof relicCollection !== "object") {
    return 0;
  }
  let total = 0;
  for (const value of Object.values(relicCollection)) {
    if (nonNegInt(value, 0) > 0) {
      total += 1;
    }
  }
  return total;
}

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}
