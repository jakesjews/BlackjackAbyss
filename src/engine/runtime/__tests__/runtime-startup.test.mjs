import { describe, expect, it, vi } from "vitest";
import { initializeRuntimeStartup } from "../bootstrap/runtime-startup.js";

describe("runtime startup bootstrap", () => {
  it("wires profile/snapshot load, API registration, lifecycle, hooks, and loop", () => {
    const state = {};
    const loadProfile = vi.fn(() => ({ id: "profile" }));
    const loadSavedRunSnapshot = vi.fn(() => ({ id: "snapshot" }));
    const registerPhaserMenuActions = vi.fn();
    const registerPhaserRunApi = vi.fn();
    const registerPhaserRewardApi = vi.fn();
    const registerPhaserShopApi = vi.fn();
    const registerPhaserOverlayApi = vi.fn();
    const requestLandscapeLock = vi.fn();
    const createLandscapeLockRequesterFn = vi.fn(() => requestLandscapeLock);
    const bindRuntimeLifecycle = vi.fn();
    const installRuntimeTestHooksFn = vi.fn();
    const startRuntimeLoop = vi.fn();

    const globalWindow = {};
    const globalDocument = {};
    const bindRuntimeWindowLifecycle = vi.fn();
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
      registerPhaserMenuActions,
      registerPhaserRunApi,
      registerPhaserRewardApi,
      registerPhaserShopApi,
      registerPhaserOverlayApi,
      createLandscapeLockRequesterFn,
      globalWindow,
      globalDocument,
      bindRuntimeLifecycle,
      bindRuntimeWindowLifecycle,
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
    expect(registerPhaserMenuActions).toHaveBeenCalledTimes(1);
    expect(registerPhaserRunApi).toHaveBeenCalledTimes(1);
    expect(registerPhaserRewardApi).toHaveBeenCalledTimes(1);
    expect(registerPhaserShopApi).toHaveBeenCalledTimes(1);
    expect(registerPhaserOverlayApi).toHaveBeenCalledTimes(1);
    expect(createLandscapeLockRequesterFn).toHaveBeenCalledWith(globalWindow);
    expect(bindRuntimeLifecycle).toHaveBeenCalledWith({
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
    expect(installRuntimeTestHooksFn).toHaveBeenCalledWith({
      publishRuntimeTestHooks,
      renderGameToText,
      advanceTime,
    });
    expect(requestLandscapeLock).toHaveBeenCalledTimes(1);
    expect(startRuntimeLoop).toHaveBeenCalledTimes(1);
  });
});
