import { describe, expect, it, vi } from "vitest";
import { createRuntimeRunHelpers } from "../core/runtime-run-helpers.js";

describe("runtime run helpers", () => {
  it("creates run helpers with delegated run/economy/chip/profile wiring", () => {
    const state = {
      run: { id: "run-1" },
      profile: { id: "profile-1" },
    };
    const defaultPlayerStats = () => ({ hp: 42 });
    const runtimeTestFlags = { economy: { startingGold: 88 } };
    const addLogFn = vi.fn();
    const createRunFn = vi.fn((defaults) => ({ defaults }));
    const applyTestEconomyToNewRunFn = vi.fn();
    const applyChipDeltaFn = vi.fn();
    const updateProfileBestFn = vi.fn();

    const helpers = createRuntimeRunHelpers({
      state,
      defaultPlayerStats,
      runtimeTestFlags,
      addLogFn,
      createRunFn,
      applyTestEconomyToNewRunFn,
      applyChipDeltaFn,
      updateProfileBestFn,
    });

    expect(helpers.createRun()).toEqual({ defaults: defaultPlayerStats });
    expect(createRunFn).toHaveBeenCalledWith(defaultPlayerStats);

    const run = { id: "next-run" };
    helpers.applyTestEconomyToNewRun(run);
    expect(applyTestEconomyToNewRunFn).toHaveBeenCalledWith({
      run,
      runtimeTestFlags,
      addLog: addLogFn,
    });

    helpers.gainChips(25);
    expect(applyChipDeltaFn).toHaveBeenCalledWith({
      run: state.run,
      amount: 25,
    });

    helpers.updateProfileBest(run);
    expect(updateProfileBestFn).toHaveBeenCalledWith({
      profile: state.profile,
      run,
    });
  });
});

