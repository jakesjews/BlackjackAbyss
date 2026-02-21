import { describe, expect, it } from "vitest";
import { applyChipDelta, finalizeRunIntoProfile, updateProfileBest } from "../bootstrap/run-results.js";

describe("run results helpers", () => {
  it("updates profile best progress metrics", () => {
    const profile = {
      totals: {
        bestFloor: 1,
        bestRoom: 2,
        longestStreak: 3,
      },
    };
    const run = {
      floor: 4,
      room: 5,
      maxStreak: 6,
      player: { streak: 2 },
    };
    expect(updateProfileBest({ profile, run })).toBe(true);
    expect(profile.totals.bestFloor).toBe(4);
    expect(profile.totals.bestRoom).toBe(5);
    expect(profile.totals.longestStreak).toBe(6);
  });

  it("finalizes run into profile totals and history", () => {
    const profile = {
      totals: {
        runsCompleted: 0,
        runsWon: 0,
        runsLost: 0,
        enemiesDefeated: 0,
        handsPlayed: 0,
        damageDealt: 0,
        damageTaken: 0,
        chipsEarned: 0,
        chipsSpent: 0,
        blackjacks: 0,
        doublesWon: 0,
        splitsUsed: 0,
        pushes: 0,
        bestFloor: 1,
        bestRoom: 1,
        longestStreak: 0,
      },
      runs: [],
    };
    const run = {
      floor: 2,
      room: 3,
      enemiesDefeated: 4,
      totalHands: 5,
      chipsEarnedRun: 80,
      chipsSpentRun: 20,
      blackjacks: 1,
      doublesWon: 1,
      splitsUsed: 2,
      pushes: 1,
      maxStreak: 3,
      player: {
        totalDamageDealt: 30,
        totalDamageTaken: 12,
        streak: 2,
        gold: 99,
      },
    };

    expect(
      finalizeRunIntoProfile({
        profile,
        run,
        outcome: "victory",
        maxRunHistory: 2,
        now: () => 111,
      })
    ).toBe(true);

    expect(profile.totals.runsCompleted).toBe(1);
    expect(profile.totals.runsWon).toBe(1);
    expect(profile.totals.runsLost).toBe(0);
    expect(profile.totals.enemiesDefeated).toBe(4);
    expect(profile.totals.handsPlayed).toBe(5);
    expect(profile.totals.damageDealt).toBe(30);
    expect(profile.totals.damageTaken).toBe(12);
    expect(profile.totals.chipsEarned).toBe(80);
    expect(profile.totals.chipsSpent).toBe(20);
    expect(profile.totals.blackjacks).toBe(1);
    expect(profile.totals.doublesWon).toBe(1);
    expect(profile.totals.splitsUsed).toBe(2);
    expect(profile.totals.pushes).toBe(1);
    expect(profile.runs).toHaveLength(1);
    expect(profile.runs[0]).toEqual({
      at: 111,
      outcome: "victory",
      floor: 2,
      room: 3,
      enemiesDefeated: 4,
      hands: 5,
      chips: 99,
    });
  });

  it("applies chip deltas with earned/spent tracking", () => {
    const run = {
      player: { gold: 20 },
      chipsEarnedRun: 0,
      chipsSpentRun: 0,
    };
    expect(applyChipDelta({ run, amount: 9.7 })).toBe(true);
    expect(run.player.gold).toBe(30);
    expect(run.chipsEarnedRun).toBe(10);
    expect(run.chipsSpentRun).toBe(0);

    expect(applyChipDelta({ run, amount: -4.4 })).toBe(true);
    expect(run.player.gold).toBe(26);
    expect(run.chipsEarnedRun).toBe(10);
    expect(run.chipsSpentRun).toBe(4);
  });
});
