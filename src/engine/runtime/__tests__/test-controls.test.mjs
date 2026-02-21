import { describe, expect, it } from "vitest";
import { readRuntimeTestFlags } from "../testing/test-controls.js";

describe("runtime test controls", () => {
  it("returns safe defaults when flags are absent", () => {
    const flags = readRuntimeTestFlags({});
    expect(flags.fastPath.enabled).toBe(false);
    expect(flags.fastPath.afterHands).toBe(1);
    expect(flags.fastPath.target).toBe("none");
    expect(flags.economy.startingGold).toBe(0);
  });

  it("normalizes economy seed chips and fast-path inputs", () => {
    const flags = readRuntimeTestFlags({
      __ABYSS_TEST_FLAGS__: {
        fastPath: { enabled: true, afterHands: 2.8, target: "shop" },
        economy: { startingGold: 320.9 },
      },
    });
    expect(flags.fastPath.enabled).toBe(true);
    expect(flags.fastPath.afterHands).toBe(2);
    expect(flags.fastPath.target).toBe("shop");
    expect(flags.economy.startingGold).toBe(320);
  });

  it("disables invalid fast-path target while preserving economy flags", () => {
    const flags = readRuntimeTestFlags({
      __ABYSS_TEST_FLAGS__: {
        fastPath: { enabled: true, afterHands: 0, target: "invalid" },
        economy: { startingGold: -50 },
      },
    });
    expect(flags.fastPath.enabled).toBe(false);
    expect(flags.fastPath.afterHands).toBe(1);
    expect(flags.fastPath.target).toBe("none");
    expect(flags.economy.startingGold).toBe(0);
  });
});
