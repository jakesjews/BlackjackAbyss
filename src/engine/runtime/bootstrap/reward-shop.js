function fallbackNonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

export function relicRarityWeights({ source, floor, nonNegInt = fallbackNonNegInt }) {
  const clampedFloor = Math.max(1, Math.min(3, nonNegInt(floor, 1)));
  if (source === "shop") {
    if (clampedFloor === 1) {
      return { common: 68, uncommon: 24, rare: 7, legendary: 1 };
    }
    if (clampedFloor === 2) {
      return { common: 46, uncommon: 34, rare: 17, legendary: 3 };
    }
    return { common: 29, uncommon: 35, rare: 28, legendary: 8 };
  }
  if (clampedFloor === 1) {
    return { common: 64, uncommon: 28, rare: 7, legendary: 1 };
  }
  if (clampedFloor === 2) {
    return { common: 40, uncommon: 37, rare: 19, legendary: 4 };
  }
  return { common: 24, uncommon: 35, rare: 29, legendary: 12 };
}

export function sampleRarity({ weights, rarityOrder, random = Math.random }) {
  const total = Object.values(weights || {}).reduce((acc, value) => acc + Math.max(0, Number(value) || 0), 0);
  if (total <= 0) {
    return "common";
  }
  let roll = random() * total;
  for (const rarity of rarityOrder || []) {
    const weight = Math.max(0, Number(weights?.[rarity]) || 0);
    if (roll < weight) {
      return rarity;
    }
    roll -= weight;
  }
  return "common";
}

export function unlockedRelicPool({ relics, profile, isRelicUnlocked }) {
  return (Array.isArray(relics) ? relics : []).filter((relic) => isRelicUnlocked(relic, profile));
}

export function sampleRelics({
  pool,
  count,
  source,
  floor,
  run,
  nonNegInt = fallbackNonNegInt,
  normalizeRelicRarity,
  rarityOrder,
  random = Math.random,
}) {
  const options = [];
  const available = Array.isArray(pool) ? [...pool] : [];
  const weights = relicRarityWeights({ source, floor, nonNegInt });
  const owned = run?.player?.relics || {};
  const allowDuplicatesAt = source === "shop" ? 2 : 3;

  while (options.length < count && available.length > 0) {
    const targetRarity = sampleRarity({ weights, rarityOrder, random });
    const prioritizeFresh = options.length < allowDuplicatesAt;
    let candidates = available.filter((relic) => normalizeRelicRarity(relic.rarity) === targetRarity);
    if (prioritizeFresh) {
      const unowned = candidates.filter((relic) => nonNegInt(owned[relic.id], 0) === 0);
      if (unowned.length) {
        candidates = unowned;
      }
    }
    if (!candidates.length) {
      candidates = available;
      if (prioritizeFresh) {
        const unownedFallback = candidates.filter((relic) => nonNegInt(owned[relic.id], 0) === 0);
        if (unownedFallback.length) {
          candidates = unownedFallback;
        }
      }
    }
    const picked = candidates[Math.floor(random() * candidates.length)];
    options.push(picked);
    const idx = available.findIndex((entry) => entry.id === picked.id);
    if (idx >= 0) {
      available.splice(idx, 1);
    }
  }
  return options;
}

export function generateRewardOptions({
  count,
  includeBossRelic,
  run,
  profile,
  relics,
  bossRelic,
  isRelicUnlocked,
  normalizeRelicRarity,
  rarityOrder,
  shuffleFn,
  random = Math.random,
}) {
  const options = [];
  const floor = run ? run.floor : 1;
  const pool = shuffleFn(unlockedRelicPool({ relics, profile, isRelicUnlocked }));

  if (includeBossRelic && bossRelic) {
    options.push(bossRelic);
  }
  const rolled = sampleRelics({
    pool,
    count: Math.max(0, count - options.length),
    source: "reward",
    floor,
    run,
    normalizeRelicRarity,
    rarityOrder,
    random,
  });
  for (const relic of rolled) {
    if (options.some((entry) => entry.id === relic.id)) {
      continue;
    }
    options.push(relic);
    if (options.length >= count) {
      break;
    }
  }

  return options;
}

