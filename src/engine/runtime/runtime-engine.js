import {
  CARD_H,
  CARD_W,
  ENEMY_DEFEAT_TRANSITION_SECONDS,
  MAX_RUN_HISTORY,
  MAX_SPLIT_HANDS,
  PLAYER_DEFEAT_TRANSITION_SECONDS,
  RUNTIME_HEIGHT,
  RUNTIME_WIDTH,
  STORAGE_KEYS,
} from "./constants.js";
import { createRuntimeState, createProfile, defaultPlayerStats } from "./state/store.js";
import { loadAudioEnabled, safeGetStorage, safeRemoveStorage, safeSetStorage, saveAudioEnabled } from "./persistence/storage.js";
import {
  CARD_RANKS as RANKS,
  CARD_SUITS as SUITS,
  cardToText,
  canDoubleDown,
  computeHandCardPosition,
  computeHandLayout,
  createDeck,
  handTotal,
  isBlackjack,
  rankValue,
  shuffle,
  visibleDealerTotal,
} from "./domain/combat.js";
import { nextModeAfterRewardClaim, nextModeAfterShopContinue, resolveRoomType } from "./domain/progression.js";
import {
  countCollectedCopies,
  countDistinctCollected,
  getRelicRarityMeta as getRelicRarityMetaFromDomain,
  normalizeRelicRarity as normalizeRelicRarityFromDomain,
} from "./domain/relics.js";
import {
  MENU_API_METHODS,
  OVERLAY_API_METHODS,
  REWARD_API_METHODS,
  RUN_API_METHODS,
  SHOP_API_METHODS,
  assertApiContract,
} from "./bridge/register-apis.js";
import { publishRuntimeTestHooks } from "./bridge/snapshots.js";
import { readRuntimeTestFlags } from "./testing/test-controls.js";
import { registerBridgeApi } from "./core/api-registry.js";
import {
  registerPhaserMenuActions as registerPhaserMenuActionsFromModule,
  registerPhaserOverlayApi as registerPhaserOverlayApiFromModule,
  registerPhaserRewardApi as registerPhaserRewardApiFromModule,
  registerPhaserRunApi as registerPhaserRunApiFromModule,
  registerPhaserShopApi as registerPhaserShopApiFromModule,
} from "./core/phaser-bridge-apis.js";
import {
  BOSS_RELIC,
  RELIC_BY_ID,
  RELIC_RARITY_META,
  RELIC_RARITY_ORDER,
  RELICS,
} from "./core/relic-catalog.js";
import { buildTransitionSnapshot } from "./core/combat-actions.js";
import {
  animatedCardPosition as animatedCardPositionFromModule,
  beginQueuedEnemyDefeatTransition as beginQueuedEnemyDefeatTransitionFromModule,
  currentShakeOffset as currentShakeOffsetFromModule,
  damageFloatAnchor as damageFloatAnchorFromModule,
  lerp as lerpFromModule,
  spawnFloatText as spawnFloatTextFromModule,
  spawnSparkBurst as spawnSparkBurstFromModule,
  startDefeatTransition as startDefeatTransitionFromModule,
  triggerFlash as triggerFlashFromModule,
  triggerHandTackle as triggerHandTackleFromModule,
  triggerImpactBurst as triggerImpactBurstFromModule,
  triggerImpactBurstAt as triggerImpactBurstAtFromModule,
  queueEnemyDefeatTransition as queueEnemyDefeatTransitionFromModule,
  triggerScreenShake as triggerScreenShakeFromModule,
} from "./core/combat-effects.js";
import { createCombatResolution } from "./core/combat-resolution.js";
import { createCombatTurnActions } from "./core/combat-turn-actions.js";
import {
  buildEnemyIntroDialogue as buildEnemyIntroDialogueFromModule,
  createEncounter as createEncounterFromModule,
  createEncounterIntroState as createEncounterIntroStateFromModule,
  createEnemy as createEnemyFromModule,
} from "./core/encounter-factory.js";
import {
  advanceEncounterIntro as advanceEncounterIntroFromModule,
  confirmEncounterIntro as confirmEncounterIntroFromModule,
  isEncounterIntroActive as isEncounterIntroActiveFromModule,
  revealEncounterIntro as revealEncounterIntroFromModule,
  updateEncounterIntroTyping as updateEncounterIntroTypingFromModule,
} from "./core/encounter-intro.js";
import { createEncounterOutcomeHandlers } from "./core/encounter-outcome.js";
import { createRewardShopHandlers } from "./core/reward-shop.js";
import { applyHexAlpha, hydrateShopStock, serializeShopStock } from "./core/serialization.js";
import { buildPhaserRunSnapshot as buildPhaserRunSnapshotFromModule } from "./core/phaser-run-snapshot.js";
import { buildPhaserOverlaySnapshot as buildPhaserOverlaySnapshotFromModule } from "./core/overlay-snapshot.js";
import { createRuntimeLoop as createRuntimeLoopFromModule } from "./core/runtime-loop.js";
import { bindRuntimeLifecycle as bindRuntimeLifecycleFromModule } from "./core/runtime-lifecycle.js";
import { createRuntimeAudio as createRuntimeAudioFromModule } from "./core/runtime-audio.js";
import { createEnemyAvatarLoader as createEnemyAvatarLoaderFromModule } from "./core/enemy-avatars.js";
import { initializeRuntimeStartup as initializeRuntimeStartupFromModule } from "./core/runtime-startup.js";
import { createEncounterLifecycleHandlers as createEncounterLifecycleHandlersFromModule } from "./core/encounter-lifecycle.js";
import { createCombatImpactHandlers as createCombatImpactHandlersFromModule } from "./core/combat-impact.js";
import {
  buildPhaserRewardSnapshot as buildPhaserRewardSnapshotFromModule,
  buildPhaserShopSnapshot as buildPhaserShopSnapshotFromModule,
} from "./core/shop-reward-snapshots.js";
import {
  buildAvailableActions as buildAvailableActionsFromModule,
  renderGameToText as renderGameToTextFromModule,
} from "./core/runtime-text-snapshot.js";
import { createRuntimeUpdater } from "./core/runtime-update.js";
import { goHomeFromActiveRun as goHomeFromActiveRunModule } from "./core/run-lifecycle.js";
import { applyTestEconomyToNewRun as applyTestEconomyToNewRunFromModule, createRun as createRunFromModule } from "./core/run-factory.js";
import {
  applyChipDelta as applyChipDeltaFromModule,
  finalizeRunIntoProfile as finalizeRunIntoProfileFromModule,
  updateProfileBest as updateProfileBestFromModule,
} from "./core/run-results.js";
import {
  collectionEntries as collectionEntriesFromModule,
  collectionPageLayout as collectionPageLayoutFromModule,
  passiveDescription as passiveDescriptionFromModule,
  passiveStacksForRun as passiveStacksForRunFromModule,
  passiveSummary as passiveSummaryFromModule,
  passiveThumbUrl as passiveThumbUrlFromModule,
} from "./core/passive-view.js";
import { createRuntimeProfileHandlers } from "./core/runtime-profile.js";
import { createRuntimeSaveResumeHandlers } from "./core/runtime-save-resume.js";
import {
  addLogToRun,
  getRunEventLog as getRunEventLogFromModule,
  hasSavedRunState,
  hidePassiveTooltipState,
  moveSelectionState,
  openCollectionState,
  setAnnouncementState,
} from "./core/runtime-ui-state.js";
import {
  sanitizeCard as sanitizeCardFromModule,
  sanitizeCardList as sanitizeCardListFromModule,
  sanitizeEncounter as sanitizeEncounterFromModule,
  sanitizeRun as sanitizeRunFromModule,
} from "./core/state-sanitizers.js";
import { installRuntimeTestHooks } from "./core/test-hooks.js";
import { bindRuntimeWindowLifecycle, createLandscapeLockRequester } from "./core/audio-system.js";

