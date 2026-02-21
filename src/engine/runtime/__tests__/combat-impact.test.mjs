import { describe, expect, it, vi } from "vitest";
import { createCombatImpactHandlers } from "../core/combat-impact.js";

function createBaseState() {
  return {
    pendingTransition: null,
    run: {
      player: {
        hp: 20,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        streak: 3,
      },
    },
    encounter: {
      phase: "player",
      nextDealPrompted: true,
      resolveTimer: 1,
      enemy: {
        name: "Dealer",
        hp: 25,
      },
    },
  };
}

describe("combat impact handlers", () => {
  it("finalizeResolveState transitions to player defeat when player HP is zero", () => {
    const state = createBaseState();
    state.run.player.hp = 0;
    const startDefeatTransitionFn = vi.fn();
    const setAnnouncementFn = vi.fn();
    const addLogFn = vi.fn();
    const saveRunSnapshotFn = vi.fn();
    const handlers = createCombatImpactHandlers({
      state,
      width: 1280,
      height: 720,
      startDefeatTransitionFn,
      setAnnouncementFn,
      addLogFn,
      saveRunSnapshotFn,
      isExternalModeRenderingFn: () => false,
      queueEnemyDefeatTransitionFn: vi.fn(),
      damageFloatAnchorFn: () => ({ x: 0, y: 0 }),
      spawnFloatTextFn: vi.fn(),
    });

    handlers.finalizeResolveState();
    expect(startDefeatTransitionFn).toHaveBeenCalledWith("player");
    expect(setAnnouncementFn).toHaveBeenCalledWith("You were defeated.", 1.2);
    expect(addLogFn).toHaveBeenCalledWith("You were defeated.");
    expect(saveRunSnapshotFn).toHaveBeenCalledTimes(1);
  });

  it("finalizeResolveState queues enemy defeat under external rendering", () => {
    const state = createBaseState();
    state.encounter.enemy.hp = 0;
    const startDefeatTransitionFn = vi.fn();
    const queueEnemyDefeatTransitionFn = vi.fn();
    const handlers = createCombatImpactHandlers({
      state,
      width: 1280,
      height: 720,
      startDefeatTransitionFn,
      setAnnouncementFn: vi.fn(),
      addLogFn: vi.fn(),
      saveRunSnapshotFn: vi.fn(),
      isExternalModeRenderingFn: () => true,
      queueEnemyDefeatTransitionFn,
      damageFloatAnchorFn: () => ({ x: 0, y: 0 }),
      spawnFloatTextFn: vi.fn(),
    });

    handlers.finalizeResolveState();
    expect(queueEnemyDefeatTransitionFn).toHaveBeenCalledTimes(1);
    expect(startDefeatTransitionFn).not.toHaveBeenCalled();
  });

  it("applyImpactDamage updates enemy damage totals and resolves encounter state", () => {
    const state = createBaseState();
    const spawnFloatTextFn = vi.fn();
    const handlers = createCombatImpactHandlers({
      state,
      width: 1280,
      height: 720,
      startDefeatTransitionFn: vi.fn(),
      setAnnouncementFn: vi.fn(),
      addLogFn: vi.fn(),
      saveRunSnapshotFn: vi.fn(),
      isExternalModeRenderingFn: () => false,
      queueEnemyDefeatTransitionFn: vi.fn(),
      damageFloatAnchorFn: () => ({ x: 100, y: 200 }),
      spawnFloatTextFn,
    });

    handlers.applyImpactDamage({
      target: "enemy",
      amount: 6,
      color: "#abc",
    });

    expect(state.encounter.enemy.hp).toBe(19);
    expect(state.run.player.totalDamageDealt).toBe(6);
    expect(spawnFloatTextFn).toHaveBeenCalledWith("-6", 100, 200, "#abc");
    expect(state.encounter.phase).toBe("resolve");
    expect(state.encounter.nextDealPrompted).toBe(false);
    expect(state.encounter.resolveTimer).toBe(0);
  });

  it("applyImpactDamage updates player damage totals and resets streak", () => {
    const state = createBaseState();
    const spawnFloatTextFn = vi.fn();
    const handlers = createCombatImpactHandlers({
      state,
      width: 1280,
      height: 720,
      startDefeatTransitionFn: vi.fn(),
      setAnnouncementFn: vi.fn(),
      addLogFn: vi.fn(),
      saveRunSnapshotFn: vi.fn(),
      isExternalModeRenderingFn: () => false,
      queueEnemyDefeatTransitionFn: vi.fn(),
      damageFloatAnchorFn: () => ({ x: 150, y: 260 }),
      spawnFloatTextFn,
    });

    handlers.applyImpactDamage({
      target: "player",
      amount: 4,
      color: "#def",
    });

    expect(state.run.player.hp).toBe(16);
    expect(state.run.player.totalDamageTaken).toBe(4);
    expect(state.run.player.streak).toBe(0);
    expect(spawnFloatTextFn).toHaveBeenCalledWith("-4", 150, 260, "#def");
  });
});
