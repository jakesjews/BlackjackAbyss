export function passiveDescription(text) {
  if (typeof text !== "string" || text.length === 0) {
    return "Passive: No effect.";
  }
  return text.toLowerCase().startsWith("passive:") ? text : `Passive: ${text}`;
}

export function passiveThumbUrl({ relic, cache, applyHexAlpha }) {
  if (!relic || !relic.id) {
    return "";
  }
  if (cache.has(relic.id)) {
    return cache.get(relic.id);
  }
  const color = typeof relic.color === "string" && relic.color.length > 0 ? relic.color : "#9ed6ff";
  const glowColor = applyHexAlpha(color, 0.35);
  const symbol = String(relic.name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='112' height='144' viewBox='0 0 112 144'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#0f2031'/><stop offset='100%' stop-color='#07121d'/></linearGradient></defs><rect width='112' height='144' rx='12' fill='url(#g)'/><circle cx='56' cy='52' r='32' fill='${glowColor}'/><text x='56' y='92' text-anchor='middle' font-family='Chakra Petch, Sora, sans-serif' font-size='36' font-weight='700' fill='#f6e8b8'>${symbol}</text></svg>`;
  const encoded = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(relic.id, encoded);
  return encoded;
}

export function passiveStacksForRun({ run, relicById, nonNegInt }) {
  if (!run || !run.player || !run.player.relics) {
    return [];
  }
  return Object.entries(run.player.relics)
    .map(([id, count]) => ({
      relic: relicById.get(id),
      count: nonNegInt(count, 0),
    }))
    .filter((entry) => entry.relic && entry.count > 0)
    .sort((a, b) => {
      const countDelta = b.count - a.count;
      if (countDelta !== 0) {
        return countDelta;
      }
      return a.relic.name.localeCompare(b.relic.name);
    });
}

export function passiveSummary(run) {
  if (!run) {
    return "";
  }

  const s = run.player.stats;
  const bits = [];
  if (s.flatDamage > 0) bits.push(`+${s.flatDamage} dmg`);
  if (s.block > 0) bits.push(`-${s.block} incoming`);
  if (s.critChance > 0) bits.push(`${Math.round(s.critChance * 100)}% crit`);
  if (s.healOnWinHand > 0) bits.push(`heal ${s.healOnWinHand}/win`);
  if (s.goldMultiplier > 1) bits.push(`+${Math.round((s.goldMultiplier - 1) * 100)}% chips`);
  if (s.bustGuardPerEncounter > 0) bits.push(`${s.bustGuardPerEncounter} guards/enc`);
  if (s.firstHandDamage > 0) bits.push(`+${s.firstHandDamage} first hand`);
  if (s.chipsOnWinHand > 0) bits.push(`+${s.chipsOnWinHand} chips/win`);
  if (s.chipsOnPush > 0) bits.push(`+${s.chipsOnPush} chips/push`);

  return bits.slice(0, 4).join(" | ");
}

export function collectionEntries({
  profile,
  relics,
  normalizeRelicRarity,
  rarityMeta,
  rarityOrder,
  isRelicUnlocked,
  relicUnlockLabel,
  nonNegInt,
}) {
  return relics
    .map((relic) => {
      const rarity = normalizeRelicRarity(relic.rarity);
      return {
        relic,
        rarity,
        rarityLabel: rarityMeta[rarity].label,
        unlocked: isRelicUnlocked(relic, profile),
        unlockText: relicUnlockLabel(relic, profile),
        copies: nonNegInt(profile.relicCollection?.[relic.id], 0),
      };
    })
    .sort((a, b) => {
      const rarityDelta = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      if (rarityDelta !== 0) {
        return rarityDelta;
      }
      return a.relic.name.localeCompare(b.relic.name);
    });
}

export function collectionPageLayout(portrait) {
  if (portrait) {
    return { cols: 2, rows: 3 };
  }
  return { cols: 4, rows: 3 };
}
