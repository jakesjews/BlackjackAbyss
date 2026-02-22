import { handTotal } from "../domain/combat.js";

export function createCombatResolution({
  state,
  nonNegInt,
  width,
  playOutcomeSfx,
  applyImpactDamage,
  spawnFloatText,
  gainChips,
  updateProfileBest,
  finalizeResolveState,
  addLog,
  triggerFlash,
  triggerScreenShake,
  spawnSparkBurst,
  random = Math.random,
}) {
  function resolveHand(
    outcome,
    pTotal = handTotal(state.encounter.playerHand).total,
    dTotal = handTotal(state.encounter.dealerHand).total
  ) {
    if (!state.run || !state.encounter) {
      return;
    }

    const run = state.run;
    const encounter = state.encounter;
    const enemy = encounter.enemy;
    const lowHpBonus = run.player.hp <= run.player.maxHp * 0.5 ? run.player.stats.lowHpDamage : 0;
    const streakBonus = Math.min(4, Math.floor(run.player.streak / 2));
    const firstHandBonus = encounter.handIndex === 1 ? run.player.stats.firstHandDamage : 0;

    let outgoing = 0;
    let incoming = 0;
    let text = "Push.";
    let resultTone = "push";
    const splitBonus = encounter.splitUsed ? run.player.stats.splitWinDamage : 0;
    const eliteBonus = enemy.type === "normal" ? 0 : run.player.stats.eliteDamage;

    if (outcome === "blackjack") {
      outgoing =
        12 +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        run.player.stats.blackjackBonusDamage +
        splitBonus +
        eliteBonus +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0);
      text = "Blackjack!";
      resultTone = "special";
      run.blackjacks = nonNegInt(run.blackjacks, 0) + 1;
    } else if (outcome === "dealer_bust") {
      outgoing =
        7 +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        run.player.stats.dealerBustBonusDamage +
        splitBonus +
        eliteBonus +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0) +
        (encounter.lastPlayerAction === "double" ? run.player.stats.doubleWinDamage : 0);
      text = "Dealer bust.";
      resultTone = "win";
    } else if (outcome === "player_win") {
      outgoing =
        4 +
        Math.max(0, pTotal - dTotal) +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        splitBonus +
        eliteBonus +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0) +
        (encounter.lastPlayerAction === "stand" ? run.player.stats.standWinDamage : 0) +
        (encounter.lastPlayerAction === "double" ? run.player.stats.doubleWinDamage : 0);
      text = "Win hand.";
      resultTone = "win";
    } else if (outcome === "dealer_blackjack") {
      incoming = enemy.attack + 3;
      text = "Dealer blackjack.";
      resultTone = "special";
    } else if (outcome === "dealer_win") {
      incoming = enemy.attack + Math.max(1, Math.floor((dTotal - pTotal) * 0.4));
      text = "Lose hand.";
      resultTone = "loss";
    } else if (outcome === "player_bust") {
      incoming = Math.max(1, enemy.attack + 1 - run.player.stats.bustBlock);
      text = "Bust.";
      resultTone = "loss";
    }

    if (outgoing > 0 && random() < run.player.stats.critChance) {
      outgoing *= 2;
      encounter.critTriggered = true;
      text = "CRIT!";
    }

    const playerLosingOutcome = outcome === "dealer_blackjack" || outcome === "dealer_win" || outcome === "player_bust";
    const enemyLosingOutcome = outcome === "blackjack" || outcome === "dealer_bust" || outcome === "player_win";

    if (playerLosingOutcome) {
      outgoing = 0;
    }
    if (enemyLosingOutcome) {
      incoming = 0;
    }

    if (incoming > 0) {
      incoming = Math.max(1, incoming - run.player.stats.block);
      if (encounter.lastPlayerAction === "double" && run.player.stats.doubleLossBlock > 0) {
        incoming = Math.max(1, incoming - run.player.stats.doubleLossBlock);
      }
    }

    playOutcomeSfx(outcome, outgoing, incoming);

    if (outgoing > 0) {
      const outgoingPayload = {
        target: "enemy",
        amount: outgoing,
        color: outcome === "blackjack" ? "#f8d37b" : "#ff916e",
        crit: encounter.critTriggered,
      };
      applyImpactDamage(outgoingPayload);
    }

    if (incoming > 0) {
      const incomingPayload = {
        target: "player",
        amount: incoming,
        color: "#ff86aa",
      };
      applyImpactDamage(incomingPayload);
    } else if (outgoing > 0) {
      run.player.streak += 1;
      run.maxStreak = Math.max(run.maxStreak || 0, run.player.streak);
      if (encounter.lastPlayerAction === "double") {
        run.doublesWon = nonNegInt(run.doublesWon, 0) + 1;
      }
      if (outcome === "blackjack" && run.player.stats.blackjackHeal > 0) {
        const blackjackHeal = Math.min(run.player.stats.blackjackHeal, run.player.maxHp - run.player.hp);
        if (blackjackHeal > 0) {
          run.player.hp += blackjackHeal;
          spawnFloatText(`+${blackjackHeal}`, width * 0.26, 514, "#8df0b2");
        }
      }
      if (run.player.stats.healOnWinHand > 0) {
        const heal = Math.min(run.player.stats.healOnWinHand, run.player.maxHp - run.player.hp);
        if (heal > 0) {
          run.player.hp += heal;
          spawnFloatText(`+${heal}`, width * 0.26, 540, "#8df0b2");
        }
      }
      if (run.player.stats.chipsOnWinHand > 0) {
        gainChips(run.player.stats.chipsOnWinHand);
        spawnFloatText(`+${run.player.stats.chipsOnWinHand}`, width * 0.5, 72, "#ffd687");
      }
    } else if (outcome === "push" && run.player.stats.chipsOnPush > 0) {
      run.pushes = nonNegInt(run.pushes, 0) + 1;
      gainChips(run.player.stats.chipsOnPush);
      spawnFloatText(`+${run.player.stats.chipsOnPush}`, width * 0.5, 72, "#ffd687");
      text = `Push +${run.player.stats.chipsOnPush} chips`;
    } else if (outcome === "push") {
      run.pushes = nonNegInt(run.pushes, 0) + 1;
    }

    if (encounter.critTriggered && outgoing > 0) {
      text = `CRIT -${outgoing} HP`;
      resultTone = "special";
    } else if (outgoing > 0) {
      text = `${text} -${outgoing} HP`;
      if (resultTone !== "special") {
        resultTone = "win";
      }
    } else if (incoming > 0) {
      text = `${text} -${incoming} HP`;
      resultTone = "loss";
    }

    if (encounter.bustGuardTriggered) {
      text = `${text} Guard!`;
    }

    if (encounter.critTriggered) {
      for (let i = 0; i < 6; i += 1) {
        const color = i % 2 === 0 ? "#ffd88d" : "#ff9a7d";
        const x = width * 0.64 + (random() * 2 - 1) * 76;
        const y = 150 + (random() * 2 - 1) * 48;
        spawnSparkBurst(x, y, color, 14 + i * 4, 230 + i * 18);
      }
      triggerFlash("#ffd88d", 0.14, 0.22);
      triggerScreenShake(9.6, 0.3);
    }
    if (outcome === "blackjack") {
      spawnSparkBurst(width * 0.5, 646, "#f8d37b", 28, 260);
      triggerScreenShake(8.5, 0.24);
    }

    encounter.resultText = text;
    encounter.resultTone = resultTone;
    state.announcement = "";
    state.announcementTimer = 0;
    state.announcementDuration = 0;
    addLog(text);
    run.totalHands += 1;
    encounter.resolvedHands = nonNegInt(encounter.resolvedHands, 0) + 1;
    updateProfileBest(run);
    finalizeResolveState();
  }

  return {
    resolveHand,
  };
}
