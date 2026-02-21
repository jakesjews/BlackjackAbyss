import { describe, expect, it, vi } from "vitest";
import { createRuntimeBridgeRegistry } from "../core/phaser-bridge-apis.js";

describe("phaser bridge registry", () => {
  it("wires Phaser bridge API registration blocks through a single registry", () => {
    const phaserBridge = {};
    const state = { mode: "menu" };
    const unlockAudio = vi.fn();
    const startRun = vi.fn();
    const hasSavedRun = vi.fn();
    const resumeSavedRun = vi.fn();
    const saveRunSnapshot = vi.fn();
    const openCollection = vi.fn();
    const registerBridgeApi = vi.fn();
    const menuApiMethods = ["startRun", "resumeRun"];
    const assertApiContract = vi.fn();
    const buildPhaserRunSnapshot = vi.fn();
    const hitAction = vi.fn();
    const standAction = vi.fn();
    const doubleAction = vi.fn();
    const splitAction = vi.fn();
    const advanceToNextDeal = vi.fn();
    const advanceEncounterIntro = vi.fn();
    const playFireballLaunchSfx = vi.fn();
    const playFireballImpactSfx = vi.fn();
    const beginQueuedEnemyDefeatTransition = vi.fn();
    const playUiSfx = vi.fn();
    const goHomeFromActiveRun = vi.fn();
    const runApiMethods = ["hit", "stand"];
    const buildPhaserRewardSnapshot = vi.fn();
    const moveSelection = vi.fn();
    const claimReward = vi.fn();
    const clampNumber = vi.fn();
    const rewardApiMethods = ["getSnapshot", "claim"];
    const buildPhaserShopSnapshot = vi.fn();
    const buyShopItem = vi.fn();
    const leaveShop = vi.fn();
    const shopApiMethods = ["buy", "continueRun"];
    const collectionEntries = vi.fn();
    const collectionPageLayout = vi.fn();
    const buildPhaserOverlaySnapshot = vi.fn();
    const overlayApiMethods = ["getSnapshot", "closeCollection"];

    const registerPhaserMenuActionsFn = vi.fn();
    const registerPhaserRunApiFn = vi.fn();
    const registerPhaserRewardApiFn = vi.fn();
    const registerPhaserShopApiFn = vi.fn();
    const registerPhaserOverlayApiFn = vi.fn();

    const registry = createRuntimeBridgeRegistry({
      phaserBridge,
      state,
      unlockAudio,
      startRun,
      hasSavedRun,
      resumeSavedRun,
      saveRunSnapshot,
      openCollection,
      registerBridgeApi,
      menuApiMethods,
      assertApiContract,
      buildPhaserRunSnapshot,
      hitAction,
      standAction,
      doubleAction,
      splitAction,
      advanceToNextDeal,
      advanceEncounterIntro,
      playFireballLaunchSfx,
      playFireballImpactSfx,
      beginQueuedEnemyDefeatTransition,
      playUiSfx,
      goHomeFromActiveRun,
      runApiMethods,
      buildPhaserRewardSnapshot,
      moveSelection,
      claimReward,
      clampNumber,
      rewardApiMethods,
      buildPhaserShopSnapshot,
      buyShopItem,
      leaveShop,
      shopApiMethods,
      collectionEntries,
      collectionPageLayout,
      buildPhaserOverlaySnapshot,
      overlayApiMethods,
      registerPhaserMenuActionsFn,
      registerPhaserRunApiFn,
      registerPhaserRewardApiFn,
      registerPhaserShopApiFn,
      registerPhaserOverlayApiFn,
    });

    registry.registerPhaserMenuActions();
    registry.registerPhaserRunApi();
    registry.registerPhaserRewardApi();
    registry.registerPhaserShopApi();
    registry.registerPhaserOverlayApi();

    expect(registerPhaserMenuActionsFn).toHaveBeenCalledWith(
      expect.objectContaining({
        phaserBridge,
        state,
        unlockAudio,
        startRun,
        hasSavedRun,
        resumeSavedRun,
        saveRunSnapshot,
        openCollection,
        registerBridgeApi,
        menuApiMethods,
        assertApiContract,
      })
    );
    expect(registerPhaserRunApiFn).toHaveBeenCalledWith(
      expect.objectContaining({
        phaserBridge,
        buildPhaserRunSnapshot,
        unlockAudio,
        hitAction,
        standAction,
        doubleAction,
        splitAction,
        advanceToNextDeal,
        advanceEncounterIntro,
        playFireballLaunchSfx,
        playFireballImpactSfx,
        beginQueuedEnemyDefeatTransition,
        playUiSfx,
        goHomeFromActiveRun,
        registerBridgeApi,
        runApiMethods,
        assertApiContract,
      })
    );
    expect(registerPhaserRewardApiFn).toHaveBeenCalledWith(
      expect.objectContaining({
        phaserBridge,
        state,
        buildPhaserRewardSnapshot,
        moveSelection,
        claimReward,
        clampNumber,
        playUiSfx,
        unlockAudio,
        goHomeFromActiveRun,
        registerBridgeApi,
        rewardApiMethods,
        assertApiContract,
      })
    );
    expect(registerPhaserShopApiFn).toHaveBeenCalledWith(
      expect.objectContaining({
        phaserBridge,
        state,
        buildPhaserShopSnapshot,
        moveSelection,
        unlockAudio,
        buyShopItem,
        leaveShop,
        clampNumber,
        playUiSfx,
        goHomeFromActiveRun,
        registerBridgeApi,
        shopApiMethods,
        assertApiContract,
      })
    );
    expect(registerPhaserOverlayApiFn).toHaveBeenCalledWith(
      expect.objectContaining({
        phaserBridge,
        state,
        collectionEntries,
        collectionPageLayout,
        clampNumber,
        unlockAudio,
        playUiSfx,
        startRun,
        buildPhaserOverlaySnapshot,
        registerBridgeApi,
        overlayApiMethods,
        assertApiContract,
      })
    );
  });
});
