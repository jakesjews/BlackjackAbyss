export function createEncounterLifecycleHandlers({
  state,
  width,
  height,
  cardW,
  cardH,
  createDeckFn,
  shuffleFn,
  rankValueFn,
  computeHandLayoutFn,
  computeHandCardPositionFn,
  isExternalModeRenderingFn,
  playUiSfxFn,
  playDealSfxFn,
  spawnSparkBurstFn,
  isBlackjackFn,
  saveRunSnapshotFn,
  clampNumberFn,
  createEncounterFn,
  resolveDealerThenShowdownFn,
  spawnFloatTextFn,
  addLogFn,
  unlockAudioFn,
  saveProfileFn,
  createRunFn,
  applyTestEconomyToNewRunFn,
  clearSavedRunFn,
  resizeCanvasFn,
}) {
  function drawFromShoe(encounter) {
    if (encounter.shoe.length < 6) {
      if (encounter.discard.length > 0) {
        encounter.shoe = shuffleFn(encounter.discard.splice(0));
      } else {
        encounter.shoe = shuffleFn(createDeckFn(4));
      }
    }
    return encounter.shoe.pop();
  }

  function luckyCardUpgrade(encounter, target, card) {
    if (!state.run || target !== "player") {
      return card;
    }

    const luckyStart = state.run.player.stats.luckyStart;
    if (luckyStart <= 0 || encounter.playerHand.length >= luckyStart) {
      return card;
    }

    let upgraded = card;
    let attempts = 0;
    while (rankValueFn(upgraded.rank) < 8 && attempts < 7) {
      encounter.discard.push(upgraded);
      upgraded = drawFromShoe(encounter);
      attempts += 1;
    }
    return upgraded;
  }

  function handLayout(count, layoutScale = 1) {
    return computeHandLayoutFn({ count, layoutScale, cardW, cardH });
  }

  function handCardPosition(handType, index, count, layoutScale = 1) {
    return computeHandCardPositionFn({
      handType,
      index,
      count,
      layoutScale,
      cardW,
      cardH,
      width,
      portraitZoomed: Boolean(state.viewport?.portraitZoomed),
    });
  }

  function handBounds(handType, count, _unused = 0, layoutScale = 1) {
    const total = Math.max(1, Number(count) || 1);
    const first = handCardPosition(handType, 0, total, layoutScale);
    const last = handCardPosition(handType, total - 1, total, layoutScale);
    const minX = Math.min(first.x, last.x);
    const minY = Math.min(first.y, last.y);
    const maxX = Math.max(first.x + first.w, last.x + last.w);
    const maxY = Math.max(first.y + first.h, last.y + last.h);
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    return {
      x: minX,
      y: minY,
      w,
      h,
      centerX: minX + w * 0.5,
      centerY: minY + h * 0.5,
    };
  }

  function dealCard(encounter, target) {
    let card = drawFromShoe(encounter);
    card = luckyCardUpgrade(encounter, target, card);

    const hand = target === "player" ? encounter.playerHand : encounter.dealerHand;
    const spawnX = width * 0.5 - cardW * 0.5 + (target === "player" ? 64 : -64);
    const spawnY = target === "player" ? height - cardH - 30 : 30;
    hand.push({
      ...card,
      dealtAt: state.worldTime,
      fromX: spawnX,
      fromY: spawnY,
    });
    if (!isExternalModeRenderingFn("playing")) {
      playUiSfxFn("card");
    }

    const pos = handCardPosition(target, hand.length - 1, hand.length);
    state.cardBursts.push({
      x: pos.x + pos.w * 0.5,
      y: pos.y + pos.h * 0.5,
      color: target === "player" ? "#67ddff" : "#ffa562",
      life: 0.28,
      maxLife: 0.28,
    });
    spawnSparkBurstFn(pos.x + pos.w * 0.5, pos.y + pos.h * 0.5, target === "player" ? "#76e5ff" : "#ffbb84", 5, 88);
    playDealSfxFn(target);

    return hand[hand.length - 1];
  }

  function startHand() {
    const encounter = state.encounter;
    if (!encounter) {
      return;
    }

    encounter.playerHand = [];
    encounter.dealerHand = [];
    encounter.splitQueue = [];
    encounter.splitUsed = false;
    encounter.splitHandsTotal = 1;
    encounter.splitHandsResolved = 0;
    encounter.dealerResolved = false;
    encounter.hideDealerHole = !encounter.dealerResolved;
    encounter.phase = "player";
    encounter.resultText = "";
    encounter.resultTone = "neutral";
    encounter.resolveTimer = 0;
    encounter.nextDealPrompted = false;
    encounter.doubleDown = false;
    encounter.bustGuardTriggered = false;
    encounter.critTriggered = false;
    encounter.lastPlayerAction = "none";
    state.handTackles = [];
    state.handMessageAnchor = null;

    dealCard(encounter, "player");
    dealCard(encounter, "dealer");
    dealCard(encounter, "player");
    dealCard(encounter, "dealer");

    const playerNatural = isBlackjackFn(encounter.playerHand);
    const dealerNatural = isBlackjackFn(encounter.dealerHand);
    if (playerNatural || dealerNatural) {
      resolveDealerThenShowdownFn(true);
      return;
    }

    saveRunSnapshotFn();
  }

  function beginEncounter() {
    if (!state.run) {
      return;
    }

    state.mode = "playing";
    state.encounter = createEncounterFn(state.run);
    state.handTackles = [];
    state.combatLayout = null;
    state.handMessageAnchor = null;
    state.run.player.hp = clampNumberFn(state.run.player.hp, 0, state.run.player.maxHp, state.run.player.maxHp);
    state.pendingTransition = null;
    state.run.player.bustGuardsLeft = state.run.player.stats.bustGuardPerEncounter;
    if (state.run.player.stats.healOnEncounterStart > 0) {
      const heal = Math.min(state.run.player.stats.healOnEncounterStart, state.run.player.maxHp - state.run.player.hp);
      if (heal > 0) {
        state.run.player.hp += heal;
        spawnFloatTextFn(`+${heal}`, width * 0.26, 540, "#8df0b2");
        addLogFn(`Life Thread restores ${heal} HP.`);
      }
    }
    state.selectionIndex = 0;

    const enemy = state.encounter.enemy;
    state.announcement = "";
    state.announcementTimer = 0;
    state.announcementDuration = 0;
    addLogFn(`${enemy.name} enters the table.`);
    saveRunSnapshotFn();
  }

  function startRun() {
    unlockAudioFn();
    playUiSfxFn("confirm");
    if (state.profile) {
      state.profile.totals.runsStarted += 1;
      saveProfileFn();
    }
    state.autosaveTimer = 0;
    state.run = createRunFn();
    applyTestEconomyToNewRunFn(state.run);
    state.run.player.hp = state.run.player.maxHp;
    state.rewardOptions = [];
    state.shopStock = [];
    state.selectionIndex = 0;
    state.floatingTexts = [];
    state.cardBursts = [];
    state.sparkParticles = [];
    state.handTackles = [];
    state.flashOverlays = [];
    state.screenShakeTime = 0;
    state.screenShakeDuration = 0;
    state.screenShakePower = 0;
    state.pendingTransition = null;
    state.combatLayout = null;
    clearSavedRunFn();
    beginEncounter();
    resizeCanvasFn();
  }

  return {
    drawFromShoe,
    luckyCardUpgrade,
    handLayout,
    handCardPosition,
    handBounds,
    dealCard,
    startHand,
    beginEncounter,
    startRun,
  };
}
