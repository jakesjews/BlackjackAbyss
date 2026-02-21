import { describe, expect, it, vi } from "vitest";
import { createEncounterLifecycleHandlers } from "../bootstrap/encounter-lifecycle.js";

function createState() {
  return {
    worldTime: 3.5,
    mode: "menu",
    viewport: { portraitZoomed: false },
    announcement: "",
    announcementTimer: 0,
    announcementDuration: 0,
    selectionIndex: 0,
    autosaveTimer: 0,
    combatLayout: { cardScale: 1 },
    pendingTransition: null,
    floatingTexts: [{ text: "old" }],
    cardBursts: [{ old: true }],
    sparkParticles: [{ old: true }],
    handTackles: [{ old: true }],
    flashOverlays: [{ old: true }],
    handMessageAnchor: { x: 1, y: 1 },
    screenShakeTime: 2,
    screenShakeDuration: 2,
    screenShakePower: 2,
    rewardOptions: [{ id: "old" }],
    shopStock: [{ id: "old" }],
    profile: {
      totals: {
        runsStarted: 0,
      },
    },
    run: null,
    encounter: null,
  };
}

function createHandlers(overrides = {}) {
  const state = overrides.state || createState();
  const defaults = {
    state,
    width: 1280,
    height: 720,
    cardW: 88,
    cardH: 124,
    createDeckFn: () => [],
    shuffleFn: (cards) => cards,
    rankValueFn: () => 10,
    computeHandLayoutFn: ({ count }) => ({ count }),
    computeHandCardPositionFn: ({ handType, index }) => ({
      x: handType === "player" ? 120 + index * 80 : 820 + index * 80,
      y: handType === "player" ? 500 : 80,
      w: 88,
      h: 124,
    }),
    isExternalModeRenderingFn: () => false,
    playUiSfxFn: vi.fn(),
    playDealSfxFn: vi.fn(),
    spawnSparkBurstFn: vi.fn(),
    isBlackjackFn: () => false,
    saveRunSnapshotFn: vi.fn(),
    clampNumberFn: (value, min, max, fallback) => {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        return fallback;
      }
      return Math.max(min, Math.min(max, n));
    },
    createEncounterFn: () => ({
      enemy: { name: "Dealer Prime" },
      playerHand: [],
      dealerHand: [],
      splitQueue: [],
      splitUsed: false,
      splitHandsTotal: 1,
      splitHandsResolved: 0,
      dealerResolved: false,
      hideDealerHole: true,
      phase: "player",
      resultText: "",
      resultTone: "neutral",
      resolveTimer: 0,
      nextDealPrompted: false,
      doubleDown: false,
      bustGuardTriggered: false,
      critTriggered: false,
      lastPlayerAction: "none",
      discard: [],
      shoe: [],
    }),
    resolveDealerThenShowdownFn: vi.fn(),
    spawnFloatTextFn: vi.fn(),
    addLogFn: vi.fn(),
    unlockAudioFn: vi.fn(),
    saveProfileFn: vi.fn(),
    createRunFn: () => ({
      floor: 1,
      maxFloor: 3,
      room: 1,
      roomsPerFloor: 5,
      player: {
        hp: 30,
        maxHp: 40,
        bustGuardsLeft: 0,
        stats: {
          luckyStart: 2,
          bustGuardPerEncounter: 1,
          healOnEncounterStart: 4,
        },
      },
    }),
    applyTestEconomyToNewRunFn: vi.fn(),
    clearSavedRunFn: vi.fn(),
    resizeCanvasFn: vi.fn(),
  };
  const deps = { ...defaults, ...overrides, state };
  return {
    state,
    deps,
    handlers: createEncounterLifecycleHandlers(deps),
  };
}

