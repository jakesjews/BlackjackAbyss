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
  BOSS_RELIC,
  RELIC_BY_ID,
  RELIC_RARITY_META,
  RELIC_RARITY_ORDER,
  RELICS,
} from "./core/relic-catalog.js";
import { buildTransitionSnapshot } from "./core/combat-actions.js";
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
import { createRuntimeLoop as createRuntimeLoopFromModule } from "./core/runtime-loop.js";
import { bindRuntimeLifecycle as bindRuntimeLifecycleFromModule } from "./core/runtime-lifecycle.js";
import { createRuntimeAudio as createRuntimeAudioFromModule } from "./core/runtime-audio.js";
import { createEnemyAvatarLoader as createEnemyAvatarLoaderFromModule } from "./core/enemy-avatars.js";
import { initializeRuntimeStartup as initializeRuntimeStartupFromModule } from "./core/runtime-startup.js";
import { createEncounterLifecycleHandlers as createEncounterLifecycleHandlersFromModule } from "./core/encounter-lifecycle.js";
import { createCombatImpactHandlers as createCombatImpactHandlersFromModule } from "./core/combat-impact.js";
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
import { installRuntimeModeBridge } from "./core/runtime-mode-bridge.js";
import { bindRuntimeWindowLifecycle, createLandscapeLockRequester } from "./core/audio-system.js";
import {
  CARD_SOURCES,
  GRUNT_SOURCES,
  MUSIC_TRACK_SOURCES,
  createRuntimeVisualSeeds,
} from "./core/runtime-content-seeds.js";
import { createRuntimeResources } from "./core/runtime-resources.js";
import { createRuntimeSnapshotRegistry } from "./core/runtime-snapshot-registry.js";
import { createRuntimeEffects } from "./core/runtime-effects.js";
import { createRuntimeBridgeRegistry } from "./core/runtime-bridge-registry.js";

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
  const { ambientOrbs: AMBIENT_ORBS, menuMotes: MENU_MOTES } = createRuntimeVisualSeeds({
    width: WIDTH,
    height: HEIGHT,
  });
  const {
    sanitizeEnemyAvatarKey,
    ensureEnemyAvatarLoaded,
    passiveThumbCache,
  } = createRuntimeResources({
    globalWindow: window,
    createEnemyAvatarLoader: createEnemyAvatarLoaderFromModule,
    sourceRoots: ["/images/avatars"],
  });

  const state = createRuntimeState({
    width: WIDTH,
    height: HEIGHT,
    audioEnabled: loadAudioEnabled(STORAGE_KEYS),
  });
  const runtimeTestFlags = readRuntimeTestFlags(window);

  installRuntimeModeBridge({
    state,
    reportMode: (mode) => {
      if (phaserBridge && typeof phaserBridge.reportMode === "function") {
        phaserBridge.reportMode(mode);
      }
    },
    resizeCanvas,
  });

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

  const passiveDescription = passiveDescriptionFromModule;

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

  const passiveSummary = passiveSummaryFromModule;

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
  let handBounds = null;
  const runtimeEffects = createRuntimeEffects({
    state,
    width: WIDTH,
    height: HEIGHT,
    cardW: CARD_W,
    cardH: CARD_H,
    getHandBoundsFn: () => handBounds,
    playImpactSfxFn: playImpactSfx,
    enemyDefeatTransitionSeconds: ENEMY_DEFEAT_TRANSITION_SECONDS,
    playerDefeatTransitionSeconds: PLAYER_DEFEAT_TRANSITION_SECONDS,
  });
  const {
    beginQueuedEnemyDefeatTransition,
    damageFloatAnchor,
    easeOutCubic,
    lerp,
    queueEnemyDefeatTransition,
    spawnFloatText,
    spawnSparkBurst,
    startDefeatTransition,
    triggerFlash,
    triggerHandTackle,
    triggerImpactBurst,
    triggerImpactBurstAt,
    triggerScreenShake,
  } = runtimeEffects;

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
    resolveDealerThenShowdownFn: (naturalCheck) => {
      combatTurnActions.resolveDealerThenShowdown(naturalCheck);
    },
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
    handBounds: handBoundsFromLifecycle,
    dealCard,
    startHand,
    beginEncounter,
    startRun,
  } = encounterLifecycleHandlers;
  handBounds = handBoundsFromLifecycle;

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
    resolveHand: (
      outcome,
      pTotal = handTotal(state.encounter.playerHand).total,
      dTotal = handTotal(state.encounter.dealerHand).total
    ) => {
      combatResolution.resolveHand(outcome, pTotal, dTotal);
    },
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

  function goHomeFromActiveRun() {
    goHomeFromActiveRunModule({
      state,
      playUiSfx,
      saveRunSnapshot,
    });
  }

  const runtimeSnapshotRegistry = createRuntimeSnapshotRegistry({
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
    relicRarityMetaTable: RELIC_RARITY_META,
  });
  const {
    buildPhaserRunSnapshot,
    buildPhaserRewardSnapshot,
    buildPhaserShopSnapshot,
    buildPhaserOverlaySnapshot,
  } = runtimeSnapshotRegistry;
  const runtimeBridgeRegistry = createRuntimeBridgeRegistry({
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
    runApiMethods: RUN_API_METHODS,
    buildPhaserRewardSnapshot,
    moveSelection,
    claimReward,
    clampNumber,
    rewardApiMethods: REWARD_API_METHODS,
    buildPhaserShopSnapshot,
    buyShopItem,
    leaveShop,
    shopApiMethods: SHOP_API_METHODS,
    collectionEntries,
    collectionPageLayout,
    buildPhaserOverlaySnapshot,
    overlayApiMethods: OVERLAY_API_METHODS,
  });
  const {
    registerPhaserMenuActions,
    registerPhaserRunApi,
    registerPhaserRewardApi,
    registerPhaserShopApi,
    registerPhaserOverlayApi,
  } = runtimeBridgeRegistry;

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
