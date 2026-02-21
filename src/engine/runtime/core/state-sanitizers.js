export function sanitizeCard(cardLike, { ranks, suits }) {
  if (!cardLike || typeof cardLike !== "object") {
    return null;
  }
  if (!ranks.includes(cardLike.rank) || !suits.includes(cardLike.suit)) {
    return null;
  }
  return { rank: cardLike.rank, suit: cardLike.suit };
}

export function sanitizeCardList(listLike, { ranks, suits }) {
  if (!Array.isArray(listLike)) {
    return [];
  }
  return listLike
    .map((item) => sanitizeCard(item, { ranks, suits }))
    .filter(Boolean);
}

export function sanitizeRun({
  runLike,
  createRun,
  nonNegInt,
  clampNumber,
  mergePlayerStats,
}) {
  if (!runLike || typeof runLike !== "object") {
    return null;
  }

  const run = createRun();
  run.floor = nonNegInt(runLike.floor, run.floor) || 1;
  run.maxFloor = nonNegInt(runLike.maxFloor, run.maxFloor) || run.maxFloor;
  run.room = Math.max(1, nonNegInt(runLike.room, run.room));
  run.roomsPerFloor = Math.max(3, nonNegInt(runLike.roomsPerFloor, run.roomsPerFloor));
  run.enemiesDefeated = nonNegInt(runLike.enemiesDefeated, 0);
  run.totalHands = nonNegInt(runLike.totalHands, 0);
  run.chipsEarnedRun = nonNegInt(runLike.chipsEarnedRun, 0);
  run.chipsSpentRun = nonNegInt(runLike.chipsSpentRun, 0);
  run.maxStreak = nonNegInt(runLike.maxStreak, 0);
  run.shopPurchaseMade = Boolean(runLike.shopPurchaseMade);
  run.blackjacks = nonNegInt(runLike.blackjacks, 0);
  run.doublesWon = nonNegInt(runLike.doublesWon, 0);
  run.splitsUsed = nonNegInt(runLike.splitsUsed, 0);
  run.pushes = nonNegInt(runLike.pushes, 0);

  const player = runLike.player && typeof runLike.player === "object" ? runLike.player : {};
  run.player.maxHp = Math.max(10, nonNegInt(player.maxHp, run.player.maxHp));
  run.player.hp = clampNumber(player.hp, 0, run.player.maxHp, run.player.maxHp);
  run.player.gold = nonNegInt(player.gold, run.player.gold);
  run.player.streak = nonNegInt(player.streak, 0);
  run.player.totalDamageDealt = nonNegInt(player.totalDamageDealt, 0);
  run.player.totalDamageTaken = nonNegInt(player.totalDamageTaken, 0);
  run.player.bustGuardsLeft = nonNegInt(player.bustGuardsLeft, 0);
  run.player.stats = mergePlayerStats(player.stats);
  run.player.relics = {};

  if (player.relics && typeof player.relics === "object") {
    for (const [id, count] of Object.entries(player.relics)) {
      if (typeof id === "string" && id.length > 0) {
        run.player.relics[id] = nonNegInt(count, 0);
      }
    }
  }

  if (Array.isArray(runLike.log)) {
    run.log = runLike.log
      .slice(0, 6)
      .map((entry) => ({
        message: String(entry?.message || ""),
        ttl: clampNumber(entry?.ttl, 0, 30, 8),
      }))
      .filter((entry) => entry.message.length > 0);
  }
  if (Array.isArray(runLike.eventLog)) {
    run.eventLog = runLike.eventLog
      .slice(0, 240)
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }

  run.maxStreak = Math.max(run.maxStreak, run.player.streak);
  return run;
}

export function sanitizeEncounter({
  encounterLike,
  run,
  resolveRoomType,
  createEnemy,
  createEncounterIntroState,
  sanitizeCardListFn,
  maxSplitHands,
  nonNegInt,
  clampNumber,
}) {
  if (!encounterLike || typeof encounterLike !== "object" || !run) {
    return null;
  }

  const type = ["normal", "elite", "boss"].includes(encounterLike?.enemy?.type)
    ? encounterLike.enemy.type
    : resolveRoomType(run.room, run.roomsPerFloor);

  const enemyBase = createEnemy(run.floor, run.room, type);
  const enemyLike = encounterLike.enemy && typeof encounterLike.enemy === "object" ? encounterLike.enemy : {};
  const enemy = {
    ...enemyBase,
    name: typeof enemyLike.name === "string" && enemyLike.name.length > 0 ? enemyLike.name : enemyBase.name,
    hp: clampNumber(enemyLike.hp, 0, 9999, enemyBase.hp),
    maxHp: Math.max(1, nonNegInt(enemyLike.maxHp, enemyBase.maxHp)),
    attack: Math.max(1, nonNegInt(enemyLike.attack, enemyBase.attack)),
  };
  enemy.hp = Math.min(enemy.hp, enemy.maxHp);

  const splitQueue = Array.isArray(encounterLike.splitQueue)
    ? encounterLike.splitQueue
        .map((hand) => sanitizeCardListFn(hand))
        .filter((hand) => hand.length > 0)
        .slice(0, maxSplitHands - 1)
    : [];

  const splitHandsTotalDefault = Math.max(1, Math.min(maxSplitHands, 1 + splitQueue.length));
  const splitHandsTotal = Math.max(
    splitHandsTotalDefault,
    Math.min(maxSplitHands, nonNegInt(encounterLike.splitHandsTotal, splitHandsTotalDefault))
  );
  const splitHandsResolved = Math.min(
    Math.max(0, nonNegInt(encounterLike.splitHandsResolved, 0)),
    Math.max(0, splitHandsTotal - 1)
  );

  const introLike = encounterLike.intro && typeof encounterLike.intro === "object" ? encounterLike.intro : null;
  const introState =
    introLike && introLike.active
      ? createEncounterIntroState(enemy, {
          ...introLike,
          active: true,
        })
      : null;

  return {
    enemy,
    shoe: sanitizeCardListFn(encounterLike.shoe),
    discard: sanitizeCardListFn(encounterLike.discard),
    playerHand: sanitizeCardListFn(encounterLike.playerHand),
    dealerHand: sanitizeCardListFn(encounterLike.dealerHand),
    splitQueue,
    splitUsed: Boolean(encounterLike.splitUsed),
    splitHandsTotal,
    splitHandsResolved,
    dealerResolved: Boolean(encounterLike.dealerResolved),
    hideDealerHole: Boolean(encounterLike.hideDealerHole),
    phase: ["player", "dealer", "resolve", "done"].includes(encounterLike.phase) ? encounterLike.phase : "player",
    resultText: typeof encounterLike.resultText === "string" ? encounterLike.resultText : "",
    resultTone: ["neutral", "win", "loss", "push", "special"].includes(encounterLike.resultTone)
      ? encounterLike.resultTone
      : "neutral",
    resolveTimer: clampNumber(encounterLike.resolveTimer, 0, 10, 0),
    handIndex: Math.max(1, nonNegInt(encounterLike.handIndex, 1)),
    resolvedHands: Math.max(0, nonNegInt(encounterLike.resolvedHands, 0)),
    doubleDown: Boolean(encounterLike.doubleDown),
    bustGuardTriggered: Boolean(encounterLike.bustGuardTriggered),
    critTriggered: Boolean(encounterLike.critTriggered),
    lastPlayerAction: ["hit", "stand", "double", "split", "none"].includes(encounterLike.lastPlayerAction)
      ? encounterLike.lastPlayerAction
      : "none",
    intro: introState,
  };
}
