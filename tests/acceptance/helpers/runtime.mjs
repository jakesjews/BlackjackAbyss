const RUN_STORAGE_KEY = "blackjack-abyss.run.v1";

function listify(value) {
  return Array.isArray(value) ? value : [value];
}

export async function advanceTime(page, ms = 180) {
  await page.evaluate(async (delay) => {
    if (typeof window.advanceTime === "function") {
      await window.advanceTime(delay);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }, ms);
}

export async function readState(page) {
  const payload = await page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      return "{}";
    }
    return window.render_game_to_text();
  });
  try {
    return JSON.parse(payload || "{}");
  } catch {
    return {};
  }
}

export async function readStoredRunSnapshot(page) {
  return page.evaluate((runStorageKey) => {
    try {
      const raw = window.localStorage.getItem(runStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, RUN_STORAGE_KEY);
}

export async function waitForMode(page, modes, { maxTicks = 160, stepMs = 140 } = {}) {
  const allowed = new Set(listify(modes));
  for (let i = 0; i < maxTicks; i += 1) {
    const state = await readState(page);
    if (allowed.has(state.mode)) {
      return state.mode;
    }
    await advanceTime(page, stepMs);
  }
  return null;
}

export async function readBridgeContracts(page) {
  return page.evaluate(() => {
    const bridge = window.__ABYSS_PHASER_BRIDGE__ || null;
    const runtime = window.__ABYSS_ENGINE_RUNTIME__ || null;
    const runtimeApis = runtime?.apis && typeof runtime.apis === "object" ? runtime.apis : null;
    const extractMethods = (obj) =>
      obj && typeof obj === "object"
        ? Object.keys(obj).filter((name) => typeof obj[name] === "function").sort()
        : [];

    const menuApi =
      runtimeApis?.menuActions || (bridge && typeof bridge.getMenuActions === "function" ? bridge.getMenuActions() : null);
    const runApi = runtimeApis?.runApi || (bridge && typeof bridge.getRunApi === "function" ? bridge.getRunApi() : null);
    const rewardApi =
      runtimeApis?.rewardApi || (bridge && typeof bridge.getRewardApi === "function" ? bridge.getRewardApi() : null);
    const shopApi =
      runtimeApis?.shopApi || (bridge && typeof bridge.getShopApi === "function" ? bridge.getShopApi() : null);
    const overlayApi =
      runtimeApis?.overlayApi || (bridge && typeof bridge.getOverlayApi === "function" ? bridge.getOverlayApi() : null);

    return {
      phaserReady: Boolean(window.__ABYSS_PHASER_GAME__),
      runtimeReady: Boolean(runtime),
      bridgeReady: Boolean(bridge),
      menuMethods: extractMethods(menuApi),
      runMethods: extractMethods(runApi),
      rewardMethods: extractMethods(rewardApi),
      shopMethods: extractMethods(shopApi),
      overlayMethods: extractMethods(overlayApi),
      hasRenderHook: typeof window.render_game_to_text === "function",
      hasAdvanceHook: typeof window.advanceTime === "function",
    };
  });
}

async function invokeRuntimeApi(page, runtimeApiName, methodName, methodArgs) {
  return page.evaluate(
    ({ apiName, method, args }) => {
      const runtimeApi = window.__ABYSS_ENGINE_RUNTIME__?.apis?.[apiName];
      if (!runtimeApi || typeof runtimeApi[method] !== "function") {
        return null;
      }
      return runtimeApi[method](...args);
    },
    {
      apiName: runtimeApiName,
      method: methodName,
      args: methodArgs,
    }
  );
}

export async function menuAction(page, method, ...args) {
  return invokeRuntimeApi(page, "menuActions", method, args);
}

export async function runAction(page, method, ...args) {
  return invokeRuntimeApi(page, "runApi", method, args);
}

export async function rewardAction(page, method, ...args) {
  return invokeRuntimeApi(page, "rewardApi", method, args);
}

export async function shopAction(page, method, ...args) {
  return invokeRuntimeApi(page, "shopApi", method, args);
}

export async function playSingleHand(page, { stepMs = 170, maxSteps = 220 } = {}) {
  const startSnapshot = await readStoredRunSnapshot(page);
  const startHands = Number(startSnapshot?.run?.totalHands || 0);

  for (let step = 0; step < maxSteps; step += 1) {
    const state = await readState(page);
    if (state.mode === "reward" || state.mode === "shop" || state.mode === "gameover" || state.mode === "victory") {
      const persisted = await readStoredRunSnapshot(page);
      return {
        mode: state.mode,
        totalHands: Number(persisted?.run?.totalHands || 0),
        startHands,
        timedOut: false,
      };
    }

    if (state.mode !== "playing") {
      await advanceTime(page, stepMs);
      continue;
    }

    const runSnapshot = await runAction(page, "getSnapshot");
    if (!runSnapshot) {
      await advanceTime(page, stepMs);
      continue;
    }

    if (runSnapshot.intro?.active) {
      await runAction(page, "confirmIntro");
      await advanceTime(page, stepMs);
    } else if (runSnapshot.status?.canAct) {
      const playerTotal = Number(runSnapshot.totals?.player || 0);
      if (runSnapshot.status?.canDouble && playerTotal >= 9 && playerTotal <= 11) {
        await runAction(page, "doubleDown");
      } else if (playerTotal >= 17) {
        await runAction(page, "stand");
      } else {
        await runAction(page, "hit");
      }
      await advanceTime(page, stepMs);
    } else if (runSnapshot.status?.canDeal) {
      await runAction(page, "deal");
      await advanceTime(page, stepMs);
    } else if (
      Number(runSnapshot.enemy?.hp || 0) <= 0 &&
      (runSnapshot.phase === "done" || runSnapshot.transition?.waiting)
    ) {
      await runAction(page, "startEnemyDefeatTransition");
      await advanceTime(page, stepMs);
    } else {
      await advanceTime(page, stepMs);
    }

    const persisted = await readStoredRunSnapshot(page);
    const currentHands = Number(persisted?.run?.totalHands || 0);
    if (currentHands >= startHands + 1) {
      const latest = await readState(page);
      return {
        mode: latest.mode,
        totalHands: currentHands,
        startHands,
        timedOut: false,
      };
    }
  }

  const endSnapshot = await readStoredRunSnapshot(page);
  const endState = await readState(page);
  return {
    mode: endState.mode,
    totalHands: Number(endSnapshot?.run?.totalHands || 0),
    startHands,
    timedOut: true,
  };
}

export async function playUntilMode(page, modes, { maxHands = 8, stepMs = 170, maxStepsPerHand = 220 } = {}) {
  const targets = new Set(listify(modes));
  let lastState = await readState(page);
  if (targets.has(lastState.mode)) {
    return {
      mode: lastState.mode,
      timedOut: false,
      handsPlayed: 0,
      state: lastState,
    };
  }

  for (let hand = 0; hand < maxHands; hand += 1) {
    const handResult = await playSingleHand(page, {
      stepMs,
      maxSteps: maxStepsPerHand,
    });
    lastState = await readState(page);
    if (targets.has(lastState.mode)) {
      return {
        mode: lastState.mode,
        timedOut: false,
        handsPlayed: hand + 1,
        handResult,
        state: lastState,
      };
    }
    if (handResult.timedOut) {
      return {
        mode: lastState.mode,
        timedOut: true,
        handsPlayed: hand + 1,
        handResult,
        state: lastState,
      };
    }
    if (lastState.mode === "gameover" || lastState.mode === "victory") {
      return {
        mode: lastState.mode,
        timedOut: false,
        handsPlayed: hand + 1,
        handResult,
        state: lastState,
      };
    }

    for (let settle = 0; settle < 40; settle += 1) {
      await advanceTime(page, stepMs);
      lastState = await readState(page);
      if (targets.has(lastState.mode)) {
        return {
          mode: lastState.mode,
          timedOut: false,
          handsPlayed: hand + 1,
          handResult,
          state: lastState,
        };
      }
      if (lastState.mode === "gameover" || lastState.mode === "victory") {
        return {
          mode: lastState.mode,
          timedOut: false,
          handsPlayed: hand + 1,
          handResult,
          state: lastState,
        };
      }
    }
  }

  return {
    mode: lastState.mode,
    timedOut: true,
    handsPlayed: maxHands,
    state: lastState,
  };
}

export async function goHomeFromActiveMode(page) {
  const state = await readState(page);
  if (state.mode === "playing") {
    await runAction(page, "goHome");
  } else if (state.mode === "reward") {
    await rewardAction(page, "goHome");
  } else if (state.mode === "shop") {
    await shopAction(page, "goHome");
  }
  return waitForMode(page, "menu", { maxTicks: 80, stepMs: 120 });
}
