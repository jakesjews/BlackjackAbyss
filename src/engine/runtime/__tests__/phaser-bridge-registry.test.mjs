import { describe, expect, it, vi } from "vitest";
import { registerRuntimeApis } from "../core/phaser-bridge-apis.js";

describe("phaser bridge registry", () => {
  it("registers runtime APIs in one pass and mirrors them onto runtime.apis", () => {
    const phaserBridge = {};
    const runtimeApis = {};
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

    const menuApi = { startRun: vi.fn() };
    const runApi = { getSnapshot: vi.fn() };
    const rewardApi = { claim: vi.fn() };
    const shopApi = { buy: vi.fn() };
    const overlayApi = { confirm: vi.fn() };
    const registerPhaserMenuActionsFn = vi.fn(() => menuApi);
    const registerPhaserRunApiFn = vi.fn(() => runApi);
    const registerPhaserRewardApiFn = vi.fn(() => rewardApi);
    const registerPhaserShopApiFn = vi.fn(() => shopApi);
    const registerPhaserOverlayApiFn = vi.fn(() => overlayApi);

    const registered = registerRuntimeApis({
      phaserBridge,
      runtimeApis,
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

    expect(registered).toMatchObject({
      menuActions: menuApi,
      runApi,
      rewardApi,
      shopApi,
      overlayApi,
    });
    expect(runtimeApis).toMatchObject({
      menuActions: menuApi,
      runApi,
      rewardApi,
      shopApi,
      overlayApi,
    });

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
