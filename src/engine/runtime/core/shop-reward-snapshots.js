export function buildPhaserRewardSnapshot({
  state,
  passiveDescription,
  passiveThumbUrl,
  relicRarityMeta,
  normalizeRelicRarity,
  getRunEventLog,
}) {
  if (state.mode !== "reward") {
    return null;
  }
  const run = state.run || null;
  const options = state.rewardOptions.map((relic, index) => {
    const rarity = relicRarityMeta(relic);
    return {
      id: relic.id,
      name: relic.name,
      description: passiveDescription(relic.description),
      rarity: normalizeRelicRarity(relic.rarity),
      rarityLabel: rarity.label,
      color: relic.color || rarity.glow || "#c8d7a1",
      thumbUrl: passiveThumbUrl(relic),
      selected: index === state.selectionIndex,
    };
  });

  return {
    mode: state.mode,
    run: {
      floor: run?.floor || 1,
      room: run?.room || 1,
      roomsPerFloor: run?.roomsPerFloor || 5,
      chips: run?.player?.gold || 0,
    },
    options,
    selectionIndex: state.selectionIndex,
    canClaim: options.length > 0,
    logs: getRunEventLog(run).slice(-120),
  };
}

export function buildPhaserShopSnapshot({
  state,
  nonNegInt,
  clampNumber,
  shopItemName,
  shopItemDescription,
  getRunEventLog,
}) {
  if (state.mode !== "shop") {
    return null;
  }
  const run = state.run || null;
  const purchaseLocked = Boolean(run?.shopPurchaseMade);
  const items = state.shopStock.map((item, index) => {
    const idBase = item.type === "relic" ? item.relic?.id || "relic" : item.id || "service";
    const affordable = Boolean(run && run.player && run.player.gold >= item.cost);
    const sold = Boolean(item.sold);
    return {
      id: `${idBase}-${index}`,
      name: shopItemName(item),
      description: shopItemDescription(item),
      type: item.type === "relic" ? "RELIC" : "SERVICE",
      cost: nonNegInt(item.cost, 0),
      sold,
      selected: index === state.selectionIndex,
      canBuy: !purchaseLocked && !sold && affordable,
    };
  });

  let canBuySelected = false;
  if (run && state.shopStock.length > 0) {
    const selectedIndex = clampNumber(state.selectionIndex, 0, state.shopStock.length - 1, 0);
    const selectedItem = state.shopStock[selectedIndex];
    canBuySelected = Boolean(
      selectedItem &&
        !selectedItem.sold &&
        !purchaseLocked &&
        Number(run.player?.gold || 0) >= Number(selectedItem.cost || 0)
    );
  }

  return {
    mode: state.mode,
    run: {
      floor: run?.floor || 1,
      room: run?.room || 1,
      roomsPerFloor: run?.roomsPerFloor || 5,
      chips: run?.player?.gold || 0,
      streak: run?.player?.streak || 0,
      bustGuardsLeft: run?.player?.bustGuardsLeft || 0,
      hp: run?.player?.hp || 0,
      maxHp: run?.player?.maxHp || 1,
      shopPurchaseMade: purchaseLocked,
    },
    items,
    selectionIndex: state.selectionIndex,
    canBuySelected,
    canContinue: true,
    logs: getRunEventLog(run).slice(-120),
  };
}
