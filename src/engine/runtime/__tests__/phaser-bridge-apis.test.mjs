import { describe, expect, it } from "vitest";
import {
  registerPhaserMenuActions,
  registerPhaserOverlayApi,
  registerPhaserRewardApi,
  registerPhaserRunApi,
  registerPhaserShopApi,
} from "../core/phaser-bridge-apis.js";

function createRegisterBridgeApiSpy() {
  const calls = [];
  const registerBridgeApi = ({ bridge, setterName, api, ...rest }) => {
    calls.push({ setterName, api, ...rest });
    if (bridge && typeof bridge[setterName] === "function") {
      bridge[setterName](api);
    }
  };
  return { calls, registerBridgeApi };
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}

describe("phaser bridge api registrars", () => {
  it("registers menu API and preserves mode guards", () => {
    const state = { mode: "menu" };
    let menuApi = null;
    const bridge = { setMenuActions: (api) => (menuApi = api) };
    const counters = {
      unlockAudio: 0,
      startRun: 0,
      resumeSavedRun: 0,
      saveRunSnapshot: 0,
      openCollection: 0,
    };
    const { calls, registerBridgeApi } = createRegisterBridgeApiSpy();

    registerPhaserMenuActions({
      phaserBridge: bridge,
      state,
      unlockAudio: () => {
        counters.unlockAudio += 1;
      },
      startRun: () => {
        counters.startRun += 1;
      },
      hasSavedRun: () => true,
      resumeSavedRun: () => {
        counters.resumeSavedRun += 1;
        return true;
      },
      saveRunSnapshot: () => {
        counters.saveRunSnapshot += 1;
      },
      openCollection: () => {
        counters.openCollection += 1;
      },
      registerBridgeApi,
      menuApiMethods: ["startRun", "resumeRun", "openCollection", "hasSavedRun"],
      assertApiContract: () => {},
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].setterName).toBe("setMenuActions");
    expect(menuApi).toBeTruthy();

    menuApi.startRun();
    menuApi.resumeRun();
    menuApi.openCollection();
    expect(menuApi.hasSavedRun()).toBe(true);

    state.mode = "playing";
    menuApi.openCollection();
    expect(counters).toMatchObject({
      unlockAudio: 4,
      startRun: 1,
      resumeSavedRun: 1,
      saveRunSnapshot: 1,
      openCollection: 1,
    });
  });

  it("registers run API and wires all actions", () => {
    let runApi = null;
    const bridge = { setRunApi: (api) => (runApi = api) };
    const calls = {
      unlockAudio: 0,
      hit: 0,
      stand: 0,
      doubleDown: 0,
      split: 0,
      deal: 0,
      confirmIntro: 0,
      launch: null,
      impact: null,
      enemyDefeat: 0,
      card: null,
      goHome: 0,
    };
    const { registerBridgeApi } = createRegisterBridgeApiSpy();

    registerPhaserRunApi({
      phaserBridge: bridge,
      buildPhaserRunSnapshot: () => ({ mode: "playing" }),
      unlockAudio: () => {
        calls.unlockAudio += 1;
      },
      hitAction: () => {
        calls.hit += 1;
      },
      standAction: () => {
        calls.stand += 1;
      },
      doubleAction: () => {
        calls.doubleDown += 1;
      },
      splitAction: () => {
        calls.split += 1;
      },
      advanceToNextDeal: () => {
        calls.deal += 1;
      },
      advanceEncounterIntro: () => {
        calls.confirmIntro += 1;
      },
      playFireballLaunchSfx: (attacker, target, amount) => {
        calls.launch = { attacker, target, amount };
      },
      playFireballImpactSfx: (amount, target) => {
        calls.impact = { amount, target };
      },
      beginQueuedEnemyDefeatTransition: () => {
        calls.enemyDefeat += 1;
      },
      playUiSfx: (kind) => {
        calls.card = kind;
      },
      goHomeFromActiveRun: () => {
        calls.goHome += 1;
      },
      registerBridgeApi,
      runApiMethods: [
        "getSnapshot",
        "hit",
        "stand",
        "doubleDown",
        "split",
        "deal",
        "confirmIntro",
        "fireballLaunch",
        "fireballImpact",
        "startEnemyDefeatTransition",
        "card",
        "goHome",
      ],
      assertApiContract: () => {},
    });

    expect(runApi.getSnapshot()).toEqual({ mode: "playing" });
    runApi.hit();
    runApi.stand();
    runApi.doubleDown();
    runApi.split();
    runApi.deal();
    runApi.confirmIntro();
    runApi.fireballLaunch("player", "enemy", 3);
    runApi.fireballImpact(4, "enemy");
    runApi.startEnemyDefeatTransition();
    runApi.card();
    runApi.goHome();

    expect(calls.unlockAudio).toBe(11);
    expect(calls).toMatchObject({
      hit: 1,
      stand: 1,
      doubleDown: 1,
      split: 1,
      deal: 1,
      confirmIntro: 1,
      launch: { attacker: "player", target: "enemy", amount: 3 },
      impact: { amount: 4, target: "enemy" },
      enemyDefeat: 1,
      card: "card",
      goHome: 1,
    });
  });

  it("registers reward API with selection and home behavior", () => {
    const state = {
      mode: "reward",
      rewardOptions: [{ id: "r1" }, { id: "r2" }],
      selectionIndex: 0,
    };
    let rewardApi = null;
    const bridge = { setRewardApi: (api) => (rewardApi = api) };
    const calls = {
      moveSelection: [],
      claim: 0,
      playUi: [],
      unlockAudio: 0,
      goHome: 0,
    };
    const { registerBridgeApi } = createRegisterBridgeApiSpy();

    registerPhaserRewardApi({
      phaserBridge: bridge,
      state,
      buildPhaserRewardSnapshot: () => ({ mode: "reward" }),
      moveSelection: (delta, length) => {
        calls.moveSelection.push({ delta, length });
      },
      claimReward: () => {
        calls.claim += 1;
      },
      clampNumber,
      playUiSfx: (kind) => {
        calls.playUi.push(kind);
      },
      unlockAudio: () => {
        calls.unlockAudio += 1;
      },
      goHomeFromActiveRun: () => {
        calls.goHome += 1;
      },
      registerBridgeApi,
      rewardApiMethods: ["getSnapshot", "prev", "next", "claim", "selectIndex", "goHome"],
      assertApiContract: () => {},
    });

    expect(rewardApi.getSnapshot()).toEqual({ mode: "reward" });
    rewardApi.prev();
    rewardApi.next();
    rewardApi.selectIndex(1);
    rewardApi.claim();
    rewardApi.goHome();

    state.mode = "playing";
    rewardApi.prev();
    rewardApi.next();
    rewardApi.selectIndex(0);

    expect(calls.moveSelection).toEqual([
      { delta: -1, length: 2 },
      { delta: 1, length: 2 },
    ]);
    expect(state.selectionIndex).toBe(1);
    expect(calls.playUi).toEqual(["select"]);
    expect(calls.claim).toBe(1);
    expect(calls.unlockAudio).toBe(1);
    expect(calls.goHome).toBe(1);
  });

  it("registers shop API with buy/continue mode guards", () => {
    const state = {
      mode: "shop",
      shopStock: [{ id: "a" }, { id: "b" }],
      selectionIndex: 0,
    };
    let shopApi = null;
    const bridge = { setShopApi: (api) => (shopApi = api) };
    const calls = {
      moveSelection: [],
      buy: [],
      continueRun: 0,
      playUi: [],
      unlockAudio: 0,
      goHome: 0,
    };
    const { registerBridgeApi } = createRegisterBridgeApiSpy();

    registerPhaserShopApi({
      phaserBridge: bridge,
      state,
      buildPhaserShopSnapshot: () => ({ mode: "shop" }),
      moveSelection: (delta, length) => {
        calls.moveSelection.push({ delta, length });
      },
      unlockAudio: () => {
        calls.unlockAudio += 1;
      },
      buyShopItem: (index) => {
        calls.buy.push(index);
      },
      leaveShop: () => {
        calls.continueRun += 1;
      },
      clampNumber,
      playUiSfx: (kind) => {
        calls.playUi.push(kind);
      },
      goHomeFromActiveRun: () => {
        calls.goHome += 1;
      },
      registerBridgeApi,
      shopApiMethods: ["getSnapshot", "prev", "next", "buy", "continueRun", "selectIndex", "goHome"],
      assertApiContract: () => {},
    });

    expect(shopApi.getSnapshot()).toEqual({ mode: "shop" });
    shopApi.prev();
    shopApi.next();
    shopApi.buy("1");
    shopApi.continueRun();
    shopApi.selectIndex(1);
    shopApi.goHome();

    state.mode = "reward";
    shopApi.buy(0);
    shopApi.continueRun();
    shopApi.selectIndex(0);

    expect(calls.moveSelection).toEqual([
      { delta: -1, length: 2 },
      { delta: 1, length: 2 },
    ]);
    expect(calls.buy).toEqual([1]);
    expect(calls.continueRun).toBe(1);
    expect(state.selectionIndex).toBe(1);
    expect(calls.playUi).toEqual(["select"]);
    expect(calls.unlockAudio).toBe(3);
    expect(calls.goHome).toBe(1);
  });

  it("registers overlay API and handles collection + restart transitions", () => {
    const state = {
      mode: "collection",
      collectionPage: 0,
    };
    let overlayApi = null;
    const bridge = { setOverlayApi: (api) => (overlayApi = api) };
    const calls = {
      unlockAudio: 0,
      playUi: [],
      startRun: 0,
    };
    const { registerBridgeApi } = createRegisterBridgeApiSpy();

    registerPhaserOverlayApi({
      phaserBridge: bridge,
      state,
      collectionEntries: () => Array.from({ length: 10 }, (_, index) => ({ index })),
      collectionPageLayout: () => ({ cols: 2, rows: 2 }),
      clampNumber,
      unlockAudio: () => {
        calls.unlockAudio += 1;
      },
      playUiSfx: (kind) => {
        calls.playUi.push(kind);
      },
      startRun: () => {
        calls.startRun += 1;
      },
      buildPhaserOverlaySnapshot: () => ({ mode: state.mode }),
      registerBridgeApi,
      overlayApiMethods: ["getSnapshot", "prevPage", "nextPage", "backToMenu", "restart", "confirm"],
      assertApiContract: () => {},
    });

    expect(overlayApi.getSnapshot()).toEqual({ mode: "collection" });
    overlayApi.nextPage();
    expect(state.collectionPage).toBe(1);
    overlayApi.prevPage();
    expect(state.collectionPage).toBe(0);
    overlayApi.backToMenu();
    expect(state.mode).toBe("menu");

    state.mode = "victory";
    overlayApi.restart();
    overlayApi.confirm();

    expect(calls.unlockAudio).toBe(3);
    expect(calls.playUi).toEqual(["select", "select", "confirm"]);
    expect(calls.startRun).toBe(2);
  });
});
