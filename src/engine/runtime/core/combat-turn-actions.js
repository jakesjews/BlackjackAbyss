import { canSplitHand, handTotal, isBlackjack, resolveShowdownOutcome } from "../domain/combat.js";

export function createCombatTurnActions({
  state,
  maxSplitHands,
  nonNegInt,
  isEncounterIntroActive,
  playUiSfx,
  playActionSfx,
  addLog,
  dealCard,
  setAnnouncement,
  startHand,
  saveRunSnapshot,
  resolveHand,
}) {
  function canPlayerAct() {
    return (
      state.mode === "playing" &&
      Boolean(state.encounter) &&
      state.encounter.phase === "player" &&
      state.encounter.resolveTimer <= 0 &&
      !isEncounterIntroActive(state.encounter)
    );
  }

  function canAdvanceDeal() {
    return (
      state.mode === "playing" &&
      Boolean(state.encounter) &&
      state.encounter.phase === "resolve" &&
      !state.pendingTransition &&
      state.encounter.resolveTimer <= 0 &&
      state.handTackles.length === 0 &&
      !isEncounterIntroActive(state.encounter)
    );
  }

  function advanceToNextDeal() {
    if (!canAdvanceDeal() || !state.encounter) {
      playUiSfx("error");
      return false;
    }
    const encounter = state.encounter;
    encounter.handIndex += 1;
    encounter.nextDealPrompted = false;
    if (!beginQueuedSplitHand(encounter)) {
      startHand();
    }
    saveRunSnapshot();
    return true;
  }

  function activeSplitHandCount(encounter) {
    if (!encounter || !Array.isArray(encounter.splitQueue)) {
      return 1;
    }
    return 1 + encounter.splitQueue.length;
  }

  function canSplitCurrentHand() {
    return canSplitHand({
      canAct: canPlayerAct(),
      encounter: state.encounter,
      maxSplitHands,
    });
  }

  function tryActivateBustGuard(encounter) {
    if (!state.run || state.run.player.bustGuardsLeft <= 0) {
      return false;
    }

    state.run.player.bustGuardsLeft -= 1;
    encounter.bustGuardTriggered = true;
    encounter.resultText = "Bust Guard transforms your bust into 21.";
    addLog("Bust guard triggered.");
    return true;
  }

  function hitAction() {
    if (!canPlayerAct()) {
      return;
    }

    playActionSfx("hit");
    addLog("Hit.");
    const encounter = state.encounter;
    encounter.lastPlayerAction = "hit";
    dealCard(encounter, "player");
    const total = handTotal(encounter.playerHand).total;

    if (total > 21 && !tryActivateBustGuard(encounter)) {
      resolveHand("player_bust");
      return;
    }

    if (total >= 21 || encounter.bustGuardTriggered) {
      resolveDealerThenShowdown(false);
    }
  }

  function standAction() {
    if (!canPlayerAct()) {
      return;
    }
    playActionSfx("stand");
    addLog("Stand.");
    state.encounter.lastPlayerAction = "stand";
    resolveDealerThenShowdown(false);
  }

  function doubleAction() {
    if (!canPlayerAct()) {
      return;
    }

    const encounter = state.encounter;
    if (encounter.doubleDown || encounter.splitUsed || encounter.playerHand.length !== 2) {
      playUiSfx("error");
      return;
    }

    playActionSfx("double");
    addLog("Double down.");
    encounter.doubleDown = true;
    encounter.lastPlayerAction = "double";
    dealCard(encounter, "player");
    const total = handTotal(encounter.playerHand).total;

    if (total > 21 && !tryActivateBustGuard(encounter)) {
      resolveHand("player_bust");
      return;
    }

    resolveDealerThenShowdown(false);
  }

  function startSplitHand(encounter, seedHand, announcementText, announcementDuration = 1.1) {
    if (!encounter || !Array.isArray(seedHand) || seedHand.length === 0) {
      return false;
    }

    encounter.playerHand = seedHand.map((card) => ({ rank: card.rank, suit: card.suit }));
    encounter.dealerHand = [];
    encounter.dealerResolved = false;
    encounter.hideDealerHole = true;
    encounter.phase = "player";
    encounter.resultText = "";
    encounter.resultTone = "neutral";
    encounter.resolveTimer = 0;
    encounter.nextDealPrompted = false;
    encounter.doubleDown = false;
    encounter.bustGuardTriggered = false;
    encounter.critTriggered = false;
    encounter.lastPlayerAction = "split";
    dealCard(encounter, "dealer");
    dealCard(encounter, "player");
    dealCard(encounter, "dealer");

    if (announcementText) {
      setAnnouncement(announcementText, announcementDuration);
    }

    const playerNatural = isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);
    if (playerNatural || dealerNatural) {
      resolveDealerThenShowdown(true);
      return true;
    }

    const total = handTotal(encounter.playerHand).total;
    if (total > 21 && !tryActivateBustGuard(encounter)) {
      resolveHand("player_bust");
      return true;
    }
    if (total >= 21 || encounter.bustGuardTriggered) {
      resolveDealerThenShowdown(false);
      return true;
    }
    if (isBlackjack(encounter.dealerHand)) {
      resolveDealerThenShowdown(true);
    }

    return true;
  }

  function beginQueuedSplitHand(encounter) {
    if (!encounter || !Array.isArray(encounter.splitQueue) || encounter.splitQueue.length === 0) {
      return false;
    }

    const seedHand = encounter.splitQueue.shift();
    encounter.splitHandsResolved = Math.min(
      Math.max(0, encounter.splitHandsTotal - 1),
      nonNegInt(encounter.splitHandsResolved, 0) + 1
    );
    const splitIndex = encounter.splitHandsResolved + 1;
    const splitTotal = Math.max(2, nonNegInt(encounter.splitHandsTotal, 2));
    return startSplitHand(encounter, seedHand, `Split hand ${splitIndex}/${splitTotal}.`);
  }

  function splitAction() {
    if (!canSplitCurrentHand()) {
      playUiSfx("error");
      return;
    }

    const encounter = state.encounter;
    const [first, second] = encounter.playerHand;
    if (state.run) {
      state.run.splitsUsed = nonNegInt(state.run.splitsUsed, 0) + 1;
    }
    if (!Array.isArray(encounter.splitQueue)) {
      encounter.splitQueue = [];
    }
    encounter.splitQueue.unshift([{ rank: second.rank, suit: second.suit }]);
    encounter.splitUsed = true;
    encounter.splitHandsTotal = Math.min(maxSplitHands, nonNegInt(encounter.splitHandsTotal, 1) + 1);
    encounter.doubleDown = false;

    playActionSfx("double");
    addLog("Hand split.");
    addLog("Each split hand gets a fresh dealer.");
    const splitIndex = nonNegInt(encounter.splitHandsResolved, 0) + 1;
    const splitTotal = Math.max(2, nonNegInt(encounter.splitHandsTotal, 2));
    if (
      !startSplitHand(
        encounter,
        [{ rank: first.rank, suit: first.suit }],
        `Hand split. Play split hand ${splitIndex}/${splitTotal}.`,
        1.2
      )
    ) {
      playUiSfx("error");
    }
  }

  function resolveDealerThenShowdown(naturalCheck) {
    const encounter = state.encounter;
    if (!encounter || encounter.phase === "done") {
      return;
    }

    encounter.phase = "dealer";
    encounter.hideDealerHole = false;
    const dealerAlreadyResolved = Boolean(encounter.dealerResolved);

    if (!naturalCheck && !dealerAlreadyResolved) {
      while (handTotal(encounter.dealerHand).total < 17) {
        dealCard(encounter, "dealer");
      }
      if (encounter.splitUsed) {
        encounter.dealerResolved = true;
      }
    } else if (encounter.splitUsed && isBlackjack(encounter.dealerHand)) {
      encounter.dealerResolved = true;
    }

    const pTotal = encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total;
    const dTotal = handTotal(encounter.dealerHand).total;
    const playerNatural = !encounter.bustGuardTriggered && isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);

    const outcome = resolveShowdownOutcome({
      playerTotal: pTotal,
      dealerTotal: dTotal,
      playerNatural,
      dealerNatural,
    });

    resolveHand(outcome, pTotal, dTotal);
  }

  return {
    canPlayerAct,
    canAdvanceDeal,
    advanceToNextDeal,
    activeSplitHandCount,
    canSplitCurrentHand,
    tryActivateBustGuard,
    hitAction,
    standAction,
    doubleAction,
    startSplitHand,
    beginQueuedSplitHand,
    splitAction,
    resolveDealerThenShowdown,
  };
}
