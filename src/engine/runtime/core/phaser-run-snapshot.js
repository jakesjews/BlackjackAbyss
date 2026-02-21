export function buildPhaserRunSnapshot({
  state,
  isEncounterIntroActive,
  canPlayerAct,
  canSplitCurrentHand,
  canAdvanceDeal,
  canDoubleDown,
  handTotal,
  visibleDealerTotal,
  buildTransitionSnapshot,
  getRunEventLog,
  passiveStacksForRun,
  relicRarityMeta,
  passiveDescription,
  passiveThumbUrl,
}) {
  if (state.mode !== "playing" || !state.run || !state.encounter) {
    return null;
  }
  const run = state.run;
  const encounter = state.encounter;
  const introActive = isEncounterIntroActive(encounter);
  const intro = encounter.intro || null;
  const introDialogue = typeof intro?.dialogue === "string" ? intro.dialogue : "";
  const visibleChars = Math.max(
    0,
    Math.min(
      introDialogue.length,
      Number.isFinite(intro?.visibleChars) ? Math.floor(intro.visibleChars) : introDialogue.length
    )
  );
  const canAct = canPlayerAct();
  const canDouble = canDoubleDown({
    canAct,
    encounter,
  });
  const logs = getRunEventLog(run).slice(-120);
  const passives = passiveStacksForRun(run).map((entry) => {
    const rarity = relicRarityMeta(entry.relic);
    return {
      id: entry.relic.id,
      name: entry.relic.name,
      description: passiveDescription(entry.relic.description),
      count: entry.count,
      thumbUrl: passiveThumbUrl(entry.relic),
      rarityLabel: rarity.label,
    };
  });
  const transition = buildTransitionSnapshot(state.pendingTransition);

  return {
    mode: state.mode,
    run: {
      floor: run.floor,
      room: run.room,
      roomsPerFloor: run.roomsPerFloor,
      chips: run.player?.gold || 0,
      streak: run.player?.streak || 0,
      bustGuardsLeft: run.player?.bustGuardsLeft || 0,
    },
    player: {
      hp: run.player?.hp || 0,
      maxHp: run.player?.maxHp || 1,
    },
    enemy: {
      name: encounter.enemy?.name || "Enemy",
      hp: encounter.enemy?.hp || 0,
      maxHp: encounter.enemy?.maxHp || 1,
      color: encounter.enemy?.color || "#a3be8d",
      type: encounter.enemy?.type || "normal",
      avatarKey: encounter.enemy?.avatarKey || "",
    },
    handIndex: Math.max(1, Number(encounter.handIndex) || 1),
    phase: encounter.phase,
    cards: {
      player: encounter.playerHand.map((card) => ({
        rank: card.rank,
        suit: card.suit,
        hidden: false,
        dealtAt: Number.isFinite(card.dealtAt) ? Math.floor(card.dealtAt) : 0,
      })),
      dealer: encounter.dealerHand.map((card, index) => ({
        rank: card.rank,
        suit: card.suit,
        hidden: Boolean(encounter.hideDealerHole && index === 1),
        dealtAt: Number.isFinite(card.dealtAt) ? Math.floor(card.dealtAt) : 0,
      })),
    },
    totals: {
      player: encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total,
      dealer:
        encounter.hideDealerHole && encounter.phase === "player"
          ? visibleDealerTotal(encounter)
          : handTotal(encounter.dealerHand).total,
    },
    resultText: encounter.resultText || "",
    resultTone: encounter.resultTone || "neutral",
    announcement: state.announcement || "",
    transition,
    intro: {
      active: introActive,
      ready: Boolean(intro?.ready),
      text: introDialogue.slice(0, visibleChars),
      fullText: introDialogue,
    },
    logs,
    passives,
    status: {
      canAct,
      canHit: canAct,
      canStand: canAct,
      canSplit: canSplitCurrentHand(),
      canDouble,
      canDeal: canAdvanceDeal(),
    },
  };
}
