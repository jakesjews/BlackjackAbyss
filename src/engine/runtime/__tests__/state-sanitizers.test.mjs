import { describe, expect, it } from "vitest";
import {
  sanitizeCard,
  sanitizeCardList,
  sanitizeEncounter,
  sanitizeRun,
} from "../core/state-sanitizers.js";

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}

describe("state sanitizers", () => {
  it("sanitizes cards against rank/suit lists", () => {
    const ranks = ["A", "2", "K"];
    const suits = ["S", "H"];
    expect(sanitizeCard({ rank: "A", suit: "S" }, { ranks, suits })).toEqual({ rank: "A", suit: "S" });
    expect(sanitizeCard({ rank: "Q", suit: "S" }, { ranks, suits })).toBeNull();
    expect(sanitizeCardList([{ rank: "2", suit: "H" }, { rank: "Q", suit: "S" }], { ranks, suits })).toEqual([
      { rank: "2", suit: "H" },
    ]);
  });

  it("sanitizes run payloads with clamped defaults", () => {
    const baseRun = {
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
        stats: {},
      },
      log: [],
      eventLog: [],
    };

    const run = sanitizeRun({
      runLike: {
        floor: -2,
        room: 0,
        player: {
          hp: 999,
          maxHp: 30,
          gold: 55,
          relics: { foo: 2 },
          stats: { block: 3 },
        },
        log: [{ message: "  hi  ", ttl: 99 }],
        eventLog: ["a", " ", "b"],
      },
      createRun: () => structuredClone(baseRun),
      nonNegInt,
      clampNumber,
      mergePlayerStats: (stats) => ({ block: Number(stats?.block) || 0 }),
    });

    expect(run.floor).toBe(1);
    expect(run.room).toBe(1);
    expect(run.player.maxHp).toBe(30);
    expect(run.player.hp).toBe(30);
    expect(run.player.gold).toBe(55);
    expect(run.player.relics).toEqual({ foo: 2 });
    expect(run.player.stats).toEqual({ block: 3 });
    expect(run.log[0].ttl).toBe(30);
    expect(run.eventLog).toEqual(["a", "b"]);
  });

  it("sanitizes encounter payloads and split metadata", () => {
    const ranks = ["A", "2", "K"];
    const suits = ["S", "H"];
    const encounter = sanitizeEncounter({
      encounterLike: {
        enemy: { type: "elite", name: "Preset", hp: 7, maxHp: 12, attack: 3 },
        shoe: [{ rank: "A", suit: "S" }, { rank: "Q", suit: "S" }],
        discard: [{ rank: "2", suit: "H" }],
        playerHand: [{ rank: "K", suit: "S" }],
        dealerHand: [{ rank: "A", suit: "H" }],
        splitQueue: [[{ rank: "2", suit: "H" }], [{ rank: "Q", suit: "S" }]],
        splitHandsTotal: 99,
        splitHandsResolved: 5,
        phase: "dealer",
        resultTone: "win",
        resolveTimer: 99,
        handIndex: 2,
        resolvedHands: 3,
        intro: { active: true, visibleChars: 3 },
      },
      run: { floor: 1, room: 1, roomsPerFloor: 5 },
      resolveRoomType: () => "normal",
      createEnemy: () => ({ name: "Base", hp: 10, maxHp: 10, attack: 1 }),
      createEncounterIntroState: () => ({ active: true, dialogue: "Intro", visibleChars: 3 }),
      sanitizeCardListFn: (listLike) => sanitizeCardList(listLike, { ranks, suits }),
      maxSplitHands: 4,
      nonNegInt,
      clampNumber,
    });

    expect(encounter.enemy.name).toBe("Preset");
    expect(encounter.enemy.hp).toBe(7);
    expect(encounter.shoe).toEqual([{ rank: "A", suit: "S" }]);
    expect(encounter.splitQueue).toEqual([[{ rank: "2", suit: "H" }]]);
    expect(encounter.splitHandsTotal).toBe(4);
    expect(encounter.splitHandsResolved).toBe(3);
    expect(encounter.phase).toBe("dealer");
    expect(encounter.resolveTimer).toBe(10);
    expect(encounter.intro).toEqual({ active: true, dialogue: "Intro", visibleChars: 3 });
  });
});
