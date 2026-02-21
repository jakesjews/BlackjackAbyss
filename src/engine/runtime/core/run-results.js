export function updateProfileBest({ profile, run }) {
  if (!profile || !run) {
    return false;
  }
  profile.totals.bestFloor = Math.max(profile.totals.bestFloor, run.floor);
  profile.totals.bestRoom = Math.max(profile.totals.bestRoom, run.room);
  profile.totals.longestStreak = Math.max(
    profile.totals.longestStreak,
    run.maxStreak || 0,
    run.player?.streak || 0
  );
  return true;
}

export function finalizeRunIntoProfile({ profile, run, outcome, maxRunHistory, now = () => Date.now() }) {
  if (!profile || !run) {
    return false;
  }

  const totals = profile.totals;
  totals.runsCompleted += 1;
  if (outcome === "victory") {
    totals.runsWon += 1;
  } else {
    totals.runsLost += 1;
  }

  totals.enemiesDefeated += run.enemiesDefeated;
  totals.handsPlayed += run.totalHands;
  totals.damageDealt += run.player.totalDamageDealt;
  totals.damageTaken += run.player.totalDamageTaken;
  totals.chipsEarned += run.chipsEarnedRun || 0;
  totals.chipsSpent += run.chipsSpentRun || 0;
  totals.blackjacks += run.blackjacks || 0;
  totals.doublesWon += run.doublesWon || 0;
  totals.splitsUsed += run.splitsUsed || 0;
  totals.pushes += run.pushes || 0;
  updateProfileBest({ profile, run });

  profile.runs.unshift({
    at: now(),
    outcome,
    floor: run.floor,
    room: run.room,
    enemiesDefeated: run.enemiesDefeated,
    hands: run.totalHands,
    chips: run.player.gold,
  });
  if (profile.runs.length > maxRunHistory) {
    profile.runs.length = maxRunHistory;
  }
  return true;
}

export function applyChipDelta({ run, amount }) {
  if (!run || !Number.isFinite(amount) || amount === 0) {
    return false;
  }

  const rounded = Math.round(amount);
  run.player.gold = Math.max(0, run.player.gold + rounded);
  if (rounded > 0) {
    run.chipsEarnedRun = (run.chipsEarnedRun || 0) + rounded;
  } else {
    run.chipsSpentRun = (run.chipsSpentRun || 0) + Math.round(Math.abs(rounded));
  }
  return true;
}
