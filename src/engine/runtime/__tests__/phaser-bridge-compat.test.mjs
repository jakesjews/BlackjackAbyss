import { describe, expect, it, vi } from "vitest";
import { createPhaserBridgeCompat } from "../compat/phaser-bridge-compat.js";

describe("phaser bridge compatibility facade", () => {
  it("exposes mode reporting and handler callbacks", () => {
    const { bridge } = createPhaserBridgeCompat();
    const modeHandler = vi.fn();

    bridge.setModeHandler(modeHandler);
    expect(modeHandler).toHaveBeenCalledWith("menu");

    bridge.reportMode("playing");
    expect(modeHandler).toHaveBeenLastCalledWith("playing");
    expect(bridge.isExternalRendererActive("playing")).toBe(true);
    expect(bridge.isExternalRendererActive("unknown")).toBe(false);
  });

  it("reads runtime APIs through compatibility getters while filtering non-function members", () => {
    const runtimeApis = {
      menuActions: { startRun: () => "ok", hasSavedRun: "nope" },
      runApi: { getSnapshot: () => ({}) },
    };
    const { bridge } = createPhaserBridgeCompat({
      getRuntimeApis: () => runtimeApis,
    });

    const menu = bridge.getMenuActions();
    expect(typeof menu.startRun).toBe("function");
    expect(menu.hasSavedRun).toBeNull();

    const run = bridge.getRunApi();
    expect(typeof run.getSnapshot).toBe("function");
    expect(run.hit).toBeNull();
  });
});
