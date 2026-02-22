import { describe, expect, it, vi } from "vitest";
import { initializeRuntimeStartup } from "../core/runtime-startup.js";

describe("runtime startup bootstrap", () => {
  it("wires profile/snapshot load, API registration, lifecycle, hooks, and loop", () => {
    const state = {};
    const loadProfile = vi.fn(() => ({ id: "profile" }));
    const loadSavedRunSnapshot = vi.fn(() => ({ id: "snapshot" }));
    const registerRuntimeApisFn = vi.fn();
    const runtimeApiRegistration = { id: "runtime-api-registration" };
    const requestLandscapeLock = vi.fn();
    const createLandscapeLockRequesterFn = vi.fn(() => requestLandscapeLock);
    const bindRuntimeLifecycle = vi.fn();
    const phaserGame = { id: "phaser-game" };
    const installRuntimeTestHooksFn = vi.fn();
    const startRuntimeLoop = vi.fn();

    const globalWindow = {};
    const bindRuntimeHostLifecycle = vi.fn();
    const unlockAudio = vi.fn();
    const resizeCanvas = vi.fn();
    const saveRunSnapshot = vi.fn();
    const saveProfile = vi.fn();
    const publishRuntimeTestHooks = vi.fn();
    const renderGameToText = vi.fn();
    const advanceTime = vi.fn();

    initializeRuntimeStartup({
      state,
      loadProfile,
      loadSavedRunSnapshot,
      registerRuntimeApisFn,
      runtimeApiRegistration,
      createLandscapeLockRequesterFn,
      globalWindow,
      phaserGame,
      bindRuntimeLifecycle,
      bindRuntimeHostLifecycle,
      unlockAudio,
      resizeCanvas,
      saveRunSnapshot,
      saveProfile,
      installRuntimeTestHooksFn,
      publishRuntimeTestHooks,
      renderGameToText,
      advanceTime,
      startRuntimeLoop,
    });

    expect(state.profile).toEqual({ id: "profile" });
    expect(state.savedRunSnapshot).toEqual({ id: "snapshot" });
    expect(registerRuntimeApisFn).toHaveBeenCalledTimes(1);
    expect(registerRuntimeApisFn).toHaveBeenCalledWith(runtimeApiRegistration);
    expect(createLandscapeLockRequesterFn).toHaveBeenCalledWith(globalWindow);
    expect(bindRuntimeLifecycle).toHaveBeenCalledWith({
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
    expect(installRuntimeTestHooksFn).toHaveBeenCalledWith({
      publishRuntimeTestHooks,
      renderGameToText,
      advanceTime,
    });
    expect(requestLandscapeLock).toHaveBeenCalledTimes(1);
    expect(startRuntimeLoop).toHaveBeenCalledTimes(1);
  });
});
