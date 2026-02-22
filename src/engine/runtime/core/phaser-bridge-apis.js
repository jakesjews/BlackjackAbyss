import { buildPhaserRunSnapshot as buildPhaserRunSnapshotFromModule } from "./phaser-run-snapshot.js";
import {
  buildPhaserRewardSnapshot as buildPhaserRewardSnapshotFromModule,
  buildPhaserShopSnapshot as buildPhaserShopSnapshotFromModule,
} from "./shop-reward-snapshots.js";
import { buildPhaserOverlaySnapshot as buildPhaserOverlaySnapshotFromModule } from "./overlay-snapshot.js";

export function registerPhaserMenuActions({
  state,
  unlockAudio,
  startRun,
  hasSavedRun,
  resumeSavedRun,
  saveRunSnapshot,
  openCollection,
}) {
  const api = {
    startRun: () => {
      unlockAudio();
      if (state.mode === "menu") {
        startRun();
      }
    },
    resumeRun: () => {
      unlockAudio();
      if (state.mode === "menu" && hasSavedRun()) {
        if (resumeSavedRun()) {
          saveRunSnapshot();
        }
      }
    },
    openCollection: () => {
      unlockAudio();
      if (state.mode === "menu") {
        openCollection(0);
      }
    },
    hasSavedRun: () => hasSavedRun(),
  };
  return api;
}

export function registerPhaserRunApi({
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
}) {
  const api = {
    getSnapshot: () => buildPhaserRunSnapshot(),
    hit: () => {
      unlockAudio();
      hitAction();
    },
    stand: () => {
      unlockAudio();
      standAction();
    },
    doubleDown: () => {
      unlockAudio();
      doubleAction();
    },
    split: () => {
      unlockAudio();
      splitAction();
    },
    deal: () => {
      unlockAudio();
      advanceToNextDeal();
    },
    confirmIntro: () => {
      unlockAudio();
      advanceEncounterIntro();
    },
    fireballLaunch: (attacker, target, amount) => {
      unlockAudio();
      playFireballLaunchSfx(attacker, target, amount);
    },
    fireballImpact: (amount, target) => {
      unlockAudio();
      playFireballImpactSfx(amount, target);
    },
    startEnemyDefeatTransition: () => {
      unlockAudio();
      beginQueuedEnemyDefeatTransition();
    },
    card: () => {
      unlockAudio();
      playUiSfx("card");
    },
    goHome: () => {
      unlockAudio();
      goHomeFromActiveRun();
    },
  };
  return api;
}

export function registerPhaserRewardApi({
  state,
  buildPhaserRewardSnapshot,
  moveSelection,
  claimReward,
  clampNumber,
  playUiSfx,
  unlockAudio,
  goHomeFromActiveRun,
}) {
  const api = {
    getSnapshot: () => buildPhaserRewardSnapshot(),
    prev: () => {
      if (state.mode === "reward") {
        moveSelection(-1, state.rewardOptions.length);
      }
    },
    next: () => {
      if (state.mode === "reward") {
        moveSelection(1, state.rewardOptions.length);
      }
    },
    claim: () => {
      claimReward();
    },
    selectIndex: (index) => {
      if (state.mode !== "reward" || !state.rewardOptions.length) {
        return;
      }
      const target = clampNumber(index, 0, state.rewardOptions.length - 1, state.selectionIndex);
      if (target !== state.selectionIndex) {
        state.selectionIndex = target;
        playUiSfx("select");
      }
    },
    goHome: () => {
      unlockAudio();
      goHomeFromActiveRun();
    },
  };
  return api;
}

