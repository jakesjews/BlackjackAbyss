import { describe, expect, it, vi } from "vitest";
import { createCombatResolution } from "../core/combat-resolution.js";

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

function createState(overrides = {}) {
  return {
    announcement: "pending",
    announcementTimer: 1,
    announcementDuration: 1,
    run: {
      totalHands: 0,
      blackjacks: 0,
      pushes: 0,
      doublesWon: 0,
      maxStreak: 0,
      player: {
        hp: 30,
        maxHp: 40,
        streak: 0,
        stats: {
          lowHpDamage: 0,
          firstHandDamage: 0,
          flatDamage: 0,
          blackjackBonusDamage: 0,
          splitWinDamage: 0,
          eliteDamage: 0,
          dealerBustBonusDamage: 0,
          doubleWinDamage: 0,
          standWinDamage: 0,
          bustBlock: 0,
          critChance: 0,
          block: 0,
          doubleLossBlock: 0,
          blackjackHeal: 0,
          healOnWinHand: 0,
          chipsOnWinHand: 0,
          chipsOnPush: 0,
        },
      },
    },
    encounter: {
      enemy: { type: "normal", attack: 8 },
      playerHand: [
        { rank: "10", suit: "S" },
        { rank: "7", suit: "D" },
      ],
      dealerHand: [
        { rank: "10", suit: "H" },
        { rank: "8", suit: "C" },
      ],
      splitUsed: false,
      doubleDown: false,
      handIndex: 1,
      lastPlayerAction: "stand",
      bustGuardTriggered: false,
      critTriggered: false,
      resolvedHands: 0,
      resultText: "",
      resultTone: "neutral",
    },
    ...overrides,
  };
}

function createResolution(state, overrides = {}) {
  const playOutcomeSfx = overrides.playOutcomeSfx || vi.fn();
  const triggerHandTackle = overrides.triggerHandTackle || vi.fn(() => false);
  const applyImpactDamage = overrides.applyImpactDamage || vi.fn();
  const triggerImpactBurst = overrides.triggerImpactBurst || vi.fn();
  const spawnFloatText = overrides.spawnFloatText || vi.fn();
  const gainChips = overrides.gainChips || vi.fn();
  const updateProfileBest = overrides.updateProfileBest || vi.fn();
  const finalizeResolveState = overrides.finalizeResolveState || vi.fn();
  const addLog = overrides.addLog || vi.fn();
  const triggerFlash = overrides.triggerFlash || vi.fn();
  const triggerScreenShake = overrides.triggerScreenShake || vi.fn();
  const spawnSparkBurst = overrides.spawnSparkBurst || vi.fn();
  const isExternalModeRendering = overrides.isExternalModeRendering || (() => false);
  const random = overrides.random || (() => 0.9);

  const resolution = createCombatResolution({
    state,
    nonNegInt,
    width: 1280,
    isExternalModeRendering,
    playOutcomeSfx,
    triggerHandTackle,
    applyImpactDamage,
    triggerImpactBurst,
    spawnFloatText,
    gainChips,
    updateProfileBest,
    finalizeResolveState,
    addLog,
    triggerFlash,
    triggerScreenShake,
    spawnSparkBurst,
    random,
  });

  return {
    resolution,
    playOutcomeSfx,
    triggerHandTackle,
    applyImpactDamage,
    triggerImpactBurst,
    spawnFloatText,
    gainChips,
    updateProfileBest,
    finalizeResolveState,
    addLog,
    triggerFlash,
    triggerScreenShake,
    spawnSparkBurst,
  };
}