export function generateCampRelicDraftStock({
  rewardOptions,
  run,
  nonNegInt = fallbackNonNegInt,
  relicRarityMeta,
}) {
  const floorScale = run ? run.floor * 2 : 0;
  if (!Array.isArray(rewardOptions)) {
    return [];
  }
  return rewardOptions
    .filter(Boolean)
    .map((relic) => ({
      type: "relic",
      relic,
      cost: nonNegInt(relic.shopCost, 0) + floorScale + relicRarityMeta(relic).shopMarkup,
      sold: false,
    }));
}

export function generateShopStock({
  count,
  run,
  profile,
  relics,
  isRelicUnlocked,
  normalizeRelicRarity,
  rarityOrder,
  relicRarityMeta,
  shuffleFn,
  random = Math.random,
}) {
  const floorScale = run ? run.floor * 2 : 0;
  const floor = run ? run.floor : 1;
  const relicPool = shuffleFn(unlockedRelicPool({ relics, profile, isRelicUnlocked }));
  const rolledRelics = sampleRelics({
    pool: relicPool,
    count: Math.max(1, count - 1),
    source: "shop",
    floor,
    run,
    normalizeRelicRarity,
    rarityOrder,
    random,
  });

  const stock = rolledRelics.map((relic) => ({
    type: "relic",
    relic,
    cost: relic.shopCost + floorScale + relicRarityMeta(relic).shopMarkup,
    sold: false,
  }));

  stock.push({
    type: "heal",
    id: "patch-kit",
    name: "Patch Kit",
    description: "Restore 10 HP.",
    cost: 10 + floorScale,
    sold: false,
  });

  return shuffleFn(stock).slice(0, count);
}