export function registerPhaserShopApi({
  state,
  buildPhaserShopSnapshot,
  moveSelection,
  unlockAudio,
  buyShopItem,
  leaveShop,
  clampNumber,
  playUiSfx,
  goHomeFromActiveRun,
}) {
  const api = {
    getSnapshot: () => buildPhaserShopSnapshot(),
    prev: () => {
      if (state.mode === "shop") {
        moveSelection(-1, state.shopStock.length);
      }
    },
    next: () => {
      if (state.mode === "shop") {
        moveSelection(1, state.shopStock.length);
      }
    },
    buy: (index) => {
      if (state.mode !== "shop") {
        return;
      }
      unlockAudio();
      if (Number.isFinite(Number(index))) {
        buyShopItem(Number(index));
      } else {
        buyShopItem();
      }
    },
    continueRun: () => {
      if (state.mode !== "shop") {
        return;
      }
      unlockAudio();
      leaveShop();
    },
    selectIndex: (index) => {
      if (state.mode !== "shop" || !state.shopStock.length) {
        return;
      }
      const target = clampNumber(index, 0, state.shopStock.length - 1, state.selectionIndex);
      if (target !== state.selectionIndex) {
        state.selectionIndex = target;
        playUiSfx("select");
      }
    },
    goHome: () => {
      unlockAudio();
      goHomeFromActiveRun();
    },
  };
  return api;
}

export function registerPhaserOverlayApi({
  state,
  collectionEntries,
  collectionPageLayout,
  clampNumber,
  unlockAudio,
  playUiSfx,
  startRun,
  buildPhaserOverlaySnapshot,
}) {
  const collectionPages = () => {
    const entries = collectionEntries();
    const { cols, rows } = collectionPageLayout();
    const perPage = Math.max(1, cols * rows);
    return Math.max(1, Math.ceil(entries.length / perPage));
  };

  const goToMenu = () => {
    if (state.mode !== "collection") {
      return;
    }
    unlockAudio();
    playUiSfx("confirm");
    state.mode = "menu";
  };

  const restartRun = () => {
    if (state.mode !== "gameover" && state.mode !== "victory") {
      return;
    }
    unlockAudio();
    startRun();
  };

  const api = {
    getSnapshot: () => buildPhaserOverlaySnapshot(),
    prevPage: () => {
      if (state.mode !== "collection") {
        return;
      }
      const pageCount = collectionPages();
      const next = clampNumber(state.collectionPage - 1, 0, pageCount - 1, state.collectionPage);
      if (next !== state.collectionPage) {
        state.collectionPage = next;
        playUiSfx("select");
      }
    },
    nextPage: () => {
      if (state.mode !== "collection") {
        return;
      }
      const pageCount = collectionPages();
      const next = clampNumber(state.collectionPage + 1, 0, pageCount - 1, state.collectionPage);
      if (next !== state.collectionPage) {
        state.collectionPage = next;
        playUiSfx("select");
      }
    },
    backToMenu: () => {
      goToMenu();
    },
    restart: () => {
      restartRun();
    },
    confirm: () => {
      if (state.mode === "collection") {
        goToMenu();
        return;
      }
      restartRun();
    },
  };
  return api;
}