describe("combat resolution", () => {
  it("settles player win damage and streak progression", () => {
    const state = createState({
      encounter: {
        ...createState().encounter,
        lastPlayerAction: "stand",
      },
      run: {
        ...createState().run,
        player: {
          ...createState().run.player,
          stats: {
            ...createState().run.player.stats,
            standWinDamage: 1,
          },
        },
      },
    });
    const {
      resolution,
      playOutcomeSfx,
      applyImpactDamage,
      triggerImpactBurst,
      finalizeResolveState,
      updateProfileBest,
      addLog,
    } = createResolution(state);

    resolution.resolveHand("player_win", 20, 18);

    expect(playOutcomeSfx).toHaveBeenCalledWith("player_win", 7, 0);
    expect(applyImpactDamage).toHaveBeenCalledWith({
      target: "enemy",
      amount: 7,
      color: "#ff916e",
      crit: false,
    });
    expect(triggerImpactBurst).toHaveBeenCalledWith("enemy", 7, "#ff916e");
    expect(state.run.player.streak).toBe(1);
    expect(state.run.maxStreak).toBe(1);
    expect(state.run.totalHands).toBe(1);
    expect(state.encounter.resolvedHands).toBe(1);
    expect(state.encounter.resultText).toContain("-7 HP");
    expect(addLog).toHaveBeenCalledWith(state.encounter.resultText);
    expect(updateProfileBest).toHaveBeenCalledWith(state.run);
    expect(finalizeResolveState).toHaveBeenCalledTimes(1);
  });

  it("grants push chip rewards when configured", () => {
    const state = createState({
      run: {
        ...createState().run,
        player: {
          ...createState().run.player,
          stats: {
            ...createState().run.player.stats,
            chipsOnPush: 3,
          },
        },
      },
    });
    const { resolution, gainChips, spawnFloatText, playOutcomeSfx, applyImpactDamage } = createResolution(state);

    resolution.resolveHand("push", 17, 17);

    expect(playOutcomeSfx).toHaveBeenCalledWith("push", 0, 0);
    expect(gainChips).toHaveBeenCalledWith(3);
    expect(spawnFloatText).toHaveBeenCalledWith("+3", 640, 72, "#ffd687");
    expect(state.run.pushes).toBe(1);
    expect(state.encounter.resultText).toBe("Push +3 chips");
    expect(applyImpactDamage).not.toHaveBeenCalled();
  });

  it("applies incoming damage with block modifiers on losses", () => {
    const state = createState({
      encounter: {
        ...createState().encounter,
        lastPlayerAction: "double",
      },
      run: {
        ...createState().run,
        player: {
          ...createState().run.player,
          stats: {
            ...createState().run.player.stats,
            block: 2,
            doubleLossBlock: 1,
          },
        },
      },
    });
    const { resolution, playOutcomeSfx, applyImpactDamage } = createResolution(state);

    resolution.resolveHand("dealer_win", 17, 20);

    expect(playOutcomeSfx).toHaveBeenCalledWith("dealer_win", 0, 6);
    expect(applyImpactDamage).toHaveBeenCalledWith({
      target: "player",
      amount: 6,
      color: "#ff86aa",
    });
    expect(state.encounter.resultText).toContain("-6 HP");
  });

  it("handles crit blackjack with special effects", () => {
    const state = createState({
      run: {
        ...createState().run,
        player: {
          ...createState().run.player,
          hp: 35,
          stats: {
            ...createState().run.player.stats,
            critChance: 1,
            blackjackHeal: 2,
          },
        },
      },
    });
    const {
      resolution,
      playOutcomeSfx,
      applyImpactDamage,
      triggerFlash,
      triggerScreenShake,
      spawnSparkBurst,
      spawnFloatText,
    } = createResolution(state, {
      random: () => 0,
    });

    resolution.resolveHand("blackjack", 21, 20);

    expect(playOutcomeSfx).toHaveBeenCalledWith("blackjack", 24, 0);
    expect(applyImpactDamage).toHaveBeenCalledWith({
      target: "enemy",
      amount: 24,
      color: "#f8d37b",
      crit: true,
    });
    expect(state.run.blackjacks).toBe(1);
    expect(state.run.player.hp).toBe(37);
    expect(spawnFloatText).toHaveBeenCalledWith("+2", 332.8, 514, "#8df0b2");
    expect(spawnSparkBurst).toHaveBeenCalledTimes(7);
    expect(triggerFlash).toHaveBeenCalledWith("#ffd88d", 0.14, 0.22);
    expect(triggerScreenShake).toHaveBeenNthCalledWith(1, 9.6, 0.3);
    expect(triggerScreenShake).toHaveBeenNthCalledWith(2, 8.5, 0.24);
    expect(state.encounter.resultText).toBe("CRIT -24 HP");
    expect(state.encounter.resultTone).toBe("special");
  });
});
