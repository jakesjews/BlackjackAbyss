import { describe, expect, it, vi } from "vitest";
import { createRuntimeLoop } from "../core/runtime-loop.js";

function createEnv(overrides = {}) {
  const state = { viewport: null };
  const gameShell = { style: {} };
  const canvas = { style: {} };
  const update = vi.fn();
  const render = vi.fn();
  const globalDocument = {
    documentElement: {
      clientWidth: 900,
      clientHeight: 500,
    },
  };
  const globalWindow = {
    innerWidth: 1024,
    innerHeight: 768,
    visualViewport: null,
    __ABYSS_PHASER_GAME__: null,
  };

  return {
    state,
    gameShell,
    canvas,
    update,
    render,
    globalWindow,
    globalDocument,
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
      phaserBridge: null,
      performanceNow: () => 0,
      requestAnimationFrameFn: () => {},
    });

    loop.advanceTime(1000);
    expect(env.update).toHaveBeenCalledTimes(60);
    expect(env.render).toHaveBeenCalledTimes(1);
    expect(env.update).toHaveBeenNthCalledWith(1, 1 / 60);
  });

  it("resizeCanvas updates viewport and resizes Phaser game when dimensions changed", () => {
    const resize = vi.fn();
    const env = createEnv({
      globalWindow: {
        innerWidth: 640,
        innerHeight: 480,
        visualViewport: { width: 801.9, height: 611.4 },
        __ABYSS_PHASER_GAME__: {
          scale: {
            gameSize: { width: 1280, height: 720 },
            resize,
          },
        },
      },
    });

    const loop = createRuntimeLoop({
      ...env,
      width: 1280,
      height: 720,
      phaserBridge: null,
      performanceNow: () => 0,
      requestAnimationFrameFn: () => {},
    });

    loop.resizeCanvas();

    expect(env.gameShell.style.width).toBe("801px");
    expect(env.gameShell.style.height).toBe("611px");
    expect(env.canvas.style.width).toBe("801px");
    expect(env.canvas.style.height).toBe("611px");
    expect(env.canvas.style.left).toBe("0px");
    expect(env.canvas.style.top).toBe("0px");
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
      phaserBridge: {
        setStepHandler: (fn) => {
          handler = fn;
        },
      },
    });

    const nowValues = [1000, 1100];
    const loop = createRuntimeLoop({
      ...env,
      width: 1280,
      height: 720,
      performanceNow: () => nowValues.shift() ?? 1100,
      requestAnimationFrameFn: vi.fn(),
    });

    loop.startRuntimeLoop();
    expect(env.render).toHaveBeenCalledTimes(1);
    expect(handler).toBeTypeOf("function");

    handler(0.016, 1016);
    expect(env.update).toHaveBeenCalledWith(0.016);

    handler(NaN, undefined);
    expect(env.update).toHaveBeenLastCalledWith(0.05);
  });

  it("startRuntimeLoop falls back to requestAnimationFrame loop", () => {
    let scheduled = null;
    const requestAnimationFrameFn = vi.fn((callback) => {
      scheduled = callback;
      return 1;
    });
    const env = createEnv();
    const loop = createRuntimeLoop({
      ...env,
      width: 1280,
      height: 720,
      phaserBridge: null,
      performanceNow: () => 1000,
      requestAnimationFrameFn,
    });

    loop.startRuntimeLoop();
    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);
    expect(scheduled).toBeTypeOf("function");

    scheduled(1016);
    expect(env.update).toHaveBeenLastCalledWith(0.016);
    expect(env.render).toHaveBeenCalledTimes(2);
    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(2);
  });
});
