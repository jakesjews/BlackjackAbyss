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

  it("routes tick through setStepHandler with safe delta conversion", () => {
    const { bridge, tick } = createPhaserBridgeCompat();
    const stepHandler = vi.fn();

    bridge.setStepHandler(stepHandler);
    tick(250, 1234);

    expect(stepHandler).toHaveBeenCalledWith(0.25, 1234);
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

  it("provides canvas via attached game", () => {
    const { bridge, setGame } = createPhaserBridgeCompat();
    const canvas = { id: "game-canvas" };

    setGame({ canvas });
    expect(bridge.getCanvas()).toBe(canvas);
  });
});
