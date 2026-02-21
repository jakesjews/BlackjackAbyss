function asNonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

export function createRun(defaultPlayerStatsFactory) {
  const createStats =
    typeof defaultPlayerStatsFactory === "function"
      ? defaultPlayerStatsFactory
      : () => ({});

  return {
    floor: 1,
    maxFloor: 3,
    room: 1,
    roomsPerFloor: 5,
    enemiesDefeated: 0,
    totalHands: 0,
    chipsEarnedRun: 0,
    chipsSpentRun: 0,
    maxStreak: 0,
    shopPurchaseMade: false,
    blackjacks: 0,
    doublesWon: 0,
    splitsUsed: 0,
    pushes: 0,
    player: {
      hp: 42,
      maxHp: 42,
      gold: 24,
      streak: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      bustGuardsLeft: 0,
      relics: {},
      stats: createStats(),
    },
    log: [],
    eventLog: [],
  };
}

export function applyTestEconomyToNewRun({ run, runtimeTestFlags, addLog }) {
  if (!run || !run.player || !runtimeTestFlags?.economy) {
    return;
  }
  const seededGold = Math.max(0, asNonNegativeInt(runtimeTestFlags.economy.startingGold, 0));
  if (seededGold <= 0) {
    return;
  }
  if (run.player.gold >= seededGold) {
    return;
  }
  run.player.gold = seededGold;
  if (typeof addLog === "function") {
    addLog(`Test mode seeded chips: ${seededGold}.`);
  }
}
