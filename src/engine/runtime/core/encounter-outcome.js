export function createEncounterOutcomeHandlers({
  state,
  width,
  gainChips,
  spawnFloatText,
  spawnSparkBurst,
  triggerScreenShake,
  triggerFlash,
  playUiSfx,
  addLog,
  finalizeRun,
  setAnnouncement,
  generateRewardOptions,
  generateCampRelicDraftStock,
  generateShopStock,
  saveRunSnapshot,
}) {
  function onEncounterWin() {
    if (!state.run || !state.encounter) {
      return;
    }

    const run = state.run;
    const encounter = state.encounter;
    const enemy = encounter.enemy;

    run.enemiesDefeated += 1;
    const payout = Math.round(enemy.goldDrop * run.player.stats.goldMultiplier) + Math.min(6, run.player.streak);
    gainChips(payout);
    spawnFloatText(`+${payout} chips`, width * 0.5, 72, "#ffd687");
    spawnSparkBurst(width * 0.5, 96, "#ffd687", 34, 280);
    triggerScreenShake(7, 0.2);
    triggerFlash("#ffd687", 0.09, 0.2);
    playUiSfx("coin");
    addLog(`${enemy.name} defeated. +${payout} chips.`);

    encounter.phase = "done";

    if (enemy.type === "boss") {
      if (run.floor >= run.maxFloor) {
        finalizeRun("victory");
        state.mode = "victory";
        setAnnouncement("The House collapses.", 2.8);
        return;
      }

      run.floor += 1;
      run.room = 1;
      const heal = 8;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + heal);
      state.rewardOptions = generateRewardOptions(3, true);
      state.mode = "shop";
      run.shopPurchaseMade = false;
      state.selectionIndex = 0;
      state.shopStock = generateCampRelicDraftStock(state.rewardOptions);
      if (!state.shopStock.length) {
        state.shopStock = generateShopStock(3);
      }
      setAnnouncement(`Floor cleared. Restored ${heal} HP. Camp opened.`, 2.4);
      saveRunSnapshot();
      return;
    }

    run.room += 1;

    if (run.room % 2 === 0) {
      state.mode = "shop";
      run.shopPurchaseMade = false;
      state.selectionIndex = 0;
      state.rewardOptions = generateRewardOptions(3, false);
      state.shopStock = generateCampRelicDraftStock(state.rewardOptions);
      if (!state.shopStock.length) {
        state.shopStock = generateShopStock(3);
      }
      setAnnouncement("Relics are available at camp.", 2);
    } else {
      state.mode = "shop";
      run.shopPurchaseMade = false;
      state.selectionIndex = 0;
      state.rewardOptions = [];
      state.shopStock = generateShopStock(3);
      setAnnouncement("Camp opened.", 2);
    }
    saveRunSnapshot();
  }

  return {
    onEncounterWin,
  };
}
