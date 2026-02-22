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

export function createPhaserBridgeCompat({
  externalRenderModes = EXTERNAL_RENDER_MODES,
  getRuntimeApis = null,
} = {}) {
  const state = {
    mode: "menu",
    modeHandler: null,
  };
  const readRuntimeApis = typeof getRuntimeApis === "function" ? getRuntimeApis : () => null;

  function readApi(runtimeKey, methodNames) {
    const runtimeApis = readRuntimeApis();
    return asMethodMap(runtimeApis?.[runtimeKey], methodNames);
  }

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
    getMenuActions() {
      return readApi("menuActions", ["startRun", "resumeRun", "openCollection", "hasSavedRun"]);
    },
    getRunApi() {
      return readApi("runApi", [
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
    getRewardApi() {
      return readApi("rewardApi", ["getSnapshot", "prev", "next", "claim", "selectIndex", "goHome"]);
    },
    getShopApi() {
      return readApi("shopApi", ["getSnapshot", "prev", "next", "buy", "continueRun", "selectIndex", "goHome"]);
    },
    getOverlayApi() {
      return readApi("overlayApi", ["getSnapshot", "prevPage", "nextPage", "backToMenu", "restart", "confirm"]);
    },
    isExternalRendererActive(mode) {
      return typeof mode === "string" && externalRenderModes.has(mode);
    },
  };

  return {
    bridge,
  };
}
