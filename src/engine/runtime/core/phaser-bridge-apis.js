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
  if (!phaserBridge || typeof phaserBridge.setMenuActions !== "function") {
    return;
  }
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
  registerBridgeApi({
    bridge: phaserBridge,
    setterName: "setMenuActions",
    api,
    methods: menuApiMethods,
    label: "menu",
    assertApiContract,
  });
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
  if (!phaserBridge || typeof phaserBridge.setRunApi !== "function") {
    return;
  }
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
  registerBridgeApi({
    bridge: phaserBridge,
    setterName: "setRunApi",
    api,
    methods: runApiMethods,
    label: "run",
    assertApiContract,
  });
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
  if (!phaserBridge || typeof phaserBridge.setRewardApi !== "function") {
    return;
  }
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
  registerBridgeApi({
    bridge: phaserBridge,
    setterName: "setRewardApi",
    api,
    methods: rewardApiMethods,
    label: "reward",
    assertApiContract,
  });
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
  if (!phaserBridge || typeof phaserBridge.setShopApi !== "function") {
    return;
  }
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
  registerBridgeApi({
    bridge: phaserBridge,
    setterName: "setShopApi",
    api,
    methods: shopApiMethods,
    label: "shop",
    assertApiContract,
  });
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
  if (!phaserBridge || typeof phaserBridge.setOverlayApi !== "function") {
    return;
  }

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

  registerBridgeApi({
    bridge: phaserBridge,
    setterName: "setOverlayApi",
    api,
    methods: overlayApiMethods,
    label: "overlay",
    assertApiContract,
  });
}