export function createRewardShopHandlers({
  state,
  relics,
  bossRelic,
  rarityOrder,
  nonNegInt = fallbackNonNegInt,
  normalizeRelicRarity,
  relicRarityMeta,
  isRelicUnlocked,
  shuffleFn,
  clampNumber,
  nextModeAfterRewardClaim,
  nextModeAfterShopContinue,
  passiveDescription,
  gainChips,
  spawnFloatText,
  playUiSfx,
  setAnnouncement,
  addLog,
  saveRunSnapshot,
  beginEncounter,
  saveProfile,
  width,
}) {
  function relicRarityWeightsFor(source, floor) {
    return relicRarityWeights({ source, floor, nonNegInt });
  }

  function sampleRarityFor(weights) {
    return sampleRarity({ weights, rarityOrder });
  }

  function unlockedRelicPoolFor(profile = state.profile) {
    return unlockedRelicPool({ relics, profile, isRelicUnlocked });
  }

  function sampleRelicsFor(pool, count, source, floor) {
    return sampleRelics({
      pool,
      count,
      source,
      floor,
      run: state.run,
      nonNegInt,
      normalizeRelicRarity,
      rarityOrder,
    });
  }

  function generateRewardOptionsFor(count, includeBossRelic) {
    return generateRewardOptions({
      count,
      includeBossRelic,
      run: state.run,
      profile: state.profile,
      relics,
      bossRelic,
      isRelicUnlocked,
      normalizeRelicRarity,
      rarityOrder,
      shuffleFn,
    });
  }

  function generateCampRelicDraftStockFor(rewardOptions) {
    return generateCampRelicDraftStock({
      rewardOptions,
      run: state.run,
      nonNegInt,
      relicRarityMeta,
    });
  }

  function generateShopStockFor(count) {
    return generateShopStock({
      count,
      run: state.run,
      profile: state.profile,
      relics,
      isRelicUnlocked,
      normalizeRelicRarity,
      rarityOrder,
      relicRarityMeta,
      shuffleFn,
    });
  }

  function applyRelic(relic) {
    if (!state.run || !relic || typeof relic.apply !== "function") {
      return;
    }

    const run = state.run;
    run.player.relics[relic.id] = (run.player.relics[relic.id] || 0) + 1;
    relic.apply(run);
    run.player.stats.critChance = Math.min(0.6, run.player.stats.critChance);
    run.player.stats.flatDamage = Math.min(14, run.player.stats.flatDamage);
    run.player.stats.block = Math.min(10, run.player.stats.block);
    run.player.stats.goldMultiplier = Math.max(0.5, Math.min(2.35, run.player.stats.goldMultiplier));
    run.player.hp = Math.min(run.player.maxHp, run.player.hp);

    if (state.profile) {
      state.profile.relicCollection[relic.id] = nonNegInt(state.profile.relicCollection[relic.id], 0) + 1;
      state.profile.totals.relicsCollected += 1;
      saveProfile();
    }
  }

  function claimReward() {
    if (state.mode !== "reward" || state.rewardOptions.length === 0 || !state.run) {
      return;
    }

    state.mode = nextModeAfterRewardClaim({
      floor: state.run.floor,
      maxFloor: state.run.maxFloor,
      room: state.run.room,
      roomsPerFloor: state.run.roomsPerFloor,
    });
    state.run.shopPurchaseMade = false;
    state.selectionIndex = 0;
    state.shopStock = generateCampRelicDraftStockFor(state.rewardOptions);
    if (!state.shopStock.length) {
      state.shopStock = generateShopStockFor(3);
    }
    playUiSfx("confirm");
    setAnnouncement("Relics moved to camp. Spend chips to buy one.", 2);
    saveRunSnapshot();
  }

  function buyShopItem(index = state.selectionIndex) {
    if (state.mode !== "shop" || !state.run || state.shopStock.length === 0) {
      return;
    }

    const run = state.run;
    const targetIndex = clampNumber(index, 0, state.shopStock.length - 1, state.selectionIndex);
    state.selectionIndex = targetIndex;
    const item = state.shopStock[targetIndex];
    if (run.shopPurchaseMade) {
      playUiSfx("error");
      setAnnouncement("Only one purchase per camp.", 1.35);
      addLog("Camp allows one purchase only.");
      return;
    }
    if (!item || item.sold) {
      playUiSfx("error");
      return;
    }

    if (item.type === "relic" && state.shopStock.some((entry) => entry.type === "relic" && entry.sold)) {
      playUiSfx("error");
      addLog("Only one relic can be bought per camp.");
      setAnnouncement("Only one relic per camp visit.", 1.2);
      return;
    }

    if (run.player.gold < item.cost) {
      playUiSfx("error");
      addLog("Not enough chips.");
      setAnnouncement("Need more chips.", 1.2);
      saveRunSnapshot();
      return;
    }

    playUiSfx("coin");
    gainChips(-item.cost);
    spawnFloatText(`-${item.cost}`, width * 0.5, 646, "#ffd28a");

    if (item.type === "relic") {
      applyRelic(item.relic);
      addLog(`Bought ${item.relic.name}.`);
      addLog(passiveDescription(item.relic.description));
    } else {
      const heal = Math.min(10, run.player.maxHp - run.player.hp);
      run.player.hp += heal;
      addLog(`Patch Kit restores ${heal} HP.`);
      if (heal > 0) {
        spawnFloatText(`+${heal}`, width * 0.27, 541, "#8df0b2");
      }
    }

    item.sold = true;
    run.shopPurchaseMade = true;
    saveRunSnapshot();
  }

  function leaveShop() {
    if (state.mode !== "shop") {
      return;
    }
    const nextMode = nextModeAfterShopContinue();
    if (nextMode !== "playing") {
      return;
    }
    playUiSfx("confirm");
    addLog("Left camp.");
    beginEncounter();
  }

  function shopItemName(item) {
    if (!item || typeof item !== "object") {
      return "Unknown Item";
    }
    if (item.type === "relic") {
      return item.relic?.name || "Unknown Relic";
    }
    return item.name || "Patch Kit";
  }

  function shopItemDescription(item) {
    if (!item || typeof item !== "object") {
      return "";
    }
    if (item.type === "relic") {
      return passiveDescription(item.relic?.description || "");
    }
    return item.description || "";
  }

  return {
    relicRarityWeights: relicRarityWeightsFor,
    sampleRarity: sampleRarityFor,
    unlockedRelicPool: unlockedRelicPoolFor,
    sampleRelics: sampleRelicsFor,
    generateRewardOptions: generateRewardOptionsFor,
    generateCampRelicDraftStock: generateCampRelicDraftStockFor,
    generateShopStock: generateShopStockFor,
    applyRelic,
    claimReward,
    buyShopItem,
    leaveShop,
    shopItemName,
    shopItemDescription,
  };
}
