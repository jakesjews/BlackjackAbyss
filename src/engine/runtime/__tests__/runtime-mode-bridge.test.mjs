import { describe, expect, it, vi } from "vitest";
import { installRuntimeModeBridge } from "../core/runtime-mode-bridge.js";

describe("runtime mode bridge", () => {
  it("reports initial mode and resizes only when mode changes", () => {
    const state = { mode: "menu" };
    const reportMode = vi.fn();
    const resizeCanvas = vi.fn();

    installRuntimeModeBridge({
      state,
      reportMode,
      resizeCanvas,
    });

    expect(reportMode).toHaveBeenCalledWith("menu");
    expect(resizeCanvas).not.toHaveBeenCalled();

    state.mode = "menu";
    state.mode = "";
    state.mode = "playing";

    expect(reportMode).toHaveBeenCalledTimes(2);
    expect(reportMode).toHaveBeenLastCalledWith("playing");
    expect(resizeCanvas).toHaveBeenCalledTimes(1);
  });

  it("falls back to menu when initial mode is missing", () => {
    const state = {};
    const reportMode = vi.fn();

    installRuntimeModeBridge({
      state,
      reportMode,
      resizeCanvas: () => {},
    });

    expect(state.mode).toBe("menu");
    expect(reportMode).toHaveBeenCalledWith("menu");
  });
});