export function createRuntimeSnapshotRegistry({
  state,
  isEncounterIntroActive,
  canPlayerAct,
  canSplitCurrentHand,
  canAdvanceDeal,
  canDoubleDown,
  handTotal,
  visibleDealerTotal,
  buildTransitionSnapshot,
  getRunEventLog,
  passiveStacksForRun,
  relicRarityMeta,
  passiveDescription,
  passiveThumbUrl,
  normalizeRelicRarity,
  nonNegInt,
  clampNumber,
  shopItemName,
  shopItemDescription,
  collectionEntries,
  relicRarityMetaTable,
  buildPhaserRunSnapshotFn = buildPhaserRunSnapshotFromModule,
  buildPhaserRewardSnapshotFn = buildPhaserRewardSnapshotFromModule,
  buildPhaserShopSnapshotFn = buildPhaserShopSnapshotFromModule,
  buildPhaserOverlaySnapshotFn = buildPhaserOverlaySnapshotFromModule,
}) {
  function buildPhaserRunSnapshot() {
    return buildPhaserRunSnapshotFn({
      state,
      isEncounterIntroActive,
      canPlayerAct,
      canSplitCurrentHand,
      canAdvanceDeal,
      canDoubleDown,
      handTotal,
      visibleDealerTotal,
      buildTransitionSnapshot,
      getRunEventLog,
      passiveStacksForRun,
      relicRarityMeta,
      passiveDescription,
      passiveThumbUrl,
    });
  }

  function buildPhaserRewardSnapshot() {
    return buildPhaserRewardSnapshotFn({
      state,
      passiveDescription,
      passiveThumbUrl,
      relicRarityMeta,
      normalizeRelicRarity,
      getRunEventLog,
    });
  }

  function buildPhaserShopSnapshot() {
    return buildPhaserShopSnapshotFn({
      state,
      nonNegInt,
      clampNumber,
      shopItemName,
      shopItemDescription,
      getRunEventLog,
    });
  }

  function buildPhaserOverlaySnapshot() {
    return buildPhaserOverlaySnapshotFn({
      state,
      collectionEntries,
      relicRarityMeta: relicRarityMetaTable,
      passiveThumbUrl,
      passiveDescription,
    });
  }

  return {
    buildPhaserRunSnapshot,
    buildPhaserRewardSnapshot,
    buildPhaserShopSnapshot,
    buildPhaserOverlaySnapshot,
  };
}

function setRuntimeApi(runtimeApis, key, api) {
  if (runtimeApis && typeof runtimeApis === "object") {
    runtimeApis[key] = api && typeof api === "object" ? api : null;
  }
  return api;
}

export function registerRuntimeApis({
  runtimeApis,
  state,
  unlockAudio,
  startRun,
  hasSavedRun,
  resumeSavedRun,
  saveRunSnapshot,
  openCollection,
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
  registerPhaserMenuActionsFn = registerPhaserMenuActions,
  registerPhaserRunApiFn = registerPhaserRunApi,
  registerPhaserRewardApiFn = registerPhaserRewardApi,
  registerPhaserShopApiFn = registerPhaserShopApi,
  registerPhaserOverlayApiFn = registerPhaserOverlayApi,
}) {
  const menuActions = setRuntimeApi(runtimeApis, "menuActions", registerPhaserMenuActionsFn({
    state,
    unlockAudio,
    startRun,
    hasSavedRun,
    resumeSavedRun,
    saveRunSnapshot,
    openCollection,
  }));
  assertApiContract(menuActions, menuApiMethods, "menu");

  const runApi = setRuntimeApi(runtimeApis, "runApi", registerPhaserRunApiFn({
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
  }));
  assertApiContract(runApi, runApiMethods, "run");

  const rewardApi = setRuntimeApi(runtimeApis, "rewardApi", registerPhaserRewardApiFn({
    state,
    buildPhaserRewardSnapshot,
    moveSelection,
    claimReward,
    clampNumber,
    playUiSfx,
    unlockAudio,
    goHomeFromActiveRun,
  }));
  assertApiContract(rewardApi, rewardApiMethods, "reward");

  const shopApi = setRuntimeApi(runtimeApis, "shopApi", registerPhaserShopApiFn({
    state,
    buildPhaserShopSnapshot,
    moveSelection,
    unlockAudio,
    buyShopItem,
    leaveShop,
    clampNumber,
    playUiSfx,
    goHomeFromActiveRun,
  }));
  assertApiContract(shopApi, shopApiMethods, "shop");

  const overlayApi = setRuntimeApi(runtimeApis, "overlayApi", registerPhaserOverlayApiFn({
    state,
    collectionEntries,
    collectionPageLayout,
    clampNumber,
    unlockAudio,
    playUiSfx,
    startRun,
    buildPhaserOverlaySnapshot,
  }));
  assertApiContract(overlayApi, overlayApiMethods, "overlay");

  return {
    menuActions,
    runApi,
    rewardApi,
    shopApi,
    overlayApi,
  };
}
