import { describe, expect, it, vi } from "vitest";
import {
  bindRuntimeLifecycle,
  handleRuntimeBeforeUnload,
  handleRuntimeHidden,
  handleRuntimeVisible,
} from "../bootstrap/runtime-lifecycle.js";

describe("runtime lifecycle module", () => {
  it("handleRuntimeHidden saves state and pauses audio only when document is hidden", () => {
    const suspend = vi.fn(() => Promise.resolve());
    const pause = vi.fn();
    const saveRunSnapshot = vi.fn();
    const saveProfile = vi.fn();
    const state = {
      audio: {
        context: { state: "running", suspend },
        musicElement: { paused: false, pause },
      },
    };

    const globalDocument = { hidden: true };
    handleRuntimeHidden({
      globalDocument,
      state,
      saveRunSnapshot,
      saveProfile,
    });

    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
    expect(saveProfile).toHaveBeenCalledTimes(1);
    expect(suspend).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);

    globalDocument.hidden = false;
    handleRuntimeHidden({
      globalDocument,
      state,
      saveRunSnapshot,
      saveProfile,
    });

    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
    expect(saveProfile).toHaveBeenCalledTimes(1);
  });

  it("handleRuntimeVisible resumes audio graph and restarts paused music", async () => {
    const play = vi.fn(() => Promise.resolve());
    const resume = vi.fn(() => Promise.resolve());
    const requestLandscapeLock = vi.fn();
    const state = {
      audio: {
        enabled: true,
        started: true,
        context: { state: "suspended", resume },
        musicElement: { paused: true, play },
      },
    };

    handleRuntimeVisible({
      state,
      requestLandscapeLock,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(resume).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
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
    const bindRuntimeWindowLifecycle = vi.fn((payload) => {
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
        musicElement: null,
      },
    };
    const globalWindow = {};
    const globalDocument = { hidden: true };

    bindRuntimeLifecycle({
      bindRuntimeWindowLifecycle,
      globalWindow,
      globalDocument,
      unlockAudio,
      requestLandscapeLock,
      resizeCanvas,
      state,
      saveRunSnapshot,
      saveProfile,
    });

    expect(bindRuntimeWindowLifecycle).toHaveBeenCalledTimes(1);
    expect(captured.globalWindow).toBe(globalWindow);
    expect(captured.globalDocument).toBe(globalDocument);
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
