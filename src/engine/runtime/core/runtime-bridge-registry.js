import {
  registerPhaserMenuActions as registerPhaserMenuActionsFromModule,
  registerPhaserOverlayApi as registerPhaserOverlayApiFromModule,
  registerPhaserRewardApi as registerPhaserRewardApiFromModule,
  registerPhaserRunApi as registerPhaserRunApiFromModule,
  registerPhaserShopApi as registerPhaserShopApiFromModule,
} from "./phaser-bridge-apis.js";

export function createRuntimeBridgeRegistry({
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
  registerPhaserMenuActionsFn = registerPhaserMenuActionsFromModule,
  registerPhaserRunApiFn = registerPhaserRunApiFromModule,
  registerPhaserRewardApiFn = registerPhaserRewardApiFromModule,
  registerPhaserShopApiFn = registerPhaserShopApiFromModule,
  registerPhaserOverlayApiFn = registerPhaserOverlayApiFromModule,
}) {
  function registerPhaserMenuActions() {
    registerPhaserMenuActionsFn({
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
    });
  }

  function registerPhaserRunApi() {
    registerPhaserRunApiFn({
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
    });
  }

  function registerPhaserRewardApi() {
    registerPhaserRewardApiFn({
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
    });
  }

  function registerPhaserShopApi() {
    registerPhaserShopApiFn({
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
    });
  }

  function registerPhaserOverlayApi() {
    registerPhaserOverlayApiFn({
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
    });
  }

  return {
    registerPhaserMenuActions,
    registerPhaserRunApi,
    registerPhaserRewardApi,
    registerPhaserShopApi,
    registerPhaserOverlayApi,
  };
}
