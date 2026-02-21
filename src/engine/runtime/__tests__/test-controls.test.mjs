import { describe, expect, it } from "vitest";
import { readRuntimeTestFlags } from "../testing/test-controls.js";

describe("runtime test controls", () => {
  it("returns safe defaults when flags are absent", () => {
    const flags = readRuntimeTestFlags({});
    expect(flags.economy.startingGold).toBe(0);
  });

  it("normalizes economy seed chips", () => {
    const flags = readRuntimeTestFlags({
      __ABYSS_TEST_FLAGS__: {
        economy: { startingGold: 320.9 },
      },
    });
    expect(flags.economy.startingGold).toBe(320);
  });

  it("clamps invalid economy seed values", () => {
    const flags = readRuntimeTestFlags({
      __ABYSS_TEST_FLAGS__: {
        economy: { startingGold: -50 },
      },
    });
    expect(flags.economy.startingGold).toBe(0);
  });
});
