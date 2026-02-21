export function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}

export function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

export function createRuntimeProfileHandlers({
  state,
  createProfile,
  defaultPlayerStats,
  maxRunHistory,
  storageKeys,
  safeGetStorage,
  safeSetStorage,
  countCollectedCopies,
  countDistinctCollected,
  normalizeRelicRarityFromDomain,
  getRelicRarityMetaFromDomain,
  relicRarityMetaTable,
  now = () => Date.now(),
}) {
  function normalizeRelicRarity(rarity) {
    return normalizeRelicRarityFromDomain(rarity, relicRarityMetaTable);
  }

  function relicRarityMeta(relic) {
    return getRelicRarityMetaFromDomain(relic, relicRarityMetaTable);
  }

  function profileCollectionCount(profile) {
    return countCollectedCopies(profile?.relicCollection);
  }

  function profileDistinctCollectionCount(profile) {
    return countDistinctCollected(profile?.relicCollection);
  }

  function unlockProgressFor(relic, profile = state.profile) {
    if (!relic || !relic.unlock) {
      return {
        unlocked: true,
        current: 1,
        target: 1,
        label: "Unlocked by default",
      };
    }

    const req = relic.unlock;
    const target = Math.max(1, nonNegInt(req.min, 1));
    const totals = profile?.totals || {};
    let current = 0;
    if (req.key === "distinctRelics") {
      current = profileDistinctCollectionCount(profile);
    } else if (req.key === "relicCopies") {
      current = profileCollectionCount(profile);
    } else if (Object.prototype.hasOwnProperty.call(totals, req.key)) {
      current = nonNegInt(totals[req.key], 0);
    }
    const label = typeof req.label === "string" && req.label.trim().length > 0 ? req.label.trim() : `Reach ${target} ${req.key}`;
    return {
      unlocked: current >= target,
      current,
      target,
      label,
    };
  }

  function isRelicUnlocked(relic, profile = state.profile) {
    return unlockProgressFor(relic, profile).unlocked;
  }

  function relicUnlockLabel(relic, profile = state.profile) {
    const progress = unlockProgressFor(relic, profile);
    if (progress.unlocked) {
      return "Unlocked";
    }
    return `${progress.label} (${progress.current}/${progress.target})`;
  }

  function mergePlayerStats(statsLike) {
    const merged = defaultPlayerStats();
    if (!statsLike || typeof statsLike !== "object") {
      return merged;
    }

    for (const key of Object.keys(merged)) {
      const candidate = Number(statsLike[key]);
      if (Number.isFinite(candidate)) {
        merged[key] = candidate;
      }
    }

    merged.goldMultiplier = Math.max(0.5, merged.goldMultiplier);
    merged.critChance = Math.max(0, Math.min(0.6, merged.critChance));
    merged.bustGuardPerEncounter = nonNegInt(merged.bustGuardPerEncounter, 1);
    merged.luckyStart = nonNegInt(merged.luckyStart, 0);
    merged.flatDamage = Math.min(14, merged.flatDamage);
    merged.block = Math.min(10, merged.block);
    merged.goldMultiplier = Math.min(2.35, merged.goldMultiplier);

    return merged;
  }

  function normalizeProfile(profileLike) {
    const base = createProfile();
    if (!profileLike || typeof profileLike !== "object") {
      return base;
    }

    if (profileLike.totals && typeof profileLike.totals === "object") {
      for (const key of Object.keys(base.totals)) {
        base.totals[key] = nonNegInt(profileLike.totals[key], base.totals[key]);
      }
    }

    if (profileLike.relicCollection && typeof profileLike.relicCollection === "object") {
      for (const [id, count] of Object.entries(profileLike.relicCollection)) {
        if (typeof id === "string" && id.length > 0) {
          base.relicCollection[id] = nonNegInt(count, 0);
        }
      }
    }

    if (Array.isArray(profileLike.runs)) {
      base.runs = profileLike.runs
        .slice(0, maxRunHistory)
        .map((entry) => ({
          at: typeof entry?.at === "number" ? entry.at : now(),
          outcome: entry?.outcome === "victory" ? "victory" : "defeat",
          floor: nonNegInt(entry?.floor, 1),
          room: nonNegInt(entry?.room, 1),
          enemiesDefeated: nonNegInt(entry?.enemiesDefeated, 0),
          hands: nonNegInt(entry?.hands, 0),
          chips: nonNegInt(entry?.chips, 0),
        }));
    }

    return base;
  }

  function loadProfile() {
    const raw = safeGetStorage(storageKeys.profile);
    if (!raw) {
      return createProfile();
    }
    try {
      return normalizeProfile(JSON.parse(raw));
    } catch {
      return createProfile();
    }
  }

  function saveProfile() {
    if (!state.profile) {
      return;
    }
    safeSetStorage(storageKeys.profile, JSON.stringify(state.profile));
  }

  return {
    clampNumber,
    nonNegInt,
    normalizeRelicRarity,
    relicRarityMeta,
    profileCollectionCount,
    profileDistinctCollectionCount,
    unlockProgressFor,
    isRelicUnlocked,
    relicUnlockLabel,
    mergePlayerStats,
    normalizeProfile,
    loadProfile,
    saveProfile,
  };
}
