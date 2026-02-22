import { buildPhaserRunSnapshot as buildPhaserRunSnapshotFromModule } from "./phaser-run-snapshot.js";
import {
  buildPhaserRewardSnapshot as buildPhaserRewardSnapshotFromModule,
  buildPhaserShopSnapshot as buildPhaserShopSnapshotFromModule,
} from "./shop-reward-snapshots.js";
import { buildPhaserOverlaySnapshot as buildPhaserOverlaySnapshotFromModule } from "./overlay-snapshot.js";

export function registerPhaserMenuActions({
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
  if (phaserBridge && typeof phaserBridge.setMenuActions === "function") {
    registerBridgeApi({
      bridge: phaserBridge,
      setterName: "setMenuActions",
      api,
      methods: menuApiMethods,
      label: "menu",
      assertApiContract,
    });
  }
  return api;
}

export function registerPhaserRunApi({
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
  if (phaserBridge && typeof phaserBridge.setRunApi === "function") {
    registerBridgeApi({
      bridge: phaserBridge,
      setterName: "setRunApi",
      api,
      methods: runApiMethods,
      label: "run",
      assertApiContract,
    });
  }
  return api;
}

export function registerPhaserRewardApi({
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
  if (phaserBridge && typeof phaserBridge.setRewardApi === "function") {
    registerBridgeApi({
      bridge: phaserBridge,
      setterName: "setRewardApi",
      api,
      methods: rewardApiMethods,
      label: "reward",
      assertApiContract,
    });
  }
  return api;
}

export function registerPhaserShopApi({
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
  if (phaserBridge && typeof phaserBridge.setShopApi === "function") {
    registerBridgeApi({
      bridge: phaserBridge,
      setterName: "setShopApi",
      api,
      methods: shopApiMethods,
      label: "shop",
      assertApiContract,
    });
  }
  return api;
}

export function registerPhaserOverlayApi({
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

  if (phaserBridge && typeof phaserBridge.setOverlayApi === "function") {
    registerBridgeApi({
      bridge: phaserBridge,
      setterName: "setOverlayApi",
      api,
      methods: overlayApiMethods,
      label: "overlay",
      assertApiContract,
    });
  }
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
  registerPhaserMenuActionsFn = registerPhaserMenuActions,
  registerPhaserRunApiFn = registerPhaserRunApi,
  registerPhaserRewardApiFn = registerPhaserRewardApi,
  registerPhaserShopApiFn = registerPhaserShopApi,
  registerPhaserOverlayApiFn = registerPhaserOverlayApi,
}) {
  const menuActions = setRuntimeApi(runtimeApis, "menuActions", registerPhaserMenuActionsFn({
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
  }));
  const runApi = setRuntimeApi(runtimeApis, "runApi", registerPhaserRunApiFn({
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
  }));
  const rewardApi = setRuntimeApi(runtimeApis, "rewardApi", registerPhaserRewardApiFn({
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
  }));
  const shopApi = setRuntimeApi(runtimeApis, "shopApi", registerPhaserShopApiFn({
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
  }));
  const overlayApi = setRuntimeApi(runtimeApis, "overlayApi", registerPhaserOverlayApiFn({
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
  }));

  return {
    menuActions,
    runApi,
    rewardApi,
    shopApi,
    overlayApi,
  };
}
