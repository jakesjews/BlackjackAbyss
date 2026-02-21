import { describe, expect, it, vi } from "vitest";
import { createRuntimeEffects } from "../core/runtime-effects.js";

describe("runtime effects module", () => {
  it("wires combat-effect wrappers with state, dimensions, and runtime callbacks", () => {
    const state = { worldTime: 3.5 };
    const handBoundsFn = vi.fn(() => ({ centerX: 42, centerY: 84 }));
    const getHandBoundsFn = vi.fn(() => handBoundsFn);
    const playImpactSfxFn = vi.fn();
    const animatedCardPositionFn = vi.fn(() => ({ x: 10, y: 20, alpha: 1 }));
    const beginQueuedEnemyDefeatTransitionFn = vi.fn(() => true);
    const currentShakeOffsetFn = vi.fn(() => ({ x: 2, y: -1 }));
    const damageFloatAnchorFn = vi.fn(() => ({ x: 90, y: 120 }));
    const lerpFn = vi.fn(() => 7.5);
    const queueEnemyDefeatTransitionFn = vi.fn(() => true);
    const spawnFloatTextFn = vi.fn();
    const spawnSparkBurstFn = vi.fn();
    const startDefeatTransitionFn = vi.fn(() => true);
    const triggerFlashFn = vi.fn();
    const triggerHandTackleFn = vi.fn(() => true);
    const triggerImpactBurstFn = vi.fn();
    const triggerImpactBurstAtFn = vi.fn();
    const triggerScreenShakeFn = vi.fn();

    const effects = createRuntimeEffects({
      state,
      width: 1280,
      height: 720,
      cardW: 88,
      cardH: 124,
      getHandBoundsFn,
      playImpactSfxFn,
      enemyDefeatTransitionSeconds: 1.9,
      playerDefeatTransitionSeconds: 1.1,
      animatedCardPositionFn,
      beginQueuedEnemyDefeatTransitionFn,
      currentShakeOffsetFn,
      damageFloatAnchorFn,
      lerpFn,
      queueEnemyDefeatTransitionFn,
      spawnFloatTextFn,
      spawnSparkBurstFn,
      startDefeatTransitionFn,
      triggerFlashFn,
      triggerHandTackleFn,
      triggerImpactBurstFn,
      triggerImpactBurstAtFn,
      triggerScreenShakeFn,
    });

    effects.spawnFloatText("hit!", 30, 50, "#ffcc88", { life: 1.4 });
    effects.spawnSparkBurst(10, 20, "#ffaa55", 8, 180);
    effects.triggerScreenShake(9, 0.3);
    effects.triggerFlash("#ffffff", 0.12, 0.2);
    effects.triggerImpactBurstAt(320, 240, 11, "#ff2200");
    effects.triggerImpactBurst("enemy", 9, "#ffaa00");
    const tackled = effects.triggerHandTackle("enemy", 6, { target: "player" });
    const defeatTransitionStarted = effects.startDefeatTransition("enemy");
    const queued = effects.queueEnemyDefeatTransition();
    const begun = effects.beginQueuedEnemyDefeatTransition();
    const anchor = effects.damageFloatAnchor("enemy");
    const shakeOffset = effects.currentShakeOffset();
    const cardPos = effects.animatedCardPosition({ rank: "A" }, 320, 120);
    const lerpValue = effects.lerp(2, 10, 0.75);

    expect(spawnFloatTextFn).toHaveBeenCalledWith({
      state,
      text: "hit!",
      x: 30,
      y: 50,
      color: "#ffcc88",
      opts: { life: 1.4 },
    });
    expect(spawnSparkBurstFn).toHaveBeenCalledWith({
      state,
      x: 10,
      y: 20,
      color: "#ffaa55",
      count: 8,
      speed: 180,
    });
    expect(triggerScreenShakeFn).toHaveBeenCalledWith({ state, power: 9, duration: 0.3 });
    expect(triggerFlashFn).toHaveBeenCalledWith({ state, color: "#ffffff", intensity: 0.12, duration: 0.2 });
    expect(triggerImpactBurstAtFn).toHaveBeenCalledWith({
      state,
      x: 320,
      y: 240,
      amount: 11,
      color: "#ff2200",
    });
    expect(triggerImpactBurstFn).toHaveBeenCalledWith({
      state,
      side: "enemy",
      amount: 9,
      color: "#ffaa00",
      width: 1280,
      height: 720,
    });
    expect(triggerHandTackleFn).toHaveBeenCalledWith(
      expect.objectContaining({
        state,
        winner: "enemy",
        amount: 6,
        impactPayload: { target: "player" },
        cardW: 88,
        cardH: 124,
        width: 1280,
        height: 720,
        handBoundsFn,
      })
    );
    expect(startDefeatTransitionFn).toHaveBeenCalledWith(
      expect.objectContaining({
        state,
        target: "enemy",
        handBoundsFn,
        spawnSparkBurstFn,
        triggerScreenShakeFn,
        triggerFlashFn,
        playImpactSfxFn,
        enemyDefeatTransitionSeconds: 1.9,
        playerDefeatTransitionSeconds: 1.1,
      })
    );
    expect(queueEnemyDefeatTransitionFn).toHaveBeenCalledWith({
      state,
      enemyDefeatTransitionSeconds: 1.9,
    });
    expect(beginQueuedEnemyDefeatTransitionFn).toHaveBeenCalledWith({
      state,
      triggerScreenShakeFn,
      triggerFlashFn,
      playImpactSfxFn,
      enemyDefeatTransitionSeconds: 1.9,
    });
    expect(damageFloatAnchorFn).toHaveBeenCalledWith({
      state,
      target: "enemy",
      width: 1280,
      height: 720,
    });
    expect(currentShakeOffsetFn).toHaveBeenCalledWith({ state });
    expect(animatedCardPositionFn).toHaveBeenCalledWith({
      card: { rank: "A" },
      targetX: 320,
      targetY: 120,
      worldTime: 3.5,
    });
    expect(lerpFn).toHaveBeenCalledWith(2, 10, 0.75);
    expect(tackled).toBe(true);
    expect(defeatTransitionStarted).toBe(true);
    expect(queued).toBe(true);
    expect(begun).toBe(true);
    expect(anchor).toEqual({ x: 90, y: 120 });
    expect(shakeOffset).toEqual({ x: 2, y: -1 });
    expect(cardPos).toEqual({ x: 10, y: 20, alpha: 1 });
    expect(lerpValue).toBe(7.5);
    expect(effects.easeOutCubic(0.5)).toBeCloseTo(0.875, 6);
  });

  it("falls back to no-op hand-bounds callback when runtime hand bounds are not ready", () => {
    const triggerHandTackleFn = vi.fn(() => true);
    const startDefeatTransitionFn = vi.fn(() => true);

    const effects = createRuntimeEffects({
      state: { worldTime: 0 },
      width: 800,
      height: 600,
      cardW: 88,
      cardH: 124,
      getHandBoundsFn: () => null,
      triggerHandTackleFn,
      startDefeatTransitionFn,
    });

    effects.triggerHandTackle("player", 2);
    effects.startDefeatTransition("player");

    const handBoundsFromTackle = triggerHandTackleFn.mock.calls[0][0].handBoundsFn;
    const handBoundsFromTransition = startDefeatTransitionFn.mock.calls[0][0].handBoundsFn;
    expect(typeof handBoundsFromTackle).toBe("function");
    expect(typeof handBoundsFromTransition).toBe("function");
    expect(handBoundsFromTackle("player", 1)).toBeNull();
    expect(handBoundsFromTransition("player", 1)).toBeNull();
  });
});
