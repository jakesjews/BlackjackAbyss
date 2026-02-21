import { describe, expect, it } from "vitest";
import {
  CARD_RANKS,
  CARD_SUITS,
  cardToText,
  canDoubleDown,
  canSplitHand,
  computeHandCardPosition,
  computeHandLayout,
  createDeck,
  handTotal,
  isBlackjack,
  resolveShowdownOutcome,
  visibleDealerTotal,
} from "../domain/combat.js";

describe("combat domain", () => {
  it("computes hand layout deterministically", () => {
    const layout = computeHandLayout({ count: 4, layoutScale: 1, cardW: 88, cardH: 124 });
    expect(layout.cardsPerRow).toBe(6);
    expect(layout.w).toBeGreaterThan(30);
    expect(layout.h).toBeGreaterThan(40);
  });

  it("computes hand card position", () => {
    const pos = computeHandCardPosition({
      handType: "player",
      index: 1,
      count: 4,
      layoutScale: 1,
      cardW: 88,
      cardH: 124,
      width: 1280,
      portraitZoomed: false,
    });
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
    expect(pos.w).toBeGreaterThan(0);
    expect(pos.h).toBeGreaterThan(0);
  });

  it("creates a standard multi-deck shoe", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(4 * CARD_SUITS.length * CARD_RANKS.length);
    expect(deck[0]).toHaveProperty("rank");
    expect(deck[0]).toHaveProperty("suit");
  });

  it("computes hand totals with soft ace handling", () => {
    expect(handTotal([{ rank: "A" }, { rank: "9" }]).total).toBe(20);
    expect(handTotal([{ rank: "A" }, { rank: "9" }, { rank: "A" }]).total).toBe(21);
    expect(isBlackjack([{ rank: "A" }, { rank: "K" }])).toBe(true);
    expect(isBlackjack([{ rank: "10" }, { rank: "A" }, { rank: "A" }])).toBe(false);
  });

  it("computes visible dealer total and card text", () => {
    const encounter = {
      phase: "player",
      hideDealerHole: true,
      dealerHand: [
        { rank: "K", suit: "S" },
        { rank: "6", suit: "H" },
      ],
    };
    expect(visibleDealerTotal(encounter)).toBe(10);
    expect(visibleDealerTotal({ ...encounter, hideDealerHole: false })).toBe(16);
    expect(cardToText({ rank: "A", suit: "D" })).toBe("AD");
  });

  it("guards double-down eligibility", () => {
    const encounter = { playerHand: [{}, {}], doubleDown: false, splitUsed: false };
    expect(canDoubleDown({ canAct: true, encounter })).toBe(true);
    expect(canDoubleDown({ canAct: false, encounter })).toBe(false);
    expect(canDoubleDown({ canAct: true, encounter: { ...encounter, splitUsed: true } })).toBe(false);
  });

  it("guards split eligibility", () => {
    const encounter = {
      playerHand: [{ rank: "A" }, { rank: "A" }],
      splitQueue: [],
      doubleDown: false,
    };
    expect(canSplitHand({ canAct: true, encounter, maxSplitHands: 4 })).toBe(true);
    expect(canSplitHand({ canAct: true, encounter: { ...encounter, playerHand: [{ rank: "A" }, { rank: "K" }] }, maxSplitHands: 4 })).toBe(false);
    expect(canSplitHand({ canAct: true, encounter: { ...encounter, splitQueue: [{}, {}, {}] }, maxSplitHands: 4 })).toBe(false);
  });

  it("resolves showdown outcomes", () => {
    expect(resolveShowdownOutcome({ playerTotal: 22, dealerTotal: 18 })).toBe("player_bust");
    expect(resolveShowdownOutcome({ playerTotal: 20, dealerTotal: 22 })).toBe("dealer_bust");
    expect(resolveShowdownOutcome({ playerTotal: 21, dealerTotal: 21, playerNatural: true, dealerNatural: false })).toBe("blackjack");
    expect(resolveShowdownOutcome({ playerTotal: 18, dealerTotal: 20 })).toBe("dealer_win");
    expect(resolveShowdownOutcome({ playerTotal: 19, dealerTotal: 19 })).toBe("push");
  });
});
