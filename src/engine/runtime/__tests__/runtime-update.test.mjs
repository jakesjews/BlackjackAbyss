import { describe, expect, it, vi } from "vitest";
import { createRuntimeUpdater } from "../bootstrap/runtime-update.js";

function createBaseState(overrides = {}) {
  return {
    mode: "menu",
    worldTime: 0,
    menuSparks: [],
    floatingTexts: [],
    cardBursts: [],
    sparkParticles: [],
    handTackles: [],
    flashOverlays: [],
    screenShakeTime: 0,
    screenShakeDuration: 0,
    screenShakePower: 0,
    announcement: "",
    announcementTimer: 0,
    announcementDuration: 0,
    run: null,
    autosaveTimer: 0,
    pendingTransition: null,
    passiveTooltipTimer: 0,
    encounter: null,
    ...overrides,
  };
}

function createUpdater(state, overrides = {}) {
  const updater = createRuntimeUpdater({
    state,
    width: 1280,
    height: 720,
    ambientOrbs: overrides.ambientOrbs || [{ x: 10, y: 730, speed: 10 }],
    menuMotes: overrides.menuMotes || [
      {
        x: 10,
        y: 10,
        vx: 2,
        vy: -3,
        drift: 1,
        swirl: 1,
        phase: 0,
        speedScale: 1,
      },
    ],
    updateMusic: overrides.updateMusic || vi.fn(),
    updateEncounterIntroTyping: overrides.updateEncounterIntroTyping || vi.fn(),
    saveRunSnapshot: overrides.saveRunSnapshot || vi.fn(),
    onEncounterWin: overrides.onEncounterWin || vi.fn(),
    finalizeRun: overrides.finalizeRun || vi.fn(),
    hidePassiveTooltip: overrides.hidePassiveTooltip || vi.fn(),
    triggerImpactBurstAt: overrides.triggerImpactBurstAt || vi.fn(),
    playGruntSfx: overrides.playGruntSfx || vi.fn(),
    applyImpactDamage: overrides.applyImpactDamage || vi.fn(),
    spawnSparkBurst: overrides.spawnSparkBurst || vi.fn(),
    easeOutCubic: overrides.easeOutCubic || ((t) => t),
    lerp: overrides.lerp || ((a, b, t) => a + (b - a) * t),
    random: overrides.random || (() => 0.6),
  });

  return {
    updater,
    updateMusic: overrides.updateMusic,
    updateEncounterIntroTyping: overrides.updateEncounterIntroTyping,
    saveRunSnapshot: overrides.saveRunSnapshot,
    onEncounterWin: overrides.onEncounterWin,
    finalizeRun: overrides.finalizeRun,
    hidePassiveTooltip: overrides.hidePassiveTooltip,
    triggerImpactBurstAt: overrides.triggerImpactBurstAt,
    playGruntSfx: overrides.playGruntSfx,
    applyImpactDamage: overrides.applyImpactDamage,
    spawnSparkBurst: overrides.spawnSparkBurst,
  };
}

