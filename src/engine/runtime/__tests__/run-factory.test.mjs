import { describe, expect, it, vi } from "vitest";
import { applyTestEconomyToNewRun, createRun } from "../core/run-factory.js";

describe("run factory", () => {
  it("creates a default run shell", () => {
    const run = createRun(() => ({ flatDamage: 0, block: 0 }));
    expect(run.floor).toBe(1);
    expect(run.player.hp).toBe(42);
    expect(run.player.maxHp).toBe(42);
    expect(run.player.gold).toBe(24);
    expect(run.player.stats).toEqual({ flatDamage: 0, block: 0 });
  });

  it("seeds economy gold in test mode when startingGold is higher", () => {
    const run = createRun(() => ({}));
    run.player.gold = 12;
    const addLog = vi.fn();
    applyTestEconomyToNewRun({
      run,
      runtimeTestFlags: { economy: { startingGold: 77 } },
      addLog,
    });
    expect(run.player.gold).toBe(77);
    expect(addLog).toHaveBeenCalledTimes(1);
  });

  it("does not reduce gold when seed value is lower", () => {
    const run = createRun(() => ({}));
    run.player.gold = 120;
    const addLog = vi.fn();
    applyTestEconomyToNewRun({
      run,
      runtimeTestFlags: { economy: { startingGold: 44 } },
      addLog,
    });
    expect(run.player.gold).toBe(120);
    expect(addLog).not.toHaveBeenCalled();
  });
});