describe("encounter lifecycle handlers", () => {
  it("drawFromShoe reshuffles discard or rebuilds shoe when low", () => {
    const { handlers } = createHandlers({
      createDeckFn: () => [{ rank: "A" }, { rank: "K" }],
      shuffleFn: (cards) => [...cards].reverse(),
    });

    const encounterA = {
      shoe: [{ rank: "2" }],
      discard: [{ rank: "9" }, { rank: "8" }],
    };
    expect(handlers.drawFromShoe(encounterA)).toEqual({ rank: "9" });
    expect(encounterA.shoe).toEqual([{ rank: "8" }]);

    const encounterB = {
      shoe: [{ rank: "3" }],
      discard: [],
    };
    expect(handlers.drawFromShoe(encounterB)).toEqual({ rank: "A" });
  });

  it("luckyCardUpgrade redraws low player cards before luckyStart threshold", () => {
    const state = createState();
    state.run = {
      player: {
        stats: { luckyStart: 2 },
      },
    };
    const { handlers } = createHandlers({
      state,
      rankValueFn: (rank) => (rank === "4" ? 4 : 10),
      createDeckFn: () => [{ rank: "J", suit: "S" }],
      shuffleFn: (cards) => cards,
    });

    const encounter = {
      playerHand: [],
      discard: [],
      shoe: [{ rank: "4", suit: "H" }],
    };
    const upgraded = handlers.luckyCardUpgrade(encounter, "player", { rank: "4", suit: "D" });
    expect(upgraded.rank).toBe("4");
    expect(encounter.discard).toHaveLength(0);
  });

  it("startHand deals four cards and resolves natural hands immediately", () => {
    const state = createState();
    state.run = {
      player: {
        stats: { luckyStart: 0, bustGuardPerEncounter: 1, healOnEncounterStart: 0 },
      },
    };
    state.encounter = {
      playerHand: [],
      dealerHand: [],
      splitQueue: [],
      splitUsed: false,
      splitHandsTotal: 1,
      splitHandsResolved: 0,
      dealerResolved: false,
      hideDealerHole: true,
      phase: "player",
      resultText: "",
      resultTone: "neutral",
      resolveTimer: 0,
      nextDealPrompted: false,
      doubleDown: false,
      bustGuardTriggered: false,
      critTriggered: false,
      lastPlayerAction: "none",
      discard: [],
      shoe: [
        { rank: "A", suit: "S" },
        { rank: "K", suit: "H" },
        { rank: "A", suit: "D" },
        { rank: "Q", suit: "C" },
      ],
    };
    const resolveDealerThenShowdownFn = vi.fn();
    const saveRunSnapshotFn = vi.fn();
    const { handlers } = createHandlers({
      state,
      resolveDealerThenShowdownFn,
      saveRunSnapshotFn,
      isBlackjackFn: (cards) => cards.length === 2,
    });

    handlers.startHand();
    expect(state.encounter.playerHand).toHaveLength(2);
    expect(state.encounter.dealerHand).toHaveLength(2);
    expect(resolveDealerThenShowdownFn).toHaveBeenCalledWith(true);
    expect(saveRunSnapshotFn).not.toHaveBeenCalled();
  });

  it("beginEncounter and startRun wire run setup + encounter boot", () => {
    const state = createState();
    const saveRunSnapshotFn = vi.fn();
    const addLogFn = vi.fn();
    const spawnFloatTextFn = vi.fn();
    const applyTestEconomyToNewRunFn = vi.fn((run) => {
      run.player.gold = 99;
    });
    const clearSavedRunFn = vi.fn();
    const resizeCanvasFn = vi.fn();
    const unlockAudioFn = vi.fn();
    const playUiSfxFn = vi.fn();
    const saveProfileFn = vi.fn();

    const { handlers } = createHandlers({
      state,
      saveRunSnapshotFn,
      addLogFn,
      spawnFloatTextFn,
      applyTestEconomyToNewRunFn,
      clearSavedRunFn,
      resizeCanvasFn,
      unlockAudioFn,
      playUiSfxFn,
      saveProfileFn,
    });

    handlers.startRun();

    expect(unlockAudioFn).toHaveBeenCalledTimes(1);
    expect(playUiSfxFn).toHaveBeenCalledWith("confirm");
    expect(saveProfileFn).toHaveBeenCalledTimes(1);
    expect(state.profile.totals.runsStarted).toBe(1);
    expect(applyTestEconomyToNewRunFn).toHaveBeenCalledTimes(1);
    expect(clearSavedRunFn).toHaveBeenCalledTimes(1);
    expect(state.mode).toBe("playing");
    expect(state.encounter?.enemy?.name).toBe("Dealer Prime");
    expect(spawnFloatTextFn).not.toHaveBeenCalled();
    expect(addLogFn).toHaveBeenCalledWith("Dealer Prime enters the table.");
    expect(saveRunSnapshotFn).toHaveBeenCalledTimes(1);
    expect(resizeCanvasFn).toHaveBeenCalledTimes(1);
  });
});