describe("runtime updater", () => {
  it("updates ambience and menu motion, including orb wrap", () => {
    const state = createBaseState({ mode: "menu" });
    const ambientOrbs = [{ x: 3, y: 733, speed: 5 }];
    const menuMotes = [
      {
        x: 1270,
        y: 100,
        vx: 40,
        vy: -10,
        drift: 1,
        swirl: 1,
        phase: 0,
        speedScale: 1,
      },
    ];
    const updateMusic = vi.fn();
    const { updater } = createUpdater(state, {
      ambientOrbs,
      menuMotes,
      updateMusic,
      random: () => 0.05,
    });

    updater.update(0.1);

    expect(updateMusic).toHaveBeenCalledWith(0.1);
    expect(ambientOrbs[0].y).toBe(-12);
    expect(menuMotes[0].x).toBeLessThanOrEqual(1328);
    expect(state.menuSparks.length).toBe(1);
    expect(state.worldTime).toBeCloseTo(0.1, 10);
  });

  it("processes hand tackle impacts and pending enemy transition", () => {
    const state = createBaseState({
      mode: "playing",
      run: { log: [] },
      encounter: {
        phase: "resolve",
        resolveTimer: 0,
        nextDealPrompted: false,
      },
      handTackles: [
        {
          fromX: 0,
          fromY: 0,
          toX: 100,
          toY: 100,
          elapsed: 0.98,
          duration: 1,
          impactAt: 0.5,
          impacted: false,
          amount: 4,
          color: "#fff",
          impactPayload: { target: "enemy", amount: 4 },
        },
      ],
      pendingTransition: {
        target: "enemy",
        waiting: false,
        timer: 0.01,
      },
    });
    const triggerImpactBurstAt = vi.fn();
    const playGruntSfx = vi.fn();
    const applyImpactDamage = vi.fn();
    const onEncounterWin = vi.fn();
    const { updater } = createUpdater(state, {
      triggerImpactBurstAt,
      playGruntSfx,
      applyImpactDamage,
      onEncounterWin,
      random: () => 1,
    });

    updater.update(0.05);

    expect(triggerImpactBurstAt).toHaveBeenCalledWith(100, 100, 6, "#fff");
    expect(playGruntSfx).toHaveBeenCalledTimes(1);
    expect(applyImpactDamage).toHaveBeenCalledWith({ target: "enemy", amount: 4 });
    expect(state.handTackles).toHaveLength(0);
    expect(onEncounterWin).toHaveBeenCalledTimes(1);
    expect(state.pendingTransition).toBeNull();
    expect(state.encounter.nextDealPrompted).toBe(true);
  });

  it("handles autosave cadence and intro typing in active run modes", () => {
    const state = createBaseState({
      mode: "playing",
      run: {
        log: [{ ttl: 1.2 }, { ttl: 0.01 }],
      },
      autosaveTimer: 0.74,
      encounter: {
        phase: "player",
        intro: { active: true },
      },
    });
    const saveRunSnapshot = vi.fn();
    const updateEncounterIntroTyping = vi.fn();
    const { updater } = createUpdater(state, {
      saveRunSnapshot,
      updateEncounterIntroTyping,
      random: () => 0.99,
    });

    updater.update(0.02);

    expect(state.run.log).toHaveLength(1);
    expect(state.autosaveTimer).toBe(0);
    expect(saveRunSnapshot).toHaveBeenCalledTimes(1);
    expect(updateEncounterIntroTyping).toHaveBeenCalledWith(state.encounter, 0.02);
  });

  it("resolves player defeat transition and tooltip/announcement decay", () => {
    const state = createBaseState({
      mode: "playing",
      run: { log: [] },
      encounter: { phase: "resolve", resolveTimer: 0.2, nextDealPrompted: false },
      pendingTransition: { target: "player", waiting: false, timer: 0.01 },
      passiveTooltipTimer: 0.01,
      announcement: "hi",
      announcementTimer: 0.01,
      announcementDuration: 0.5,
      screenShakeTime: 0.01,
      screenShakeDuration: 0.2,
      screenShakePower: 2,
    });
    const finalizeRun = vi.fn();
    const hidePassiveTooltip = vi.fn();
    const { updater } = createUpdater(state, {
      finalizeRun,
      hidePassiveTooltip,
      random: () => 0.99,
    });

    updater.update(0.05);

    expect(finalizeRun).toHaveBeenCalledWith("defeat");
    expect(state.mode).toBe("gameover");
    expect(state.encounter.phase).toBe("done");
    expect(state.announcement).toBe("");
    expect(state.announcementDuration).toBe(0);
    expect(state.screenShakeDuration).toBe(0);
    expect(hidePassiveTooltip).toHaveBeenCalledTimes(1);
  });
});
