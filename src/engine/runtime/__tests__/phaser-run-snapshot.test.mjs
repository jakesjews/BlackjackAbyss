import { describe, expect, it } from "vitest";
import { buildPhaserRunSnapshot } from "../bootstrap/phaser-run-snapshot.js";

describe("phaser run snapshot builder", () => {
  it("returns null outside playing mode", () => {
    const snapshot = buildPhaserRunSnapshot({
      state: { mode: "menu", run: null, encounter: null },
      isEncounterIntroActive: () => false,
      canPlayerAct: () => false,
      canSplitCurrentHand: () => false,
      canAdvanceDeal: () => false,
      canDoubleDown: () => false,
      handTotal: () => ({ total: 0 }),
      visibleDealerTotal: () => 0,
      buildTransitionSnapshot: () => null,
      getRunEventLog: () => [],
      passiveStacksForRun: () => [],
      relicRarityMeta: () => ({ label: "Common" }),
      passiveDescription: (text) => text,
      passiveThumbUrl: () => "",
    });
    expect(snapshot).toBeNull();
  });

  it("builds full run snapshot payload in playing mode", () => {
    const state = {
      mode: "playing",
      announcement: "Ready",
      pendingTransition: { target: "enemy", timer: 1, duration: 1 },
      run: {
        floor: 2,
        room: 3,
        roomsPerFloor: 5,
        player: {
          gold: 33,
          streak: 2,
          bustGuardsLeft: 1,
          hp: 28,
          maxHp: 40,
        },
        eventLog: ["x", "y"],
      },
      encounter: {
        enemy: { name: "Dealer", hp: 12, maxHp: 30, color: "#abc", type: "elite", avatarKey: "d" },
        handIndex: 2,
        phase: "player",
        playerHand: [{ rank: "A", suit: "S", dealtAt: 10 }],
        dealerHand: [{ rank: "10", suit: "H", dealtAt: 5 }, { rank: "5", suit: "D", dealtAt: 8 }],
        hideDealerHole: true,
        bustGuardTriggered: false,
        resultText: "Win hand. -4 HP",
        resultTone: "win",
        intro: {
          ready: false,
          dialogue: "Fight.",
          visibleChars: 3,
        },
      },
    };

    const snapshot = buildPhaserRunSnapshot({
      state,
      isEncounterIntroActive: () => true,
      canPlayerAct: () => true,
      canSplitCurrentHand: () => true,
      canAdvanceDeal: () => false,
      canDoubleDown: () => true,
      handTotal: (cards) => ({ total: cards.length === 1 ? 11 : 15 }),
      visibleDealerTotal: () => 10,
      buildTransitionSnapshot: () => ({ target: "enemy", remaining: 1, duration: 1, waiting: false, progress: 0 }),
      getRunEventLog: (run) => run?.eventLog || [],
      passiveStacksForRun: () => [{ relic: { id: "r1", name: "Relic", description: "Desc" }, count: 2 }],
      relicRarityMeta: () => ({ label: "Rare" }),
      passiveDescription: (text) => text,
      passiveThumbUrl: () => "/thumb.png",
    });

    expect(snapshot.mode).toBe("playing");
    expect(snapshot.run).toMatchObject({ floor: 2, room: 3, chips: 33, streak: 2, bustGuardsLeft: 1 });
    expect(snapshot.player).toEqual({ hp: 28, maxHp: 40 });
    expect(snapshot.enemy).toMatchObject({ name: "Dealer", type: "elite", avatarKey: "d" });
    expect(snapshot.cards.dealer[1].hidden).toBe(true);
    expect(snapshot.totals).toEqual({ player: 11, dealer: 10 });
    expect(snapshot.intro).toEqual({
      active: true,
      ready: false,
      text: "Fig",
      fullText: "Fight.",
    });
    expect(snapshot.passives[0]).toMatchObject({
      id: "r1",
      name: "Relic",
      count: 2,
      rarityLabel: "Rare",
      thumbUrl: "/thumb.png",
    });
    expect(snapshot.status).toEqual({
      canAct: true,
      canHit: true,
      canStand: true,
      canSplit: true,
      canDouble: true,
      canDeal: false,
    });
    expect(snapshot.logs).toEqual(["x", "y"]);
  });
});
