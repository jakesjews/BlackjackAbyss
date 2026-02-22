import { describe, expect, it, vi } from "vitest";
import { bindRuntimePhaserHostLifecycle } from "../core/runtime-phaser-host.js";

describe("runtime phaser host lifecycle", () => {
  it("binds lifecycle, resize, pointer unlock, and beforeunload handlers", () => {
    const gameEventsOn = vi.fn();
    const scaleOn = vi.fn();
    const inputOn = vi.fn();
    const addEventListener = vi.fn();

    bindRuntimePhaserHostLifecycle({
      phaserGame: {
        events: { on: gameEventsOn },
        scale: { on: scaleOn },
        input: { on: inputOn },
      },
      globalWindow: { addEventListener },
      unlockAudio: vi.fn(),
      requestLandscapeLock: vi.fn(),
      resizeCanvas: vi.fn(),
      onHidden: vi.fn(),
      onVisible: vi.fn(),
      onBeforeUnload: vi.fn(),
    });

    expect(gameEventsOn).toHaveBeenCalledWith("hidden", expect.any(Function));
    expect(gameEventsOn).toHaveBeenCalledWith("visible", expect.any(Function));
    expect(scaleOn).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(inputOn).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