let runtimeEngineStarted = false;

export function startRuntimeEngine() {
  if (runtimeEngineStarted) {
    return;
  }
  runtimeEngineStarted = true;

  (() => {
    "use strict";

  const phaserBridge = window.__ABYSS_PHASER_BRIDGE__ || null;
  const gameShell = document.getElementById("game-shell");
  const canvas = phaserBridge?.getCanvas?.() || document.getElementById("game-canvas");
  if (!gameShell || !canvas) {
    throw new Error("Unable to initialize Phaser runtime context.");
  }

  const WIDTH = RUNTIME_WIDTH;
  const HEIGHT = RUNTIME_HEIGHT;
  const AMBIENT_ORBS = Array.from({ length: 44 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    radius: 1.2 + Math.random() * 4.6,
    speed: 3 + Math.random() * 12,
    alpha: 0.05 + Math.random() * 0.11,
  }));
  const MENU_MOTES = Array.from({ length: 39 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    radius: 0.675 + Math.random() * 1.65,
    vx: -24 + Math.random() * 48,
    vy: -34 - Math.random() * 136,
    alpha: 0.2 + Math.random() * 0.4,
    twinkle: 1.1 + Math.random() * 2.4,
    phase: Math.random() * Math.PI * 2,
    warm: true,
    heat: Math.random(),
    drift: 0.8 + Math.random() * 1.6,
    swirl: 0.6 + Math.random() * 1.8,
    speedScale: 0.7 + Math.random() * 1.65,
    spin: -2.4 + Math.random() * 4.8,
    shape: Math.floor(Math.random() * 3),
  }));
  const GRUNT_SOURCES = [
    "/audio/soundbites/grunt.wav",
    "/audio/soundbites/grunt.ogg",
  ];
  const CARD_SOURCES = ["/audio/soundbites/card.wav"];
  const MUSIC_TRACK_SOURCES = ["/audio/music/blackjack.mp3"];
  const enemyAvatarLoader = createEnemyAvatarLoaderFromModule({
    globalWindow: window,
    sourceRoots: ["/images/avatars"],
  });
  const sanitizeEnemyAvatarKey = enemyAvatarLoader.sanitizeEnemyAvatarKey;
  const ensureEnemyAvatarLoaded = enemyAvatarLoader.ensureEnemyAvatarLoaded;

  const passiveThumbCache = new Map();

  const state = createRuntimeState({
    width: WIDTH,
    height: HEIGHT,
    audioEnabled: loadAudioEnabled(STORAGE_KEYS),
  });
  const runtimeTestFlags = readRuntimeTestFlags(window);

  function installModeBridge() {
    let modeValue = typeof state.mode === "string" ? state.mode : "menu";
    const reportMode = (mode) => {
      if (phaserBridge && typeof phaserBridge.reportMode === "function") {
        phaserBridge.reportMode(mode);
      }
    };

    Object.defineProperty(state, "mode", {
      configurable: true,
      enumerable: true,
      get() {
        return modeValue;
      },
      set(nextMode) {
        if (typeof nextMode !== "string" || nextMode.length === 0 || nextMode === modeValue) {
          return;
        }
        modeValue = nextMode;
        reportMode(modeValue);
        // Mode changes can switch between fixed menu canvas size and gameplay aspect ratio.
        // Resize immediately to avoid transient stretched frames (especially menu -> collection).
        resizeCanvas();
      },
    });

    reportMode(modeValue);
  }

  installModeBridge();

  const runtimeProfileHandlers = createRuntimeProfileHandlers({
    state,
    createProfile,
    defaultPlayerStats,
    maxRunHistory: MAX_RUN_HISTORY,
    storageKeys: STORAGE_KEYS,
    safeGetStorage,
    safeSetStorage,
    countCollectedCopies,
    countDistinctCollected,
    normalizeRelicRarityFromDomain,
    getRelicRarityMetaFromDomain,
    relicRarityMetaTable: RELIC_RARITY_META,
  });
  const {
    clampNumber,
    nonNegInt,
    normalizeRelicRarity,
    relicRarityMeta,
    unlockProgressFor,
    isRelicUnlocked,
    relicUnlockLabel,
    mergePlayerStats,
    loadProfile,
    saveProfile,
  } = runtimeProfileHandlers;

  function sanitizeCard(cardLike) {
    return sanitizeCardFromModule(cardLike, { ranks: RANKS, suits: SUITS });
  }

  function sanitizeCardList(listLike) {
    return sanitizeCardListFromModule(listLike, { ranks: RANKS, suits: SUITS });
  }

  function sanitizeRun(runLike) {
    return sanitizeRunFromModule({
      runLike,
      createRun,
      nonNegInt,
      clampNumber,
      mergePlayerStats,
    });
  }

  function sanitizeEncounter(encounterLike, run) {
    return sanitizeEncounterFromModule({
      encounterLike,
      run,
      resolveRoomType,
      createEnemy,
      createEncounterIntroState,
      sanitizeCardListFn: sanitizeCardList,
      maxSplitHands: MAX_SPLIT_HANDS,
      nonNegInt,
      clampNumber,
    });
  }

  function updateProfileBest(run) {
    updateProfileBestFromModule({
      profile: state.profile,
      run,
    });
  }

  const runtimeSaveResumeHandlers = createRuntimeSaveResumeHandlers({
    state,
    storageKeys: STORAGE_KEYS,
    safeGetStorage,
    safeSetStorage,
    safeRemoveStorage,
    serializeShopStock,
    sanitizeRun,
    sanitizeEncounter,
    relicById: RELIC_BY_ID,
    hydrateShopStock,
    getGenerateCampRelicDraftStockFn: () => generateCampRelicDraftStock,
    nonNegInt,
    setAnnouncementFn: setAnnouncement,
    updateProfileBestFn: updateProfileBest,
    unlockAudioFn: () => unlockAudio(),
    playUiSfxFn: (cue) => playUiSfx(cue),
    resizeCanvasFn: resizeCanvas,
  });
  const {
    clearSavedRun,
    saveRunSnapshot,
    loadSavedRunSnapshot,
    resumeSavedRun,
  } = runtimeSaveResumeHandlers;

  function finalizeRun(outcome) {
    if (!state.profile || !state.run) {
      clearSavedRun();
      return;
    }

    finalizeRunIntoProfileFromModule({
      profile: state.profile,
      run: state.run,
      outcome,
      maxRunHistory: MAX_RUN_HISTORY,
    });

    saveProfile();
    clearSavedRun();
  }

  function gainChips(amount) {
    applyChipDeltaFromModule({
      run: state.run,
      amount,
    });
  }

  function passiveDescription(text) {
    return passiveDescriptionFromModule(text);
  }

  function passiveThumbUrl(relic) {
    return passiveThumbUrlFromModule({
      relic,
      cache: passiveThumbCache,
      applyHexAlpha,
    });
  }

  function passiveStacksForRun(run = state.run) {
    return passiveStacksForRunFromModule({
      run,
      relicById: RELIC_BY_ID,
      nonNegInt,
    });
  }

  function hidePassiveTooltip() {
    hidePassiveTooltipState(state);
  }

  function passiveSummary(run) {
    return passiveSummaryFromModule(run);
  }

  function createRun() {
    return createRunFromModule(defaultPlayerStats);
  }

  function applyTestEconomyToNewRun(run) {
    applyTestEconomyToNewRunFromModule({ run, runtimeTestFlags, addLog });
  }

  function createEnemy(floor, room, type) {
    return createEnemyFromModule({
      floor,
      room,
      type,
      sanitizeEnemyAvatarKey,
      ensureEnemyAvatarLoaded,
    });
  }

  function buildEnemyIntroDialogue(enemy) {
    const next = buildEnemyIntroDialogueFromModule({
      enemy,
      lastIntroDialogue: state.lastIntroDialogue,
    });
    state.lastIntroDialogue = next.nextLastIntroDialogue;
    return next.dialogue;
  }

  function createEncounterIntroState(enemy, introLike = null) {
    return createEncounterIntroStateFromModule({
      enemy,
      introLike,
      clampNumberFn: clampNumber,
      buildEnemyIntroDialogueFn: buildEnemyIntroDialogue,
    });
  }

  function addLog(message) {
    addLogToRun({ state, message });
  }

  function setAnnouncement(message, duration = 2.2) {
    setAnnouncementState({ state, message, duration });
  }

  function getRunEventLog(run = state.run) {
    return getRunEventLogFromModule(run);
  }

  function isExternalModeRendering(mode = state.mode) {
    return (
      Boolean(phaserBridge) &&
      typeof phaserBridge.isExternalRendererActive === "function" &&
      phaserBridge.isExternalRendererActive(mode)
    );
  }

  const runtimeAudio = createRuntimeAudioFromModule({
    state,
    globalWindow: window,
    createAudioElement: () => new Audio(),
    storageKeys: STORAGE_KEYS,
    saveAudioEnabled,
    musicTrackSources: MUSIC_TRACK_SOURCES,
    gruntSources: GRUNT_SOURCES,
    cardSources: CARD_SOURCES,
    isExternalModeRendering,
    addLog,
    setAnnouncement,
    clampNumber,
    lerpFn: lerpFromModule,
  });
  const {
    unlockAudio,
    playImpactSfx,
    playDealSfx,
    playFireballLaunchSfx,
    playFireballImpactSfx,
    playUiSfx,
    playActionSfx,
    playOutcomeSfx,
    playGruntSfx,
    updateMusic,
  } = runtimeAudio;

  function spawnFloatText(text, x, y, color, opts = {}) {
    spawnFloatTextFromModule({
      state,
      text,
      x,
      y,
      color,
      opts,
    });
  }

  function lerp(a, b, t) {
    return lerpFromModule(a, b, t);
  }

  function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - (1 - clamped) ** 3;
  }

  function animatedCardPosition(card, targetX, targetY) {
    return animatedCardPositionFromModule({
      card,
      targetX,
      targetY,
      worldTime: state.worldTime,
    });
  }

  function spawnSparkBurst(x, y, color, count = 12, speed = 160) {
    spawnSparkBurstFromModule({
      state,
      x,
      y,
      color,
      count,
      speed,
    });
  }

  function triggerScreenShake(power = 6, duration = 0.2) {
    triggerScreenShakeFromModule({
      state,
      power,
      duration,
    });
  }

  function triggerFlash(color, intensity = 0.08, duration = 0.16) {
    triggerFlashFromModule({
      state,
      color,
      intensity,
      duration,
    });
  }

  function triggerImpactBurstAt(x, y, amount, color) {
    triggerImpactBurstAtFromModule({
      state,
      x,
      y,
      amount,
      color,
    });
  }

  function triggerImpactBurst(side, amount, color) {
    triggerImpactBurstFromModule({
      state,
      side,
      amount,
      color,
      width: WIDTH,
      height: HEIGHT,
    });
  }

  function triggerHandTackle(winner, amount, impactPayload = null) {
    return triggerHandTackleFromModule({
      state,
      winner,
      amount,
      impactPayload,
      cardW: CARD_W,
      cardH: CARD_H,
      width: WIDTH,
      height: HEIGHT,
      handBoundsFn: handBounds,
    });
  }

  function damageFloatAnchor(target) {
    return damageFloatAnchorFromModule({
      state,
      target,
      width: WIDTH,
      height: HEIGHT,
    });
  }

  const combatImpactHandlers = createCombatImpactHandlersFromModule({
    state,
    width: WIDTH,
    height: HEIGHT,
    startDefeatTransitionFn: startDefeatTransition,
    setAnnouncementFn: setAnnouncement,
    addLogFn: addLog,
    saveRunSnapshotFn: saveRunSnapshot,
    isExternalModeRenderingFn: isExternalModeRendering,
    queueEnemyDefeatTransitionFn: queueEnemyDefeatTransition,
    damageFloatAnchorFn: damageFloatAnchor,
    spawnFloatTextFn: spawnFloatText,
  });
  const {
    finalizeResolveState,
    applyImpactDamage,
  } = combatImpactHandlers;

  function startDefeatTransition(target) {
    startDefeatTransitionFromModule({
      state,
      target,
      handBoundsFn: handBounds,
      spawnSparkBurstFn: spawnSparkBurstFromModule,
      triggerScreenShakeFn: triggerScreenShakeFromModule,
      triggerFlashFn: triggerFlashFromModule,
      playImpactSfxFn: playImpactSfx,
      enemyDefeatTransitionSeconds: ENEMY_DEFEAT_TRANSITION_SECONDS,
      playerDefeatTransitionSeconds: PLAYER_DEFEAT_TRANSITION_SECONDS,
    });
  }

  function queueEnemyDefeatTransition() {
    queueEnemyDefeatTransitionFromModule({
      state,
      enemyDefeatTransitionSeconds: ENEMY_DEFEAT_TRANSITION_SECONDS,
    });
  }

  function beginQueuedEnemyDefeatTransition() {
    return beginQueuedEnemyDefeatTransitionFromModule({
      state,
      triggerScreenShakeFn: triggerScreenShakeFromModule,
      triggerFlashFn: triggerFlashFromModule,
      playImpactSfxFn: playImpactSfx,
      enemyDefeatTransitionSeconds: ENEMY_DEFEAT_TRANSITION_SECONDS,
    });
  }

  function currentShakeOffset() {
    return currentShakeOffsetFromModule({ state });
  }

  function createEncounter(run) {
    return createEncounterFromModule({
      run,
      createEnemyFn: createEnemy,
      createEncounterIntroStateFn: createEncounterIntroState,
      resolveRoomTypeFn: resolveRoomType,
    });
  }

  const encounterLifecycleHandlers = createEncounterLifecycleHandlersFromModule({
    state,
    width: WIDTH,
    height: HEIGHT,
    cardW: CARD_W,
    cardH: CARD_H,
    createDeckFn: createDeck,
    shuffleFn: shuffle,
    rankValueFn: rankValue,
    computeHandLayoutFn: computeHandLayout,
    computeHandCardPositionFn: computeHandCardPosition,
    isExternalModeRenderingFn: isExternalModeRendering,
    playUiSfxFn: playUiSfx,
    playDealSfxFn: playDealSfx,
    spawnSparkBurstFn: spawnSparkBurst,
    isBlackjackFn: isBlackjack,
    saveRunSnapshotFn: saveRunSnapshot,
    clampNumberFn: clampNumber,
    createEncounterFn: createEncounter,
    resolveDealerThenShowdownFn: resolveDealerThenShowdown,
    spawnFloatTextFn: spawnFloatText,
    addLogFn: addLog,
    unlockAudioFn: unlockAudio,
    saveProfileFn: saveProfile,
    createRunFn: createRun,
    applyTestEconomyToNewRunFn: applyTestEconomyToNewRun,
    clearSavedRunFn: clearSavedRun,
    resizeCanvasFn: resizeCanvas,
  });
  const {
    handBounds,
    dealCard,
    startHand,
    beginEncounter,
    startRun,
  } = encounterLifecycleHandlers;

  function isEncounterIntroActive(encounter = state.encounter) {
    return isEncounterIntroActiveFromModule({ state, encounter });
  }

  function updateEncounterIntroTyping(encounter, dt) {
    updateEncounterIntroTypingFromModule({ encounter, dt });
  }

  function revealEncounterIntro(encounter = state.encounter) {
    return revealEncounterIntroFromModule({
      state,
      encounter,
      isEncounterIntroActiveFn: isEncounterIntroActiveFromModule,
      saveRunSnapshotFn: saveRunSnapshot,
    });
  }

  function advanceEncounterIntro(encounter = state.encounter) {
    return advanceEncounterIntroFromModule({
      state,
      encounter,
      isEncounterIntroActiveFn: isEncounterIntroActiveFromModule,
      revealEncounterIntroFn: revealEncounterIntroFromModule,
      confirmEncounterIntroFn: confirmEncounterIntroFromModule,
      playUiSfxFn: playUiSfx,
      startHandFn: startHand,
      saveRunSnapshotFn: saveRunSnapshot,
    });
  }

  function confirmEncounterIntro() {
    return confirmEncounterIntroFromModule({
      state,
      encounter: state.encounter,
      isEncounterIntroActiveFn: isEncounterIntroActiveFromModule,
      playUiSfxFn: playUiSfx,
      startHandFn: startHand,
      saveRunSnapshotFn: saveRunSnapshot,
    });
  }

  const combatResolution = createCombatResolution({
    state,
    nonNegInt,
    width: WIDTH,
    isExternalModeRendering,
    playOutcomeSfx,
    triggerHandTackle,
    applyImpactDamage,
    triggerImpactBurst,
    spawnFloatText,
    gainChips,
    updateProfileBest,
    finalizeResolveState,
    addLog,
    triggerFlash,
    triggerScreenShake,
    spawnSparkBurst,
  });

  const combatTurnActions = createCombatTurnActions({
    state,
    maxSplitHands: MAX_SPLIT_HANDS,
    nonNegInt,
    isEncounterIntroActive,
    playUiSfx,
    playActionSfx,
    addLog,
    dealCard,
    setAnnouncement,
    startHand,
    saveRunSnapshot,
    resolveHand,
  });

  const rewardShopHandlers = createRewardShopHandlers({
    state,
    relics: RELICS,
    bossRelic: BOSS_RELIC,
    rarityOrder: RELIC_RARITY_ORDER,
    nonNegInt,
    normalizeRelicRarity,
    relicRarityMeta,
    isRelicUnlocked,
    shuffleFn: shuffle,
    clampNumber,
    nextModeAfterRewardClaim,
    nextModeAfterShopContinue,
    passiveDescription,
    gainChips,
    spawnFloatText,
    playUiSfx,
    setAnnouncement,
    addLog,
    saveRunSnapshot,
    beginEncounter,
    saveProfile,
    width: WIDTH,
  });

  const encounterOutcomeHandlers = createEncounterOutcomeHandlers({
    state,
    width: WIDTH,
    gainChips,
    spawnFloatText,
    spawnSparkBurst,
    triggerScreenShake,
    triggerFlash,
    playUiSfx,
    addLog,
    finalizeRun,
    setAnnouncement,
    generateRewardOptions: rewardShopHandlers.generateRewardOptions,
    generateCampRelicDraftStock: rewardShopHandlers.generateCampRelicDraftStock,
    generateShopStock: rewardShopHandlers.generateShopStock,
    saveRunSnapshot,
  });
  const {
    canPlayerAct,
    canAdvanceDeal,
    advanceToNextDeal,
    canSplitCurrentHand,
    hitAction,
    standAction,
    doubleAction,
    splitAction,
  } = combatTurnActions;

  function resolveDealerThenShowdown(naturalCheck) {
    combatTurnActions.resolveDealerThenShowdown(naturalCheck);
  }

  function resolveHand(outcome, pTotal = handTotal(state.encounter.playerHand).total, dTotal = handTotal(state.encounter.dealerHand).total) {
    combatResolution.resolveHand(outcome, pTotal, dTotal);
  }
  const {
    onEncounterWin,
  } = encounterOutcomeHandlers;

  const {
    generateRewardOptions,
    generateCampRelicDraftStock,
    generateShopStock,
    claimReward,
    buyShopItem,
    leaveShop,
    shopItemName,
    shopItemDescription,
  } = rewardShopHandlers;

  function moveSelection(delta, length) {
    moveSelectionState({ state, delta, length, playUiSfx });
  }

  function hasSavedRun() {
    return hasSavedRunState(state);
  }

  function collectionEntries(profile = state.profile) {
    const safeProfile = profile || createProfile();
    return collectionEntriesFromModule({
      profile: safeProfile,
      relics: [...RELICS, BOSS_RELIC],
      normalizeRelicRarity,
      rarityMeta: RELIC_RARITY_META,
      rarityOrder: RELIC_RARITY_ORDER,
      isRelicUnlocked,
      relicUnlockLabel,
      nonNegInt,
    });
  }

  function collectionPageLayout() {
    return collectionPageLayoutFromModule(Boolean(state.viewport?.portraitZoomed));
  }

  function openCollection(page = 0) {
    openCollectionState({
      state,
      page,
      nonNegInt,
      playUiSfx,
    });
  }

  const runtimeUpdater = createRuntimeUpdater({
    state,
    width: WIDTH,
    height: HEIGHT,
    ambientOrbs: AMBIENT_ORBS,
    menuMotes: MENU_MOTES,
    updateMusic,
    updateEncounterIntroTyping,
    saveRunSnapshot,
    onEncounterWin,
    finalizeRun,
    hidePassiveTooltip,
    triggerImpactBurstAt,
    playGruntSfx,
    applyImpactDamage,
    spawnSparkBurst,
    easeOutCubic,
    lerp,
  });

  function update(dt) {
    runtimeUpdater.update(dt);
  }

  function render() {
    // Phaser scenes are the renderer of record.
  }

  const runtimeLoop = createRuntimeLoopFromModule({
    state,
    width: WIDTH,
    height: HEIGHT,
    gameShell,
    canvas,
    phaserBridge,
    globalWindow: window,
    globalDocument: document,
    update,
    render,
    performanceNow: () => performance.now(),
    requestAnimationFrameFn: (callback) => requestAnimationFrame(callback),
  });

  function availableActions() {
    return buildAvailableActionsFromModule({
      state,
      hasSavedRun,
      isEncounterIntroActive,
      canAdvanceDeal,
      canPlayerAct,
      canDoubleDown,
      canSplitCurrentHand,
    });
  }

  function renderGameToText() {
    return renderGameToTextFromModule({
      state,
      availableActions,
      passiveSummary,
      cardToText,
      handTotal,
      visibleDealerTotal,
      canAdvanceDeal,
      nonNegInt,
      shopItemName,
      collectionEntries,
      hasSavedRun,
    });
  }

  function advanceTime(ms) {
    runtimeLoop.advanceTime(ms);
  }

  function resizeCanvas() {
    runtimeLoop.resizeCanvas();
  }

  function startRuntimeLoop() {
    runtimeLoop.startRuntimeLoop();
  }

  function registerPhaserMenuActions() {
    registerPhaserMenuActionsFromModule({
      phaserBridge,
      state,
      unlockAudio,
      startRun,
      hasSavedRun,
      resumeSavedRun,
      saveRunSnapshot,
      openCollection,
      registerBridgeApi,
      menuApiMethods: MENU_API_METHODS,
      assertApiContract,
    });
  }

  function goHomeFromActiveRun() {
    goHomeFromActiveRunModule({
      state,
      playUiSfx,
      saveRunSnapshot,
    });
  }

  function buildPhaserRunSnapshot() {
    return buildPhaserRunSnapshotFromModule({
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

  function registerPhaserRunApi() {
    registerPhaserRunApiFromModule({
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
      runApiMethods: RUN_API_METHODS,
      assertApiContract,
    });
  }

  function buildPhaserRewardSnapshot() {
    return buildPhaserRewardSnapshotFromModule({
      state,
      passiveDescription,
      passiveThumbUrl,
      relicRarityMeta,
      normalizeRelicRarity,
      getRunEventLog,
    });
  }

  function registerPhaserRewardApi() {
    registerPhaserRewardApiFromModule({
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
      rewardApiMethods: REWARD_API_METHODS,
      assertApiContract,
    });
  }

  function buildPhaserShopSnapshot() {
    return buildPhaserShopSnapshotFromModule({
      state,
      nonNegInt,
      clampNumber,
      shopItemName,
      shopItemDescription,
      getRunEventLog,
    });
  }

  function registerPhaserShopApi() {
    registerPhaserShopApiFromModule({
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
      shopApiMethods: SHOP_API_METHODS,
      assertApiContract,
    });
  }

  function buildPhaserOverlaySnapshot() {
    return buildPhaserOverlaySnapshotFromModule({
      state,
      collectionEntries,
      relicRarityMeta: RELIC_RARITY_META,
      passiveThumbUrl,
      passiveDescription,
    });
  }

  function registerPhaserOverlayApi() {
    registerPhaserOverlayApiFromModule({
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
      overlayApiMethods: OVERLAY_API_METHODS,
      assertApiContract,
    });
  }

  initializeRuntimeStartupFromModule({
    state,
    loadProfile,
    loadSavedRunSnapshot,
    registerPhaserMenuActions,
    registerPhaserRunApi,
    registerPhaserRewardApi,
    registerPhaserShopApi,
    registerPhaserOverlayApi,
    createLandscapeLockRequesterFn: createLandscapeLockRequester,
    globalWindow: window,
    globalDocument: document,
    bindRuntimeLifecycle: bindRuntimeLifecycleFromModule,
    bindRuntimeWindowLifecycle,
    unlockAudio,
    resizeCanvas,
    saveRunSnapshot,
    saveProfile,
    installRuntimeTestHooksFn: installRuntimeTestHooks,
    publishRuntimeTestHooks,
    renderGameToText,
    advanceTime,
    startRuntimeLoop,
  });

  })();
}
