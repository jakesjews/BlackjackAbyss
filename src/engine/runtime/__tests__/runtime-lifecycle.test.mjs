import { describe, expect, it, vi } from "vitest";
import {
  bindRuntimeLifecycle,
  handleRuntimeBeforeUnload,
  handleRuntimeHidden,
  handleRuntimeVisible,
} from "../core/runtime-lifecycle.js";

describe("runtime lifecycle module", () => {
  it("handleRuntimeHidden always saves state and pauses audio", () => {
    const suspend = vi.fn(() => Promise.resolve());
    const pause = vi.fn();
    const saveRunSnapshot = vi.fn();
    const saveProfile = vi.fn();
    const state = {
      audio: {
        context: { state: "running", suspend },
        musicSound: { isPlaying: true, pause },
      },
    };

    handleRuntimeHidden({
      state,
      saveRunSnapshot,
      saveProfile,
    });

    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
    expect(saveProfile).toHaveBeenCalledTimes(1);
    expect(suspend).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);

    handleRuntimeHidden({
      state,
      saveRunSnapshot,
      saveProfile,
    });

    expect(saveRunSnapshot).toHaveBeenCalledTimes(2);
    expect(saveProfile).toHaveBeenCalledTimes(2);
  });

  it("handleRuntimeVisible resumes audio graph and resumes paused music", async () => {
    const resumeMusic = vi.fn();
    const resumeContext = vi.fn(() => Promise.resolve());
    const requestLandscapeLock = vi.fn();
    const state = {
      audio: {
        enabled: true,
        started: true,
        context: { state: "suspended", resume: resumeContext },
        musicSound: {
          isPlaying: false,
          isPaused: true,
          resume: resumeMusic,
        },
      },
    };

    handleRuntimeVisible({
      state,
      requestLandscapeLock,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(resumeContext).toHaveBeenCalledTimes(1);
    expect(resumeMusic).toHaveBeenCalledTimes(1);
    expect(requestLandscapeLock).toHaveBeenCalledTimes(1);
  });

  it("handleRuntimeVisible falls back to play when resume is unavailable", async () => {
    const play = vi.fn(() => Promise.resolve());
    const requestLandscapeLock = vi.fn();
    const state = {
      audio: {
        enabled: true,
        started: true,
        context: { state: "suspended", resume: vi.fn(() => Promise.resolve()) },
        musicSound: {
          isPlaying: false,
          isPaused: false,
          volume: 0.2,
          play,
        },
      },
    };

    handleRuntimeVisible({
      state,
      requestLandscapeLock,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(play).toHaveBeenCalledWith({ loop: true, volume: 0.2 });
    expect(requestLandscapeLock).toHaveBeenCalledTimes(1);
  });

  it("handleRuntimeBeforeUnload persists run and profile", () => {
    const saveRunSnapshot = vi.fn();
    const saveProfile = vi.fn();
    handleRuntimeBeforeUnload({
      saveRunSnapshot,
      saveProfile,
    });
    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
    expect(saveProfile).toHaveBeenCalledTimes(1);
  });

  it("bindRuntimeLifecycle wires callbacks into lifecycle binder", () => {
    const captured = {};
    const bindRuntimeHostLifecycle = vi.fn((payload) => {
      Object.assign(captured, payload);
    });
    const saveRunSnapshot = vi.fn();
    const saveProfile = vi.fn();
    const requestLandscapeLock = vi.fn();
    const resizeCanvas = vi.fn();
    const unlockAudio = vi.fn();
    const state = {
      audio: {
        enabled: false,
        started: false,
        context: null,
        musicSound: null,
      },
    };
    const globalWindow = {};
    const phaserGame = { id: "phaser-game" };

    bindRuntimeLifecycle({
      bindRuntimeHostLifecycle,
      phaserGame,
      globalWindow,
      unlockAudio,
      requestLandscapeLock,
      resizeCanvas,
      state,
      saveRunSnapshot,
      saveProfile,
    });

    expect(bindRuntimeHostLifecycle).toHaveBeenCalledTimes(1);
    expect(captured.phaserGame).toBe(phaserGame);
    expect(captured.globalWindow).toBe(globalWindow);
    expect(captured.unlockAudio).toBe(unlockAudio);
    expect(captured.requestLandscapeLock).toBe(requestLandscapeLock);
    expect(captured.resizeCanvas).toBe(resizeCanvas);
    expect(captured.onHidden).toBeTypeOf("function");
    expect(captured.onVisible).toBeTypeOf("function");
    expect(captured.onBeforeUnload).toBeTypeOf("function");

    captured.onHidden();
    captured.onVisible();
    captured.onBeforeUnload();

    expect(saveRunSnapshot).toHaveBeenCalledTimes(2);
    expect(saveProfile).toHaveBeenCalledTimes(2);
    expect(requestLandscapeLock).toHaveBeenCalledTimes(1);
  });
});
