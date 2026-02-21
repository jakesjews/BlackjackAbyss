import { describe, expect, it } from "vitest";
import {
  buildAvailableActions,
  buildRenderGameToTextPayload,
  renderGameToText,
} from "../core/runtime-text-snapshot.js";

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

describe("runtime text snapshot helpers", () => {
  it("builds menu actions based on save availability", () => {
    const state = { mode: "menu" };
    const base = {
      state,
      isEncounterIntroActive: () => false,
      canAdvanceDeal: () => false,
      canPlayerAct: () => false,
      canDoubleDown: () => false,
      canSplitCurrentHand: () => false,
    };

    expect(buildAvailableActions({ ...base, hasSavedRun: () => true })).toEqual([
      "enter(start)",
      "r(resume)",
      "a(collections)",
    ]);
    expect(buildAvailableActions({ ...base, hasSavedRun: () => false })).toEqual([
      "enter(start)",
      "a(collections)",
    ]);
  });

  it("builds combat action tray when player can act", () => {
    const state = {
      mode: "playing",
      encounter: { intro: { ready: true } },
    };
    const actions = buildAvailableActions({
      state,
      hasSavedRun: () => false,
      isEncounterIntroActive: () => false,
      canAdvanceDeal: () => false,
      canPlayerAct: () => true,
      canDoubleDown: () => true,
      canSplitCurrentHand: () => true,
    });
    expect(actions).toEqual(["z(hit)", "x(stand)", "s(split)", "c(double)"]);
  });

  it("builds and stringifies runtime text payload", () => {
    const state = {
      mode: "playing",
      announcement: "Play hand",
      selectionIndex: 0,
      rewardOptions: [],
      shopStock: [],
      run: {
        floor: 2,
        room: 1,
        maxFloor: 8,
        roomsPerFloor: 4,
        player: {
          hp: 31,
          maxHp: 40,
          gold: 77,
          streak: 3,
          bustGuardsLeft: 1,
          relics: ["lucky-seal"],
        },
      },
      encounter: {
        enemy: {
          name: "Pit Fiend",
          type: "elite",
          hp: 18,
          maxHp: 28,
          attack: 8,
        },
        phase: "player",
        handIndex: 0,
        playerHand: [{ rank: "A", suit: "S" }],
        dealerHand: [{ rank: "10", suit: "H" }, { rank: "Q", suit: "D" }],
        hideDealerHole: true,
        bustGuardTriggered: false,
        resultText: "Play your turn.",
        resultTone: "",
        doubleDown: false,
        splitQueue: [[]],
        splitUsed: false,
        splitHandsTotal: 2,
        splitHandsResolved: 1,
        dealerResolved: false,
        intro: {
          active: true,
          ready: false,
          dialogue: "Choose.",
        },
      },
      audio: {
        enabled: true,
        started: true,
        context: { state: "running" },
      },
      profile: {
        totals: {
          runsStarted: 5,
          runsWon: 2,
          enemiesDefeated: 19,
          relicsCollected: 11,
        },
      },
    };

    const params = {
      state,
      availableActions: () => ["z(hit)", "x(stand)"],
      passiveSummary: () => ["Lucky Seal x1"],
      cardToText: (card) => `${card.rank}${card.suit}`,
      handTotal: () => ({ total: 21 }),
      visibleDealerTotal: () => 10,
      canAdvanceDeal: () => false,
      nonNegInt,
      shopItemName: (item) => item.name || "item",
      collectionEntries: () => [],
      hasSavedRun: () => true,
    };

    const payload = buildRenderGameToTextPayload(params);
    expect(payload.mode).toBe("playing");
    expect(payload.actions).toEqual(["z(hit)", "x(stand)"]);
    expect(payload.run).toMatchObject({
      floor: 2,
      room: 1,
      gold: 77,
      passiveSummary: ["Lucky Seal x1"],
    });
    expect(payload.encounter).toMatchObject({
      phase: "player",
      playerHand: ["AS"],
      playerTotal: 21,
      dealerVisibleTotal: 10,
      resultTone: "neutral",
      splitHandsTotal: 2,
      splitHandsResolved: 1,
      introActive: true,
      introReady: false,
      introText: "Choose.",
    });
    expect(payload.encounter.dealerHand).toEqual(["10H", "??"]);
    expect(payload.audio).toEqual({
      enabled: true,
      started: true,
      contextState: "running",
    });
    expect(payload.profile).toEqual({
      runsStarted: 5,
      runsWon: 2,
      enemiesDefeated: 19,
      relicsCollected: 11,
    });

    expect(JSON.parse(renderGameToText(params))).toEqual(payload);
  });
});
