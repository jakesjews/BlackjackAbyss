import { describe, expect, it, vi } from "vitest";
import { createCombatTurnActions } from "../bootstrap/combat-turn-actions.js";

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

function createState(overrides = {}) {
  return {
    mode: "playing",
    pendingTransition: null,
    handTackles: [],
    run: {
      splitsUsed: 0,
      player: {
        bustGuardsLeft: 0,
      },
    },
    encounter: {
      phase: "player",
      resolveTimer: 0,
      playerHand: [
        { rank: "10", suit: "S" },
        { rank: "7", suit: "H" },
      ],
      dealerHand: [
        { rank: "9", suit: "D" },
        { rank: "7", suit: "C" },
      ],
      splitQueue: [],
      splitUsed: false,
      splitHandsTotal: 1,
      splitHandsResolved: 0,
      handIndex: 1,
      nextDealPrompted: true,
      doubleDown: false,
      bustGuardTriggered: false,
      critTriggered: false,
      hideDealerHole: true,
      dealerResolved: false,
      resultText: "",
      resultTone: "neutral",
      lastPlayerAction: "none",
    },
    ...overrides,
  };
}

function createActions(state, overrides = {}) {
  const playUiSfx = overrides.playUiSfx || vi.fn();
  const playActionSfx = overrides.playActionSfx || vi.fn();
  const addLog = overrides.addLog || vi.fn();
  const startHand = overrides.startHand || vi.fn();
  const saveRunSnapshot = overrides.saveRunSnapshot || vi.fn();
  const setAnnouncement = overrides.setAnnouncement || vi.fn();
  const resolveHand = overrides.resolveHand || vi.fn();
  const isEncounterIntroActive = overrides.isEncounterIntroActive || (() => false);
  const dealQueue = {
    player: [...(overrides.dealQueue?.player || [])],
    dealer: [...(overrides.dealQueue?.dealer || [])],
  };
  const dealCard = overrides.dealCard || ((encounter, target) => {
    const fallback = target === "player" ? { rank: "2", suit: "S" } : { rank: "3", suit: "H" };
    const card = dealQueue[target].shift() || fallback;
    if (target === "player") {
      encounter.playerHand.push({ ...card });
    } else {
      encounter.dealerHand.push({ ...card });
    }
    return card;
  });

  const actions = createCombatTurnActions({
    state,
    maxSplitHands: 4,
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
  });

  return {
    actions,
    playUiSfx,
    playActionSfx,
    addLog,
    startHand,
    saveRunSnapshot,
    setAnnouncement,
    resolveHand,
    dealCard,
  };
}

describe("combat turn actions", () => {
  it("evaluates player/deal action availability", () => {
    const state = createState();
    const { actions } = createActions(state);

    expect(actions.canPlayerAct()).toBe(true);
    expect(actions.canAdvanceDeal()).toBe(false);

    state.encounter.phase = "resolve";
    expect(actions.canPlayerAct()).toBe(false);
    expect(actions.canAdvanceDeal()).toBe(true);

    state.pendingTransition = { target: "enemy" };
    expect(actions.canAdvanceDeal()).toBe(false);
  });

  it("advances deal state and snapshots progress", () => {
    const state = createState({
      encounter: {
        ...createState().encounter,
        phase: "resolve",
      },
    });
    const { actions, startHand, saveRunSnapshot } = createActions(state);

    expect(actions.advanceToNextDeal()).toBe(true);
    expect(state.encounter.handIndex).toBe(2);
    expect(state.encounter.nextDealPrompted).toBe(false);
    expect(startHand).toHaveBeenCalledTimes(1);
    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
  });

  it("resolves hit busts when no bust guard remains", () => {
    const state = createState({
      encounter: {
        ...createState().encounter,
        playerHand: [
          { rank: "K", suit: "S" },
          { rank: "Q", suit: "H" },
        ],
      },
      run: {
        splitsUsed: 0,
        player: {
          bustGuardsLeft: 0,
        },
      },
    });
    const { actions, resolveHand, playActionSfx } = createActions(state, {
      dealQueue: {
        player: [{ rank: "8", suit: "D" }],
      },
    });

    actions.hitAction();
    expect(playActionSfx).toHaveBeenCalledWith("hit");
    expect(resolveHand).toHaveBeenCalledWith("player_bust");
  });

  it("handles split action and initializes split hand state", () => {
    const state = createState({
      encounter: {
        ...createState().encounter,
        playerHand: [
          { rank: "8", suit: "S" },
          { rank: "8", suit: "D" },
        ],
      },
      run: {
        splitsUsed: 0,
        player: {
          bustGuardsLeft: 1,
        },
      },
    });
    const { actions, addLog, playActionSfx } = createActions(state, {
      dealQueue: {
        dealer: [
          { rank: "5", suit: "C" },
          { rank: "9", suit: "H" },
        ],
        player: [{ rank: "3", suit: "S" }],
      },
    });

    actions.splitAction();

    expect(state.run.splitsUsed).toBe(1);
    expect(state.encounter.splitUsed).toBe(true);
    expect(state.encounter.splitHandsTotal).toBe(2);
    expect(state.encounter.splitQueue).toHaveLength(1);
    expect(state.encounter.playerHand).toHaveLength(2);
    expect(playActionSfx).toHaveBeenCalledWith("double");
    expect(addLog).toHaveBeenCalledWith("Hand split.");
  });

  it("resolves dealer draw loop then showdown outcome", () => {
    const state = createState({
      encounter: {
        ...createState().encounter,
        splitUsed: true,
        phase: "player",
        playerHand: [
          { rank: "10", suit: "S" },
          { rank: "7", suit: "H" },
        ],
        dealerHand: [
          { rank: "10", suit: "C" },
          { rank: "6", suit: "D" },
        ],
      },
    });
    const dealCard = vi.fn((encounter, target) => {
      if (target === "dealer") {
        encounter.dealerHand.push({ rank: "A", suit: "S" });
      }
    });
    const resolveHand = vi.fn();
    const { actions } = createActions(state, { dealCard, resolveHand });

    actions.resolveDealerThenShowdown(false);

    expect(dealCard).toHaveBeenCalledTimes(1);
    expect(state.encounter.dealerResolved).toBe(true);
    expect(resolveHand).toHaveBeenCalledWith("push", 17, 17);
  });
});
