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

  it("maps API setters/getters while filtering non-function members", () => {
    const { bridge } = createPhaserBridgeCompat();

    bridge.setMenuActions({ startRun: () => "ok", hasSavedRun: "nope" });
    const menu = bridge.getMenuActions();
    expect(typeof menu.startRun).toBe("function");
    expect(menu.hasSavedRun).toBeNull();

    bridge.setRunApi({ getSnapshot: () => ({}) });
    const run = bridge.getRunApi();
    expect(typeof run.getSnapshot).toBe("function");
    expect(run.hit).toBeNull();
  });
});
