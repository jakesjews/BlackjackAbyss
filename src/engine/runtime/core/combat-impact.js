export function createCombatImpactHandlers({
  state,
  width,
  height,
  startDefeatTransitionFn,
  setAnnouncementFn,
  addLogFn,
  saveRunSnapshotFn,
  queueEnemyDefeatTransitionFn,
  damageFloatAnchorFn,
  spawnFloatTextFn,
}) {
  function finalizeResolveState() {
    if (!state.run || !state.encounter || state.pendingTransition) {
      return;
    }

    const run = state.run;
    const encounter = state.encounter;
    const enemy = encounter.enemy;
    if (!enemy) {
      return;
    }

    if (run.player.hp <= 0) {
      startDefeatTransitionFn("player");
      setAnnouncementFn("You were defeated.", 1.2);
      addLogFn("You were defeated.");
      saveRunSnapshotFn();
      return;
    }

    if (enemy.hp <= 0) {
      queueEnemyDefeatTransitionFn();
      setAnnouncementFn(`${enemy.name} down!`, 1.2);
      addLogFn(`${enemy.name} is down.`);
      saveRunSnapshotFn();
      return;
    }

    encounter.phase = "resolve";
    encounter.nextDealPrompted = false;
    encounter.resolveTimer = 0;
    saveRunSnapshotFn();
  }

  function applyImpactDamage(payload) {
    if (!payload || !state.run || !state.encounter || !state.encounter.enemy) {
      return;
    }

    const amount = Math.max(1, Number(payload.amount) || 1);
    const run = state.run;
    const enemy = state.encounter.enemy;
    const anchor = damageFloatAnchorFn(payload.target, width, height);

    if (payload.target === "enemy") {
      enemy.hp = Math.max(0, enemy.hp - amount);
      run.player.totalDamageDealt += amount;
      if (payload.crit) {
        spawnFloatTextFn(`CRIT -${amount}`, anchor.x, anchor.y, "#ffe4a8", {
          size: 58,
          life: 1.45,
          vy: 9,
          weight: 800,
          jitter: true,
          glow: "#ffb86a",
        });
      } else {
        spawnFloatTextFn(`-${amount}`, anchor.x, anchor.y, payload.color || "#ff916e");
      }
    } else if (payload.target === "player") {
      run.player.hp = Math.max(0, run.player.hp - amount);
      run.player.totalDamageTaken += amount;
      run.player.streak = 0;
      spawnFloatTextFn(`-${amount}`, anchor.x, anchor.y, payload.color || "#ff86aa");
    }

    finalizeResolveState();
  }

  return {
    finalizeResolveState,
    applyImpactDamage,
  };
}
