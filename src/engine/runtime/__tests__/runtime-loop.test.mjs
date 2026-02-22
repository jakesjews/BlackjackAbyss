import { describe, expect, it, vi } from "vitest";
import { createRuntimeLoop } from "../core/runtime-loop.js";

function createEnv(overrides = {}) {
  const state = { viewport: null };
  const update = vi.fn();
  const render = vi.fn();
  const phaserGame = {
    scale: {
      parentSize: {
        width: 900,
        height: 500,
      },
      gameSize: {
        width: 1280,
        height: 720,
      },
      resize: vi.fn(),
    },
  };

  return {
    state,
    update,
    render,
    phaserGame,
    ...overrides,
  };
}

describe("runtime loop module", () => {
  it("advanceTime performs deterministic 60 FPS stepping", () => {
    const env = createEnv();
    const loop = createRuntimeLoop({
      ...env,
      width: 1280,
      height: 720,
      runtimeContext: {
        setStepHandler: () => {},
      },
    });

    loop.advanceTime(1000);
    expect(env.update).toHaveBeenCalledTimes(60);
    expect(env.render).toHaveBeenCalledTimes(1);
    expect(env.update).toHaveBeenNthCalledWith(1, 1 / 60);
  });

  it("resizeCanvas updates viewport and resizes Phaser game when dimensions changed", () => {
    const resize = vi.fn();
    const env = createEnv({
      phaserGame: {
        scale: {
          parentSize: { width: 801.9, height: 611.4 },
          gameSize: { width: 1280, height: 720 },
          resize,
        },
      },
    });

    const loop = createRuntimeLoop({
      ...env,
      width: 1280,
      height: 720,
      runtimeContext: {
        setStepHandler: () => {},
      },
    });

    loop.resizeCanvas();

    expect(env.state.viewport).toEqual({
      width: 801,
      height: 611,
      scale: 1,
      cropWorldX: 0,
      portraitZoomed: false,
    });
    expect(resize).toHaveBeenCalledWith(801, 611);
  });

  it("startRuntimeLoop uses Phaser step handler when available", () => {
    let handler = null;
    const env = createEnv({
      runtimeContext: {
        setStepHandler: (fn) => {
          handler = fn;
        },
      },
    });

    const loop = createRuntimeLoop({
      ...env,
      width: 1280,
      height: 720,
    });

    loop.startRuntimeLoop();
    expect(env.render).toHaveBeenCalledTimes(1);
    expect(handler).toBeTypeOf("function");

    handler(0.016, 1016);
    expect(env.update).toHaveBeenCalledWith(0.016);

    handler(NaN, undefined);
    expect(env.update).toHaveBeenLastCalledWith(1 / 60);

    handler(NaN, 1116);
    expect(env.update).toHaveBeenLastCalledWith(0.05);
  });

  it("startRuntimeLoop throws when step-handler wiring is unavailable", () => {
    const env = createEnv();
    const loop = createRuntimeLoop({
      ...env,
      width: 1280,
      height: 720,
      runtimeContext: null,
    });

    expect(() => loop.startRuntimeLoop()).toThrow("Runtime loop requires runtimeContext.setStepHandler.");
  });
});
