const EXTERNAL_RENDER_MODES = new Set(["menu", "playing", "reward", "shop", "collection", "gameover", "victory"]);

function asMethodMap(source, methodNames) {
  if (!source || typeof source !== "object") {
    return null;
  }
  const methodMap = {};
  methodNames.forEach((methodName) => {
    methodMap[methodName] = typeof source[methodName] === "function" ? source[methodName] : null;
  });
  return methodMap;
}

export function createPhaserBridgeCompat({ externalRenderModes = EXTERNAL_RENDER_MODES } = {}) {
  const state = {
    mode: "menu",
    modeHandler: null,
    menuActions: null,
    runApi: null,
    rewardApi: null,
    shopApi: null,
    overlayApi: null,
  };

  function setMode(mode) {
    if (typeof mode !== "string" || mode.length === 0 || state.mode === mode) {
      return;
    }
    state.mode = mode;
    if (typeof state.modeHandler === "function") {
      state.modeHandler(mode);
    }
  }

  const bridge = {
    reportMode(mode) {
      setMode(mode);
    },
    setModeHandler(handler) {
      state.modeHandler = typeof handler === "function" ? handler : null;
      if (state.modeHandler) {
        state.modeHandler(state.mode);
      }
    },
    setMenuActions(actions) {
      state.menuActions = asMethodMap(actions, ["startRun", "resumeRun", "openCollection", "hasSavedRun"]);
    },
    getMenuActions() {
      return state.menuActions;
    },
    setRunApi(api) {
      state.runApi = asMethodMap(api, [
        "getSnapshot",
        "hit",
        "stand",
        "doubleDown",
        "split",
        "deal",
        "confirmIntro",
        "card",
        "fireballLaunch",
        "fireballImpact",
        "startEnemyDefeatTransition",
        "goHome",
      ]);
    },
    getRunApi() {
      return state.runApi;
    },
    setRewardApi(api) {
      state.rewardApi = asMethodMap(api, ["getSnapshot", "prev", "next", "claim", "selectIndex", "goHome"]);
    },
    getRewardApi() {
      return state.rewardApi;
    },
    setShopApi(api) {
      state.shopApi = asMethodMap(api, ["getSnapshot", "prev", "next", "buy", "continueRun", "selectIndex", "goHome"]);
    },
    getShopApi() {
      return state.shopApi;
    },
    setOverlayApi(api) {
      state.overlayApi = asMethodMap(api, ["getSnapshot", "prevPage", "nextPage", "backToMenu", "restart", "confirm"]);
    },
    getOverlayApi() {
      return state.overlayApi;
    },
    isExternalRendererActive(mode) {
      return typeof mode === "string" && externalRenderModes.has(mode);
    },
  };

  return {
    bridge,
  };
}
