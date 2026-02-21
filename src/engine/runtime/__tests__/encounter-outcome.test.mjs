import { describe, expect, it, vi } from "vitest";
import { createEncounterOutcomeHandlers } from "../core/encounter-outcome.js";

function createState(overrides = {}) {
  return {
    mode: "playing",
    selectionIndex: 0,
    rewardOptions: [],
    shopStock: [],
    run: {
      floor: 1,
      maxFloor: 3,
      room: 1,
      enemiesDefeated: 0,
      shopPurchaseMade: true,
      player: {
        hp: 30,
        maxHp: 40,
        streak: 2,
        stats: {
          goldMultiplier: 1,
        },
      },
    },
    encounter: {
      phase: "resolve",
      enemy: {
        name: "Abyss Dealer",
        type: "normal",
        goldDrop: 10,
      },
    },
    ...overrides,
  };
}

function createHandlers(state, overrides = {}) {
  const gainChips = overrides.gainChips || vi.fn();
  const spawnFloatText = overrides.spawnFloatText || vi.fn();
  const spawnSparkBurst = overrides.spawnSparkBurst || vi.fn();
  const triggerScreenShake = overrides.triggerScreenShake || vi.fn();
  const triggerFlash = overrides.triggerFlash || vi.fn();
  const playUiSfx = overrides.playUiSfx || vi.fn();
  const addLog = overrides.addLog || vi.fn();
  const finalizeRun = overrides.finalizeRun || vi.fn();
  const setAnnouncement = overrides.setAnnouncement || vi.fn();
  const generateRewardOptions = overrides.generateRewardOptions || vi.fn(() => []);
  const generateCampRelicDraftStock = overrides.generateCampRelicDraftStock || vi.fn(() => []);
  const generateShopStock = overrides.generateShopStock || vi.fn(() => []);
  const saveRunSnapshot = overrides.saveRunSnapshot || vi.fn();

  const handlers = createEncounterOutcomeHandlers({
    state,
    width: 1280,
    gainChips,
    spawnFloatText,
    spawnSparkBurst,
    triggerScreenShake,
    triggerFlash,
    playUiSfx,
    addLog,
    finalizeRun,
    setAnnouncement,
    generateRewardOptions,
    generateCampRelicDraftStock,
    generateShopStock,
    saveRunSnapshot,
  });

  return {
    handlers,
    gainChips,
    spawnFloatText,
    spawnSparkBurst,
    triggerScreenShake,
    triggerFlash,
    playUiSfx,
    addLog,
    finalizeRun,
    setAnnouncement,
    generateRewardOptions,
    generateCampRelicDraftStock,
    generateShopStock,
    saveRunSnapshot,
  };
}

describe("encounter outcome handlers", () => {
  it("finalizes run on final boss defeat", () => {
    const state = createState({
      run: {
        ...createState().run,
        floor: 3,
        maxFloor: 3,
      },
      encounter: {
        phase: "resolve",
        enemy: {
          name: "The House",
          type: "boss",
          goldDrop: 20,
        },
      },
    });
    const { handlers, finalizeRun, setAnnouncement, saveRunSnapshot } = createHandlers(state);

    handlers.onEncounterWin();

    expect(finalizeRun).toHaveBeenCalledWith("victory");
    expect(state.mode).toBe("victory");
    expect(setAnnouncement).toHaveBeenCalledWith("The House collapses.", 2.8);
    expect(saveRunSnapshot).not.toHaveBeenCalled();
  });

  it("opens floor-clear camp after non-final boss", () => {
    const state = createState({
      run: {
        ...createState().run,
        floor: 1,
        maxFloor: 3,
      },
      encounter: {
        phase: "resolve",
        enemy: {
          name: "Floor Boss",
          type: "boss",
          goldDrop: 15,
        },
      },
    });
    const rewardOptions = [{ id: "r1" }];
    const fallbackShop = [{ type: "heal" }];
    const {
      handlers,
      generateRewardOptions,
      generateCampRelicDraftStock,
      generateShopStock,
      saveRunSnapshot,
      setAnnouncement,
    } = createHandlers(state, {
      generateRewardOptions: vi.fn(() => rewardOptions),
      generateCampRelicDraftStock: vi.fn(() => []),
      generateShopStock: vi.fn(() => fallbackShop),
    });

    handlers.onEncounterWin();

    expect(state.run.floor).toBe(2);
    expect(state.run.room).toBe(1);
    expect(state.run.player.hp).toBe(38);
    expect(state.mode).toBe("shop");
    expect(state.run.shopPurchaseMade).toBe(false);
    expect(state.selectionIndex).toBe(0);
    expect(state.rewardOptions).toEqual(rewardOptions);
    expect(state.shopStock).toEqual(fallbackShop);
    expect(generateRewardOptions).toHaveBeenCalledWith(3, true);
    expect(generateCampRelicDraftStock).toHaveBeenCalledWith(rewardOptions);
    expect(generateShopStock).toHaveBeenCalledWith(3);
    expect(setAnnouncement).toHaveBeenCalledWith("Floor cleared. Restored 8 HP. Camp opened.", 2.4);
    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
  });

  it("opens relic camp on even room progression", () => {
    const state = createState({
      run: {
        ...createState().run,
        room: 1,
      },
    });
    const rewards = [{ id: "a" }, { id: "b" }];
    const stock = [{ type: "relic" }];
    const {
      handlers,
      generateRewardOptions,
      generateCampRelicDraftStock,
      generateShopStock,
      setAnnouncement,
    } = createHandlers(state, {
      generateRewardOptions: vi.fn(() => rewards),
      generateCampRelicDraftStock: vi.fn(() => stock),
      generateShopStock: vi.fn(() => []),
    });

    handlers.onEncounterWin();

    expect(state.run.room).toBe(2);
    expect(state.mode).toBe("shop");
    expect(state.rewardOptions).toEqual(rewards);
    expect(state.shopStock).toEqual(stock);
    expect(generateRewardOptions).toHaveBeenCalledWith(3, false);
    expect(generateCampRelicDraftStock).toHaveBeenCalledWith(rewards);
    expect(generateShopStock).not.toHaveBeenCalled();
    expect(setAnnouncement).toHaveBeenCalledWith("Relics are available at camp.", 2);
  });

  it("opens standard camp shop on odd room progression", () => {
    const state = createState({
      run: {
        ...createState().run,
        room: 2,
      },
    });
    const stock = [{ type: "reroll" }];
    const { handlers, generateShopStock, setAnnouncement } = createHandlers(state, {
      generateShopStock: vi.fn(() => stock),
    });

    handlers.onEncounterWin();

    expect(state.run.room).toBe(3);
    expect(state.mode).toBe("shop");
    expect(state.rewardOptions).toEqual([]);
    expect(state.shopStock).toEqual(stock);
    expect(generateShopStock).toHaveBeenCalledWith(3);
    expect(setAnnouncement).toHaveBeenCalledWith("Camp opened.", 2);
  });
});
