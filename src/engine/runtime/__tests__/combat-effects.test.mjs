import { describe, expect, it, vi } from "vitest";
import {
  animatedCardPosition,
  beginQueuedEnemyDefeatTransition,
  currentShakeOffset,
  damageFloatAnchor,
  easeOutBack,
  easeOutCubic,
  handTackleTargets,
  lerp,
  queueEnemyDefeatTransition,
  spawnFloatText,
  spawnSparkBurst,
  startDefeatTransition,
  triggerHandTackle,
  triggerFlash,
  triggerImpactBurst,
  triggerImpactBurstAt,
  triggerScreenShake,
} from "../core/combat-effects.js";

describe("combat effects helpers", () => {
  it("provides interpolation/easing primitives", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutBack(1)).toBeCloseTo(1, 10);
  });

  it("spawns floating text entries", () => {
    const state = { floatingTexts: [] };
    spawnFloatText({
      state,
      text: "10",
      x: 1,
      y: 2,
      color: "#fff",
      opts: { life: 2, size: 20 },
      random: () => 0.5,
    });
    expect(state.floatingTexts).toHaveLength(1);
    expect(state.floatingTexts[0].text).toBe("10");
    expect(state.floatingTexts[0].life).toBe(2);
  });

  it("computes animated card positions", () => {
    const pos = animatedCardPosition({
      card: { dealtAt: 1, fromX: 0, fromY: 0 },
      targetX: 100,
      targetY: 50,
      worldTime: 1.05,
    });
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeLessThanOrEqual(50);
    expect(pos.alpha).toBeGreaterThan(0);
  });

  it("spawns spark bursts and shake/flash effects", () => {
    const state = {
      sparkParticles: [],
      flashOverlays: [],
      cardBursts: [],
      screenShakePower: 0,
      screenShakeDuration: 0,
      screenShakeTime: 0,
    };
    spawnSparkBurst({ state, x: 1, y: 2, color: "#f00", count: 2, random: () => 0.5 });
    expect(state.sparkParticles).toHaveLength(2);

    triggerScreenShake({ state, power: 5, duration: 0.3 });
    expect(state.screenShakePower).toBe(5);
    expect(state.screenShakeDuration).toBe(0.3);
    expect(state.screenShakeTime).toBe(0.3);

    triggerFlash({ state, color: "#fff", intensity: 0.2, duration: 0.1 });
    expect(state.flashOverlays).toHaveLength(1);
  });

  it("builds impact bursts and current shake offset", () => {
    const state = {
      sparkParticles: [],
      flashOverlays: [],
      cardBursts: [],
      screenShakePower: 6,
      screenShakeDuration: 0.2,
      screenShakeTime: 0.2,
    };
    triggerImpactBurstAt({ state, x: 10, y: 20, amount: 2, color: "#f00" });
    expect(state.cardBursts).toHaveLength(1);
    expect(state.sparkParticles.length).toBeGreaterThan(0);
    expect(state.flashOverlays).toHaveLength(1);

    const offset = currentShakeOffset({ state, random: () => 0.5 });
    expect(offset.x).toBeCloseTo(0, 10);
    expect(offset.y).toBeCloseTo(0, 10);

    const fn = vi.fn();
    triggerImpactBurst({
      state,
      side: "enemy",
      amount: 1,
      color: "#f00",
      width: 1000,
      height: 700,
      triggerImpactBurstAtFn: fn,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves damage float anchors with and without portrait layout", () => {
    const withLayout = {
      combatLayout: {
        enemyPortrait: { centerX: 700, y: 120 },
        playerPortrait: { centerX: 200, y: 580 },
      },
    };
    expect(damageFloatAnchor({ state: withLayout, target: "enemy", width: 1280, height: 720 })).toEqual({
      x: 700,
      y: 112,
    });

    const fallback = damageFloatAnchor({ state: { combatLayout: null }, target: "player", width: 1280, height: 720 });
    expect(fallback).toEqual({ x: 332.8, y: 576 });
  });

  it("computes hand tackle targets and enqueues tackle projectiles", () => {
    const state = {
      encounter: {
        playerHand: [{ rank: "A" }, { rank: "K" }],
        dealerHand: [{ rank: "7" }],
      },
      combatLayout: null,
      handTackles: [],
    };
    const targets = handTackleTargets({
      state,
      winner: "player",
      width: 1280,
      height: 720,
      handBoundsFn: vi.fn((handType) => (handType === "player" ? { centerX: 900, centerY: 580 } : { centerX: 300, centerY: 140 })),
    });
    expect(targets.fromX).toBe(900);
    expect(targets.fromY).toBe(580);
    expect(targets.toX).toBeCloseTo(921.6, 10);
    expect(targets.toY).toBe(114);

    const queued = triggerHandTackle({
      state,
      winner: "player",
      amount: 4,
      cardW: 88,
      cardH: 124,
      width: 1280,
      height: 720,
      handBoundsFn: () => ({ centerX: 900, centerY: 580 }),
    });
    expect(queued).toBe(true);
    expect(state.handTackles).toHaveLength(1);
    expect(state.handTackles[0].projectiles).toHaveLength(2);
    expect(state.handTackles[0].amount).toBe(4);
  });

  it("starts, queues, and begins defeat transitions", () => {
    const state = {
      encounter: {
        playerHand: [{ rank: "9" }],
        dealerHand: [{ rank: "K" }],
        phase: "resolve",
        resolveTimer: 2,
        resultText: "",
        resultTone: "neutral",
      },
      combatLayout: null,
      pendingTransition: null,
      sparkParticles: [],
      flashOverlays: [],
      cardBursts: [],
      screenShakePower: 0,
      screenShakeDuration: 0,
      screenShakeTime: 0,
    };
    const handBoundsFn = vi.fn(() => ({ centerX: 400, centerY: 180 }));
    const playImpactSfxFn = vi.fn();
    const started = startDefeatTransition({
      state,
      target: "enemy",
      handBoundsFn,
      playImpactSfxFn,
      enemyDefeatTransitionSeconds: 1.9,
      playerDefeatTransitionSeconds: 1.02,
      random: () => 0.5,
    });
    expect(started).toBe(true);
    expect(state.pendingTransition).toEqual({
      target: "enemy",
      timer: 1.9,
      duration: 1.9,
    });
    expect(state.encounter.phase).toBe("done");
    expect(state.encounter.resultText).toBe("Defeated Opponent");
    expect(state.encounter.resultTone).toBe("win");
    expect(playImpactSfxFn).toHaveBeenCalledWith(16, "enemy");
    expect(state.sparkParticles.length).toBeGreaterThan(0);
    expect(state.flashOverlays).toHaveLength(1);

    const queuedState = {
      encounter: {
        playerHand: [],
        dealerHand: [],
        phase: "resolve",
        resolveTimer: 1,
        resultText: "",
        resultTone: "neutral",
      },
      pendingTransition: null,
      flashOverlays: [],
      screenShakePower: 0,
      screenShakeDuration: 0,
      screenShakeTime: 0,
    };
    expect(queueEnemyDefeatTransition({ state: queuedState, enemyDefeatTransitionSeconds: 1.9 })).toBe(true);
    expect(queuedState.pendingTransition).toEqual({
      target: "enemy",
      timer: 0,
      duration: 1.9,
      waiting: true,
    });

    const beginPlayImpactSfxFn = vi.fn();
    const began = beginQueuedEnemyDefeatTransition({
      state: queuedState,
      playImpactSfxFn: beginPlayImpactSfxFn,
      enemyDefeatTransitionSeconds: 1.9,
    });
    expect(began).toBe(true);
    expect(queuedState.pendingTransition.waiting).toBe(false);
    expect(queuedState.pendingTransition.timer).toBe(1.9);
    expect(beginPlayImpactSfxFn).toHaveBeenCalledWith(16, "enemy");
  });
});
