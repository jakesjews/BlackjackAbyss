export function buildAvailableActions({
  state,
  hasSavedRun,
  isEncounterIntroActive,
  canAdvanceDeal,
  canPlayerAct,
  canDoubleDown,
  canSplitCurrentHand,
}) {
  if (state.mode === "menu") {
    return hasSavedRun()
      ? ["enter(start)", "r(resume)", "a(collections)"]
      : ["enter(start)", "a(collections)"];
  }
  if (state.mode === "collection") {
    return ["enter(back)", "space(back)", "a(back)"];
  }
  if (state.mode === "playing") {
    if (isEncounterIntroActive()) {
      return state.encounter?.intro?.ready
        ? ["enter(let's-go)", "space(let's-go)", "tap(let's-go)"]
        : ["wait(dialogue)"];
    }
    if (canAdvanceDeal()) {
      return ["enter(deal)", "tap(deal)"];
    }
    if (!canPlayerAct()) {
      return ["observe(result)"];
    }
    const canDouble = canDoubleDown({
      canAct: canPlayerAct(),
      encounter: state.encounter,
    });
    const canSplit = canSplitCurrentHand();
    const actions = ["z(hit)", "x(stand)"];
    if (canSplit) {
      actions.push("s(split)");
    }
    if (canDouble) {
      actions.push("c(double)");
    }
    return actions;
  }
  if (state.mode === "reward") {
    return ["left(prev)", "right(next)", "enter(claim)", "space(claim)"];
  }
  if (state.mode === "shop") {
    return ["left(prev)", "right(next)", "space(buy)", "enter(continue)"];
  }
  if (state.mode === "gameover" || state.mode === "victory") {
    return ["enter(restart)"];
  }
  return [];
}

export function buildRenderGameToTextPayload({
  state,
  availableActions,
  passiveSummary,
  cardToText,
  handTotal,
  visibleDealerTotal,
  canAdvanceDeal,
  nonNegInt,
  shopItemName,
  collectionEntries,
  hasSavedRun,
}) {
  const run = state.run;
  const encounter = state.encounter;

  return {
    coordSystem: "origin=(0,0) top-left on 1280x720 canvas, +x right, +y down",
    mode: state.mode,
    actions: availableActions(),
    run: run
      ? {
          floor: run.floor,
          room: run.room,
          maxFloor: run.maxFloor,
          roomsPerFloor: run.roomsPerFloor,
          playerHp: run.player.hp,
          playerMaxHp: run.player.maxHp,
          gold: run.player.gold,
          streak: run.player.streak,
          bustGuards: run.player.bustGuardsLeft,
          relics: run.player.relics,
          passiveSummary: passiveSummary(run),
        }
      : null,
    encounter: encounter
      ? {
          enemy: {
            name: encounter.enemy.name,
            type: encounter.enemy.type,
            hp: encounter.enemy.hp,
            maxHp: encounter.enemy.maxHp,
            attack: encounter.enemy.attack,
          },
          phase: encounter.phase,
          handIndex: encounter.handIndex,
          playerHand: encounter.playerHand.map(cardToText),
          dealerHand: encounter.dealerHand.map((card, idx) => {
            if (state.mode === "playing" && encounter.phase === "player" && encounter.hideDealerHole && idx === 1) {
              return "??";
            }
            return cardToText(card);
          }),
          playerTotal: encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total,
          dealerVisibleTotal: visibleDealerTotal(encounter),
          resultText: encounter.resultText,
          resultTone: encounter.resultTone || "neutral",
          nextDealReady: canAdvanceDeal(),
          doubleDown: encounter.doubleDown,
          splitQueueHands: Array.isArray(encounter.splitQueue) ? encounter.splitQueue.length : 0,
          splitUsed: Boolean(encounter.splitUsed),
          splitHandsTotal: Math.max(1, nonNegInt(encounter.splitHandsTotal, 1)),
          splitHandsResolved: Math.max(0, nonNegInt(encounter.splitHandsResolved, 0)),
          dealerResolved: Boolean(encounter.dealerResolved),
          introActive: Boolean(encounter.intro?.active),
          introReady: Boolean(encounter.intro?.ready),
          introText: encounter.intro?.dialogue || "",
        }
      : null,
    rewards:
      state.mode === "reward"
        ? state.rewardOptions.map((relic, idx) => ({
            index: idx,
            name: relic.name,
            selected: idx === state.selectionIndex,
          }))
        : [],
    shop:
      state.mode === "shop"
        ? state.shopStock.map((item, idx) => ({
            index: idx,
            name: shopItemName(item),
            cost: item.cost,
            sold: !!item.sold,
            selected: idx === state.selectionIndex,
          }))
        : [],
    collection:
      state.mode === "collection"
        ? (() => {
            const entries = collectionEntries();
            return {
              totalRelics: entries.length,
              unlockedRelics: entries.filter((entry) => entry.unlocked).length,
              discoveredRelics: entries.filter((entry) => entry.copies > 0).length,
            };
          })()
        : null,
    banner: state.announcement,
    hasSavedRun: hasSavedRun(),
    mobileControls: false,
    audio: {
      enabled: state.audio.enabled,
      started: state.audio.started,
      contextState: state.audio.context ? state.audio.context.state : "none",
    },
    profile: state.profile
      ? {
          runsStarted: state.profile.totals.runsStarted,
          runsWon: state.profile.totals.runsWon,
          enemiesDefeated: state.profile.totals.enemiesDefeated,
          relicsCollected: state.profile.totals.relicsCollected,
        }
      : null,
  };
}

export function renderGameToText(params) {
  return JSON.stringify(buildRenderGameToTextPayload(params));
}
