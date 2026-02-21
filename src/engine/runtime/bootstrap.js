import { MAX_RUN_HISTORY, STORAGE_KEYS } from "./constants.js";
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
import { registerBridgeApi } from "./bootstrap/api-registry.js";
import {
  registerPhaserMenuActions as registerPhaserMenuActionsFromModule,
  registerPhaserOverlayApi as registerPhaserOverlayApiFromModule,
  registerPhaserRewardApi as registerPhaserRewardApiFromModule,
  registerPhaserRunApi as registerPhaserRunApiFromModule,
  registerPhaserShopApi as registerPhaserShopApiFromModule,
} from "./bootstrap/phaser-bridge-apis.js";
import {
  BOSS_RELIC,
  RELIC_BY_ID,
  RELIC_RARITY_META,
  RELIC_RARITY_ORDER,
  RELICS,
} from "./bootstrap/relic-catalog.js";
import { buildTransitionSnapshot } from "./bootstrap/combat-actions.js";
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
} from "./bootstrap/combat-effects.js";
import { createCombatResolution } from "./bootstrap/combat-resolution.js";
import { createCombatTurnActions } from "./bootstrap/combat-turn-actions.js";
import {
  buildEnemyIntroDialogue as buildEnemyIntroDialogueFromModule,
  createEncounter as createEncounterFromModule,
  createEncounterIntroState as createEncounterIntroStateFromModule,
  createEnemy as createEnemyFromModule,
} from "./bootstrap/encounter-factory.js";
import {
  advanceEncounterIntro as advanceEncounterIntroFromModule,
  confirmEncounterIntro as confirmEncounterIntroFromModule,
  isEncounterIntroActive as isEncounterIntroActiveFromModule,
  revealEncounterIntro as revealEncounterIntroFromModule,
  updateEncounterIntroTyping as updateEncounterIntroTypingFromModule,
} from "./bootstrap/encounter-intro.js";
import { createEncounterOutcomeHandlers } from "./bootstrap/encounter-outcome.js";
import { createRewardShopHandlers } from "./bootstrap/reward-shop.js";
import { applyHexAlpha, hydrateShopStock, serializeShopStock } from "./bootstrap/serialization.js";
import { buildPhaserRunSnapshot as buildPhaserRunSnapshotFromModule } from "./bootstrap/phaser-run-snapshot.js";
import { buildPhaserOverlaySnapshot as buildPhaserOverlaySnapshotFromModule } from "./bootstrap/overlay-snapshot.js";
import {
  buildPhaserRewardSnapshot as buildPhaserRewardSnapshotFromModule,
  buildPhaserShopSnapshot as buildPhaserShopSnapshotFromModule,
} from "./bootstrap/shop-reward-snapshots.js";
import {
  buildAvailableActions as buildAvailableActionsFromModule,
  renderGameToText as renderGameToTextFromModule,
} from "./bootstrap/runtime-text-snapshot.js";
import { createRuntimeUpdater } from "./bootstrap/runtime-update.js";
import { goHomeFromActiveRun as goHomeFromActiveRunModule } from "./bootstrap/run-lifecycle.js";
import { applyTestEconomyToNewRun as applyTestEconomyToNewRunFromModule, createRun as createRunFromModule } from "./bootstrap/run-factory.js";
import {
  applyChipDelta as applyChipDeltaFromModule,
  finalizeRunIntoProfile as finalizeRunIntoProfileFromModule,
  updateProfileBest as updateProfileBestFromModule,
} from "./bootstrap/run-results.js";
import {
  collectionEntries as collectionEntriesFromModule,
  collectionPageLayout as collectionPageLayoutFromModule,
  passiveDescription as passiveDescriptionFromModule,
  passiveStacksForRun as passiveStacksForRunFromModule,
  passiveSummary as passiveSummaryFromModule,
  passiveThumbUrl as passiveThumbUrlFromModule,
} from "./bootstrap/passive-view.js";
import {
  buildSavedRunSnapshot,
  clearSavedRunState,
  hydrateResumeSnapshot,
  loadSavedRunSnapshotFromStorage,
  persistSavedRunSnapshot,
  resetTransientStateAfterResume,
} from "./bootstrap/run-snapshot.js";
import {
  addLogToRun,
  getRunEventLog as getRunEventLogFromModule,
  hasSavedRunState,
  hidePassiveTooltipState,
  moveSelectionState,
  openCollectionState,
  setAnnouncementState,
} from "./bootstrap/runtime-ui-state.js";
import {
  sanitizeCard as sanitizeCardFromModule,
  sanitizeCardList as sanitizeCardListFromModule,
  sanitizeEncounter as sanitizeEncounterFromModule,
  sanitizeRun as sanitizeRunFromModule,
} from "./bootstrap/state-sanitizers.js";
import { installRuntimeTestHooks } from "./bootstrap/test-hooks.js";
import { bindRuntimeWindowLifecycle, createLandscapeLockRequester } from "./bootstrap/audio-system.js";

let runtimeBootstrapped = false;

export function bootstrapRuntime() {
  if (runtimeBootstrapped) {
    return;
  }
  runtimeBootstrapped = true;

  (() => {
    "use strict";

  const phaserBridge = window.__ABYSS_PHASER_BRIDGE__ || null;
  const gameShell = document.getElementById("game-shell");
  const canvas = phaserBridge?.getCanvas?.() || document.getElementById("game-canvas");
  if (!gameShell || !canvas) {
    throw new Error("Unable to initialize Phaser runtime context.");
  }

  const WIDTH = 1280;
  const HEIGHT = 720;
  const MAX_SPLIT_HANDS = 4;
  const ENEMY_DEFEAT_TRANSITION_SECONDS = 1.9;
  const PLAYER_DEFEAT_TRANSITION_SECONDS = 1.02;
  const CARD_W = 88;
  const CARD_H = 124;
  const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };
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
  const ENEMY_AVATAR_SOURCE_ROOTS = ["/images/avatars"];
  const enemyAvatarCache = new Map();

  function sanitizeEnemyAvatarKey(name) {
    if (typeof name !== "string") {
      return "";
    }
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function enemyAvatarSourcesForKey(key) {
    return ENEMY_AVATAR_SOURCE_ROOTS.map((root) => `${root}/${key}.png`);
  }

  function ensureEnemyAvatarLoaded(key) {
    if (!key) {
      return null;
    }
    const cached = enemyAvatarCache.get(key);
    if (cached && (cached.status === "loading" || cached.status === "ready")) {
      return cached;
    }

    const image = new window.Image();
    image.decoding = "async";
    const entry = {
      key,
      status: "loading",
      image,
      sourceIndex: 0,
    };
    enemyAvatarCache.set(key, entry);
    const sources = enemyAvatarSourcesForKey(key);

    const tryNextSource = () => {
      if (entry.sourceIndex >= sources.length) {
        entry.status = "error";
        return;
      }
      const src = sources[entry.sourceIndex];
      image.onload = () => {
        entry.status = "ready";
      };
      image.onerror = () => {
        entry.sourceIndex += 1;
        tryNextSource();
      };
      image.src = src;
    };

    tryNextSource();
    return entry;
  }

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

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, n));
  }

  function nonNegInt(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(0, Math.floor(n));
  }

  function normalizeRelicRarity(rarity) {
    return normalizeRelicRarityFromDomain(rarity, RELIC_RARITY_META);
  }

  function relicRarityMeta(relic) {
    return getRelicRarityMetaFromDomain(relic, RELIC_RARITY_META);
  }

  function profileCollectionCount(profile) {
    return countCollectedCopies(profile?.relicCollection);
  }

  function profileDistinctCollectionCount(profile) {
    return countDistinctCollected(profile?.relicCollection);
  }

  function unlockProgressFor(relic, profile = state.profile) {
    if (!relic || !relic.unlock) {
      return {
        unlocked: true,
        current: 1,
        target: 1,
        label: "Unlocked by default",
      };
    }

    const req = relic.unlock;
    const target = Math.max(1, nonNegInt(req.min, 1));
    const totals = profile?.totals || {};
    let current = 0;
    if (req.key === "distinctRelics") {
      current = profileDistinctCollectionCount(profile);
    } else if (req.key === "relicCopies") {
      current = profileCollectionCount(profile);
    } else if (Object.prototype.hasOwnProperty.call(totals, req.key)) {
      current = nonNegInt(totals[req.key], 0);
    }
    const label = typeof req.label === "string" && req.label.trim().length > 0 ? req.label.trim() : `Reach ${target} ${req.key}`;
    return {
      unlocked: current >= target,
      current,
      target,
      label,
    };
  }

  function isRelicUnlocked(relic, profile = state.profile) {
    return unlockProgressFor(relic, profile).unlocked;
  }

  function relicUnlockLabel(relic, profile = state.profile) {
    const progress = unlockProgressFor(relic, profile);
    if (progress.unlocked) {
      return "Unlocked";
    }
    return `${progress.label} (${progress.current}/${progress.target})`;
  }

  function mergePlayerStats(statsLike) {
    const merged = defaultPlayerStats();
    if (!statsLike || typeof statsLike !== "object") {
      return merged;
    }

    for (const key of Object.keys(merged)) {
      const candidate = Number(statsLike[key]);
      if (Number.isFinite(candidate)) {
        merged[key] = candidate;
      }
    }

    merged.goldMultiplier = Math.max(0.5, merged.goldMultiplier);
    merged.critChance = Math.max(0, Math.min(0.6, merged.critChance));
    merged.bustGuardPerEncounter = nonNegInt(merged.bustGuardPerEncounter, 1);
    merged.luckyStart = nonNegInt(merged.luckyStart, 0);
    merged.flatDamage = Math.min(14, merged.flatDamage);
    merged.block = Math.min(10, merged.block);
    merged.goldMultiplier = Math.min(2.35, merged.goldMultiplier);

    return merged;
  }

  function normalizeProfile(profileLike) {
    const base = createProfile();
    if (!profileLike || typeof profileLike !== "object") {
      return base;
    }

    if (profileLike.totals && typeof profileLike.totals === "object") {
      for (const key of Object.keys(base.totals)) {
        base.totals[key] = nonNegInt(profileLike.totals[key], base.totals[key]);
      }
    }

    if (profileLike.relicCollection && typeof profileLike.relicCollection === "object") {
      for (const [id, count] of Object.entries(profileLike.relicCollection)) {
        if (typeof id === "string" && id.length > 0) {
          base.relicCollection[id] = nonNegInt(count, 0);
        }
      }
    }

    if (Array.isArray(profileLike.runs)) {
      base.runs = profileLike.runs
        .slice(0, MAX_RUN_HISTORY)
        .map((entry) => ({
          at: typeof entry?.at === "number" ? entry.at : Date.now(),
          outcome: entry?.outcome === "victory" ? "victory" : "defeat",
          floor: nonNegInt(entry?.floor, 1),
          room: nonNegInt(entry?.room, 1),
          enemiesDefeated: nonNegInt(entry?.enemiesDefeated, 0),
          hands: nonNegInt(entry?.hands, 0),
          chips: nonNegInt(entry?.chips, 0),
        }));
    }

    return base;
  }

  function loadProfile() {
    const raw = safeGetStorage(STORAGE_KEYS.profile);
    if (!raw) {
      return createProfile();
    }
    try {
      return normalizeProfile(JSON.parse(raw));
    } catch {
      return createProfile();
    }
  }

  function saveProfile() {
    if (!state.profile) {
      return;
    }
    safeSetStorage(STORAGE_KEYS.profile, JSON.stringify(state.profile));
  }

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

  function clearSavedRun() {
    clearSavedRunState({
      safeRemoveStorage,
      storageKey: STORAGE_KEYS.run,
      state,
    });
  }

  function saveRunSnapshot() {
    const snapshot = buildSavedRunSnapshot({
      state,
      serializeShopStock,
    });
    if (!snapshot) {
      clearSavedRun();
      return;
    }
    persistSavedRunSnapshot({
      safeSetStorage,
      storageKey: STORAGE_KEYS.run,
      snapshot,
    });
    state.savedRunSnapshot = snapshot;
  }

  function loadSavedRunSnapshot() {
    return loadSavedRunSnapshotFromStorage({
      safeGetStorage,
      storageKey: STORAGE_KEYS.run,
    });
  }

  function resumeSavedRun() {
    const snapshot = state.savedRunSnapshot || loadSavedRunSnapshot();
    if (!snapshot) {
      return false;
    }

    const hydrated = hydrateResumeSnapshot({
      snapshot,
      sanitizeRun,
      sanitizeEncounter,
      relicById: RELIC_BY_ID,
      hydrateShopStock,
      generateCampRelicDraftStock,
      nonNegInt,
    });
    if (!hydrated) {
      clearSavedRun();
      return false;
    }

    state.run = hydrated.run;
    state.encounter = hydrated.encounter;
    state.mode = hydrated.mode;
    state.rewardOptions = hydrated.rewardOptions;
    state.shopStock = hydrated.shopStock;
    state.selectionIndex = hydrated.selectionIndex;
    if (hydrated.introActive) {
      state.announcement = "";
      state.announcementTimer = 0;
      state.announcementDuration = 0;
    } else {
      setAnnouncement("Run resumed.", 1.8);
    }
    resetTransientStateAfterResume(state);
    state.savedRunSnapshot = snapshot;
    updateProfileBest(hydrated.run);
    unlockAudio();
    playUiSfx("confirm");
    resizeCanvas();
    return true;
  }

  function updateProfileBest(run) {
    updateProfileBestFromModule({
      profile: state.profile,
      run,
    });
  }

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

  function getAudioContextCtor() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function ensureMusicElement() {
    if (state.audio.musicElement) {
      return state.audio.musicElement;
    }
    const track = new Audio();
    track.preload = "auto";
    track.loop = true;
    track.volume = 0;
    track.src = MUSIC_TRACK_SOURCES[state.audio.musicSourceIndex] || MUSIC_TRACK_SOURCES[0];
    track.addEventListener("error", () => {
      if (state.audio.musicSourceIndex < MUSIC_TRACK_SOURCES.length - 1) {
        state.audio.musicSourceIndex += 1;
        track.src = MUSIC_TRACK_SOURCES[state.audio.musicSourceIndex];
      }
    });
    state.audio.musicElement = track;
    return track;
  }

  function musicTargetVolumeForMode(mode) {
    if (mode === "menu") {
      return 0.13;
    }
    if (mode === "playing") {
      return 0.17;
    }
    return 0.145;
  }

  function markSfxActivity(weight = 1) {
    const intensity = Math.max(0.2, Math.min(2, Number(weight) || 1));
    const duckSeconds = 0.14 + Math.min(0.26, intensity * 0.08);
    state.audio.musicDuckTimer = Math.max(duckSeconds, Number(state.audio.musicDuckTimer) || 0);
  }

  function ensureAudioGraph() {
    if (state.audio.context) {
      return state.audio.context;
    }

    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      return null;
    }

    const context = new Ctor();
    const masterGain = context.createGain();
    const musicGain = context.createGain();
    const sfxGain = context.createGain();

    masterGain.gain.value = 0;
    musicGain.gain.value = 0.19;
    sfxGain.gain.value = 0.5;

    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);

    state.audio.context = context;
    state.audio.masterGain = masterGain;
    state.audio.musicGain = musicGain;
    state.audio.sfxGain = sfxGain;
    return context;
  }

  function syncAudioEnabled() {
    if (!state.audio.context || !state.audio.masterGain) {
      return;
    }
    const target = state.audio.enabled ? 0.86 : 0;
    state.audio.masterGain.gain.setTargetAtTime(target, state.audio.context.currentTime, 0.08);
    const track = ensureMusicElement();
    if (!track) {
      return;
    }
    if (!state.audio.enabled) {
      track.volume = 0;
      if (!track.paused) {
        track.pause();
      }
    }
  }

  function unlockAudio() {
    const context = ensureAudioGraph();
    if (!context) {
      return;
    }
    state.audio.started = true;
    const prime = () => {
      if (!state.audio.primed) {
        try {
          const osc = context.createOscillator();
          const gain = context.createGain();
          gain.gain.value = 0.00001;
          osc.frequency.setValueAtTime(440, context.currentTime);
          osc.connect(gain);
          gain.connect(state.audio.masterGain);
          osc.start(context.currentTime);
          osc.stop(context.currentTime + 0.03);
          state.audio.primed = true;
        } catch {
          // Ignore priming failures on browsers with stricter policies.
        }
      }
      syncAudioEnabled();
      const track = ensureMusicElement();
      if (track && state.audio.enabled && track.paused) {
        const playPromise = track.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      }
    };

    if (context.state !== "running" && state.audio.enabled) {
      context.resume().then(prime).catch(() => {});
    } else {
      prime();
    }
  }

  function setAudioEnabled(enabled) {
    state.audio.enabled = Boolean(enabled);
    saveAudioEnabled(state.audio.enabled, STORAGE_KEYS);
    if (state.audio.enabled) {
      unlockAudio();
    }
    syncAudioEnabled();
    const line = state.audio.enabled ? "Sound enabled." : "Sound muted.";
    if (state.run) {
      addLog(line);
    } else {
      setAnnouncement(line, 1.1);
    }
  }

  function toggleAudio() {
    setAudioEnabled(!state.audio.enabled);
  }

  function canPlayAudio() {
    return (
      state.audio.enabled &&
      state.audio.started &&
      Boolean(state.audio.context) &&
      state.audio.context.state === "running"
    );
  }

  function playTone(freq, duration, opts = {}) {
    if (!canPlayAudio()) {
      return;
    }
    const context = state.audio.context;
    const isMusicBus = opts.bus === "music";
    const bus = isMusicBus ? state.audio.musicGain : state.audio.sfxGain;
    if (!context || !bus) {
      return;
    }

    const when = Math.max(context.currentTime, Number(opts.when) || context.currentTime);
    const attack = Math.max(0.001, Number(opts.attack) || 0.002);
    const release = Math.max(0.012, Number(opts.release) || 0.09);
    const gainLevel = Math.max(0.001, Number(opts.gain) || 0.08);
    const sustainLevel = Math.max(0, Math.min(gainLevel, Number(opts.sustainGain) || gainLevel * 0.72));
    if (!isMusicBus) {
      markSfxActivity(Math.max(0.3, gainLevel * 9));
    }

    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = opts.type || "triangle";
    osc.frequency.setValueAtTime(Math.max(20, freq), when);
    if (Number.isFinite(opts.detune)) {
      osc.detune.setValueAtTime(opts.detune, when);
    }

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(gainLevel, when + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, when + Math.max(attack + 0.01, duration * 0.55));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + release);

    osc.connect(gain);
    gain.connect(bus);

    osc.start(when);
    osc.stop(when + duration + release + 0.01);
  }

  function playImpactSfx(amount, target) {
    const hit = Math.max(1, Number(amount) || 1);
    const base = target === "enemy" ? 168 : 110;
    const length = Math.min(0.28, 0.09 + hit * 0.009);
    playTone(base, length, { type: "triangle", gain: Math.min(0.25, 0.08 + hit * 0.01), release: 0.18 });
    playTone(base * 1.62, Math.max(0.05, length * 0.7), {
      type: "square",
      gain: Math.min(0.14, 0.035 + hit * 0.006),
      release: 0.08,
      detune: target === "enemy" ? 6 : -9,
    });
  }

  function playDealSfx(target) {
    const base = target === "player" ? 590 : 470;
    playTone(base, 0.05, { type: "square", gain: 0.04, release: 0.03 });
  }

  function playFireballLaunchSfx(attacker = "player", target = "enemy", amount = 1) {
    const power = Math.max(1, Number(amount) || 1);
    const towardEnemy = target === "enemy";
    const now = state.audio.context?.currentTime || 0;
    const base = towardEnemy ? 412 : 332;
    playTone(base + (attacker === "enemy" ? -24 : 24), 0.08, {
      type: "sawtooth",
      gain: Math.min(0.13, 0.055 + power * 0.002),
      release: 0.06,
      when: now,
      detune: towardEnemy ? 14 : -14,
    });
    playTone(base * 1.52, 0.12, {
      type: "triangle",
      gain: Math.min(0.11, 0.045 + power * 0.0015),
      release: 0.1,
      when: now + 0.03,
      detune: towardEnemy ? 8 : -8,
    });
  }

  function playFireballImpactSfx(amount = 1, target = "enemy") {
    const power = Math.max(1, Number(amount) || 1);
    const now = state.audio.context?.currentTime || 0;
    playImpactSfx(power, target);
    playTone(target === "enemy" ? 148 : 132, Math.min(0.22, 0.1 + power * 0.004), {
      type: "square",
      gain: Math.min(0.16, 0.055 + power * 0.0024),
      release: 0.1,
      when: now + 0.01,
    });
    playTone(target === "enemy" ? 220 : 196, Math.min(0.3, 0.12 + power * 0.005), {
      type: "triangle",
      gain: Math.min(0.12, 0.04 + power * 0.0018),
      release: 0.18,
      when: now + 0.05,
    });
  }

  function playUiSfx(kind) {
    if (kind === "card") {
      playCardSfx();
      return;
    }
    if (kind === "select") {
      playTone(820, 0.045, { type: "sine", gain: 0.034, release: 0.025 });
      return;
    }
    if (kind === "confirm") {
      const now = state.audio.context?.currentTime || 0;
      playTone(600, 0.06, { type: "triangle", gain: 0.06, release: 0.04 });
      playTone(900, 0.09, { type: "sine", gain: 0.05, release: 0.06, when: now + 0.045 });
      return;
    }
    if (kind === "error") {
      playTone(230, 0.09, { type: "square", gain: 0.06, release: 0.08 });
      return;
    }
    if (kind === "coin") {
      const now = state.audio.context?.currentTime || 0;
      playTone(760, 0.06, { type: "triangle", gain: 0.06, release: 0.04, when: now });
      playTone(1180, 0.08, { type: "sine", gain: 0.055, release: 0.06, when: now + 0.05 });
    }
  }

  function playActionSfx(action) {
    if (action === "hit") {
      playTone(510, 0.05, { type: "square", gain: 0.05, release: 0.04 });
      return;
    }
    if (action === "stand") {
      playTone(360, 0.08, { type: "triangle", gain: 0.055, release: 0.08 });
      return;
    }
    if (action === "double") {
      const now = state.audio.context?.currentTime || 0;
      playTone(460, 0.09, { type: "square", gain: 0.08, release: 0.08, when: now });
      playTone(690, 0.12, { type: "triangle", gain: 0.07, release: 0.1, when: now + 0.06 });
    }
  }

  function playOutcomeSfx(outcome, outgoing, incoming) {
    if (outcome === "blackjack") {
      const now = state.audio.context?.currentTime || 0;
      playTone(440, 0.12, { type: "triangle", gain: 0.085, release: 0.1, when: now });
      playTone(660, 0.14, { type: "triangle", gain: 0.075, release: 0.12, when: now + 0.05 });
      playTone(990, 0.2, { type: "sine", gain: 0.07, release: 0.16, when: now + 0.1 });
      return;
    }

    if (!isExternalModeRendering()) {
      if (outgoing > 0) {
        playImpactSfx(outgoing, "enemy");
      }
      if (incoming > 0) {
        playImpactSfx(incoming, "player");
      }
    }

    if (outcome === "push") {
      playTone(420, 0.06, { type: "sine", gain: 0.03, release: 0.04 });
    }
  }

  function ensureGruntElement() {
    if (state.audio.gruntElement) {
      return state.audio.gruntElement;
    }
    const clip = new Audio();
    clip.preload = "auto";
    clip.src = GRUNT_SOURCES[state.audio.gruntSourceIndex] || GRUNT_SOURCES[0];
    clip.addEventListener("error", () => {
      if (state.audio.gruntSourceIndex < GRUNT_SOURCES.length - 1) {
        state.audio.gruntSourceIndex += 1;
        clip.src = GRUNT_SOURCES[state.audio.gruntSourceIndex];
      }
    });
    state.audio.gruntElement = clip;
    return clip;
  }

  function ensureCardElements() {
    if (Array.isArray(state.audio.cardElements) && state.audio.cardElements.length > 0) {
      return state.audio.cardElements;
    }
    const poolSize = 3;
    const clips = [];
    for (let i = 0; i < poolSize; i += 1) {
      const clip = new Audio();
      clip.preload = "auto";
      clip.src = CARD_SOURCES[state.audio.cardSourceIndex] || CARD_SOURCES[0];
      clip.addEventListener("error", () => {
        if (state.audio.cardSourceIndex < CARD_SOURCES.length - 1) {
          state.audio.cardSourceIndex += 1;
          clip.src = CARD_SOURCES[state.audio.cardSourceIndex];
        }
      });
      clips.push(clip);
    }
    state.audio.cardElements = clips;
    return clips;
  }

  function playCardSfx() {
    if (!canPlayAudio()) {
      return;
    }
    markSfxActivity(1.25);
    const clips = ensureCardElements();
    if (!Array.isArray(clips) || clips.length === 0) {
      return;
    }
    const index = Math.max(0, Math.floor(state.audio.cardNextIndex || 0)) % clips.length;
    const clip = clips[index];
    state.audio.cardNextIndex = (index + 1) % clips.length;
    if (!clip) {
      return;
    }
    clip.currentTime = 0;
    clip.volume = 0.62;
    const playPromise = clip.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function playGruntSfx() {
    if (!canPlayAudio()) {
      return;
    }
    markSfxActivity(1.35);
    const clip = ensureGruntElement();
    if (!clip) {
      return;
    }
    clip.currentTime = 0;
    clip.volume = 0.72;
    const playPromise = clip.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function updateMusic(dt) {
    const track = ensureMusicElement();
    if (!track) {
      return;
    }
    if (!canPlayAudio()) {
      track.volume = 0;
      if (!track.paused) {
        track.pause();
      }
      return;
    }

    if (track.paused) {
      const playPromise = track.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }

    state.audio.musicDuckTimer = Math.max(0, (Number(state.audio.musicDuckTimer) || 0) - dt);
    const ducking = state.audio.musicDuckTimer > 0 ? 0.4 : 1;
    const targetVolume = musicTargetVolumeForMode(state.mode) * ducking;
    const currentVolume = clampNumber(track.volume, 0, 1, 0);
    const easedVolume = lerp(currentVolume, targetVolume, Math.min(1, Math.max(0, dt * 7.2)));
    track.volume = clampNumber(easedVolume, 0, 1, targetVolume);
    state.audio.lastMusicMode = state.mode;
  }

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

  function finalizeResolveState() {
    if (!state.run || !state.encounter || state.pendingTransition) {
      return;
    }

    const run = state.run;
    const encounter = state.encounter;
    const enemy = encounter.enemy;
    if (!enemy) {
      return;
    }

    if (run.player.hp <= 0) {
      startDefeatTransition("player");
      setAnnouncement("You were defeated.", 1.2);
      addLog("You were defeated.");
      saveRunSnapshot();
      return;
    }

    if (enemy.hp <= 0) {
      if (isExternalModeRendering("playing")) {
        queueEnemyDefeatTransition();
      } else {
        startDefeatTransition("enemy");
      }
      setAnnouncement(`${enemy.name} down!`, 1.2);
      addLog(`${enemy.name} is down.`);
      saveRunSnapshot();
      return;
    }

    encounter.phase = "resolve";
    encounter.nextDealPrompted = false;
    encounter.resolveTimer = 0;
    saveRunSnapshot();
  }

  function applyImpactDamage(payload) {
    if (!payload || !state.run || !state.encounter || !state.encounter.enemy) {
      return;
    }

    const amount = Math.max(1, Number(payload.amount) || 1);
    const run = state.run;
    const enemy = state.encounter.enemy;
    const anchor = damageFloatAnchor(payload.target);

    if (payload.target === "enemy") {
      enemy.hp = Math.max(0, enemy.hp - amount);
      run.player.totalDamageDealt += amount;
      if (payload.crit) {
        spawnFloatText(`CRIT -${amount}`, anchor.x, anchor.y, "#ffe4a8", {
          size: 58,
          life: 1.45,
          vy: 9,
          weight: 800,
          jitter: true,
          glow: "#ffb86a",
        });
      } else {
        spawnFloatText(`-${amount}`, anchor.x, anchor.y, payload.color || "#ff916e");
      }
    } else if (payload.target === "player") {
      run.player.hp = Math.max(0, run.player.hp - amount);
      run.player.totalDamageTaken += amount;
      run.player.streak = 0;
      spawnFloatText(`-${amount}`, anchor.x, anchor.y, payload.color || "#ff86aa");
    }

    finalizeResolveState();
  }

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

  function drawFromShoe(encounter) {
    if (encounter.shoe.length < 6) {
      if (encounter.discard.length > 0) {
        encounter.shoe = shuffle(encounter.discard.splice(0));
      } else {
        encounter.shoe = shuffle(createDeck(4));
      }
    }
    return encounter.shoe.pop();
  }

  function luckyCardUpgrade(encounter, target, card) {
    if (!state.run || target !== "player") {
      return card;
    }

    const luckyStart = state.run.player.stats.luckyStart;
    if (luckyStart <= 0 || encounter.playerHand.length >= luckyStart) {
      return card;
    }

    let upgraded = card;
    let attempts = 0;
    while (rankValue(upgraded.rank) < 8 && attempts < 7) {
      encounter.discard.push(upgraded);
      upgraded = drawFromShoe(encounter);
      attempts += 1;
    }
    return upgraded;
  }

  function handLayout(count, layoutScale = 1) {
    return computeHandLayout({ count, layoutScale, cardW: CARD_W, cardH: CARD_H });
  }

  function handCardPosition(handType, index, count, layoutScale = 1) {
    return computeHandCardPosition({
      handType,
      index,
      count,
      layoutScale,
      cardW: CARD_W,
      cardH: CARD_H,
      width: WIDTH,
      portraitZoomed: Boolean(state.viewport?.portraitZoomed),
    });
  }

  function dealCard(encounter, target) {
    let card = drawFromShoe(encounter);
    card = luckyCardUpgrade(encounter, target, card);

    const hand = target === "player" ? encounter.playerHand : encounter.dealerHand;
    const spawnX = WIDTH * 0.5 - CARD_W * 0.5 + (target === "player" ? 64 : -64);
    const spawnY = target === "player" ? HEIGHT - CARD_H - 30 : 30;
    hand.push({
      ...card,
      dealtAt: state.worldTime,
      fromX: spawnX,
      fromY: spawnY,
    });
    if (!isExternalModeRendering("playing")) {
      playUiSfx("card");
    }

    const pos = handCardPosition(target, hand.length - 1, hand.length);
    state.cardBursts.push({
      x: pos.x + pos.w * 0.5,
      y: pos.y + pos.h * 0.5,
      color: target === "player" ? "#67ddff" : "#ffa562",
      life: 0.28,
      maxLife: 0.28,
    });
    spawnSparkBurst(pos.x + pos.w * 0.5, pos.y + pos.h * 0.5, target === "player" ? "#76e5ff" : "#ffbb84", 5, 88);
    playDealSfx(target);

    return hand[hand.length - 1];
  }

  function createEncounter(run) {
    return createEncounterFromModule({
      run,
      createEnemyFn: createEnemy,
      createEncounterIntroStateFn: createEncounterIntroState,
      resolveRoomTypeFn: resolveRoomType,
    });
  }

  function startHand() {
    const encounter = state.encounter;
    if (!encounter) {
      return;
    }

    encounter.playerHand = [];
    encounter.dealerHand = [];
    encounter.splitQueue = [];
    encounter.splitUsed = false;
    encounter.splitHandsTotal = 1;
    encounter.splitHandsResolved = 0;
    encounter.dealerResolved = false;
    encounter.hideDealerHole = !encounter.dealerResolved;
    encounter.phase = "player";
    encounter.resultText = "";
    encounter.resultTone = "neutral";
    encounter.resolveTimer = 0;
    encounter.nextDealPrompted = false;
    encounter.doubleDown = false;
    encounter.bustGuardTriggered = false;
    encounter.critTriggered = false;
    encounter.lastPlayerAction = "none";
    state.handTackles = [];
    state.handMessageAnchor = null;

    dealCard(encounter, "player");
    dealCard(encounter, "dealer");
    dealCard(encounter, "player");
    dealCard(encounter, "dealer");

    const playerNatural = isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);
    if (playerNatural || dealerNatural) {
      resolveDealerThenShowdown(true);
      return;
    }

    saveRunSnapshot();
  }

  function beginEncounter() {
    if (!state.run) {
      return;
    }

    state.mode = "playing";
    state.encounter = createEncounter(state.run);
    state.handTackles = [];
    state.combatLayout = null;
    state.handMessageAnchor = null;
    state.run.player.hp = clampNumber(state.run.player.hp, 0, state.run.player.maxHp, state.run.player.maxHp);
    state.pendingTransition = null;
    state.run.player.bustGuardsLeft = state.run.player.stats.bustGuardPerEncounter;
    if (state.run.player.stats.healOnEncounterStart > 0) {
      const heal = Math.min(state.run.player.stats.healOnEncounterStart, state.run.player.maxHp - state.run.player.hp);
      if (heal > 0) {
        state.run.player.hp += heal;
        spawnFloatText(`+${heal}`, WIDTH * 0.26, 540, "#8df0b2");
        addLog(`Life Thread restores ${heal} HP.`);
      }
    }
    state.selectionIndex = 0;

    const enemy = state.encounter.enemy;
    state.announcement = "";
    state.announcementTimer = 0;
    state.announcementDuration = 0;
    addLog(`${enemy.name} enters the table.`);
    saveRunSnapshot();
  }

  function startRun() {
    unlockAudio();
    playUiSfx("confirm");
    if (state.profile) {
      state.profile.totals.runsStarted += 1;
      saveProfile();
    }
    state.autosaveTimer = 0;
    state.run = createRun();
    applyTestEconomyToNewRun(state.run);
    state.run.player.hp = state.run.player.maxHp;
    state.rewardOptions = [];
    state.shopStock = [];
    state.selectionIndex = 0;
    state.floatingTexts = [];
    state.cardBursts = [];
    state.sparkParticles = [];
    state.handTackles = [];
    state.flashOverlays = [];
    state.screenShakeTime = 0;
    state.screenShakeDuration = 0;
    state.screenShakePower = 0;
    state.pendingTransition = null;
    state.combatLayout = null;
    clearSavedRun();
    beginEncounter();
    resizeCanvas();
  }

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

  function canPlayerAct() {
    return combatTurnActions.canPlayerAct();
  }

  function canAdvanceDeal() {
    return combatTurnActions.canAdvanceDeal();
  }

  function advanceToNextDeal() {
    return combatTurnActions.advanceToNextDeal();
  }

  function activeSplitHandCount(encounter) {
    return combatTurnActions.activeSplitHandCount(encounter);
  }

  function canSplitCurrentHand() {
    return combatTurnActions.canSplitCurrentHand();
  }

  function tryActivateBustGuard(encounter) {
    return combatTurnActions.tryActivateBustGuard(encounter);
  }

  function hitAction() {
    combatTurnActions.hitAction();
  }

  function standAction() {
    combatTurnActions.standAction();
  }

  function doubleAction() {
    combatTurnActions.doubleAction();
  }

  function startSplitHand(encounter, seedHand, announcementText, announcementDuration = 1.1) {
    return combatTurnActions.startSplitHand(encounter, seedHand, announcementText, announcementDuration);
  }

  function beginQueuedSplitHand(encounter) {
    return combatTurnActions.beginQueuedSplitHand(encounter);
  }

  function splitAction() {
    combatTurnActions.splitAction();
  }

  function resolveDealerThenShowdown(naturalCheck) {
    combatTurnActions.resolveDealerThenShowdown(naturalCheck);
  }

  function resolveHand(outcome, pTotal = handTotal(state.encounter.playerHand).total, dTotal = handTotal(state.encounter.dealerHand).total) {
    combatResolution.resolveHand(outcome, pTotal, dTotal);
  }

  function onEncounterWin() {
    encounterOutcomeHandlers.onEncounterWin();
  }

  function relicRarityWeights(source, floor) {
    return rewardShopHandlers.relicRarityWeights(source, floor);
  }

  function sampleRarity(weights) {
    return rewardShopHandlers.sampleRarity(weights);
  }

  function unlockedRelicPool(profile = state.profile) {
    return rewardShopHandlers.unlockedRelicPool(profile);
  }

  function sampleRelics(pool, count, source, floor) {
    return rewardShopHandlers.sampleRelics(pool, count, source, floor);
  }

  function generateRewardOptions(count, includeBossRelic) {
    return rewardShopHandlers.generateRewardOptions(count, includeBossRelic);
  }

  function generateCampRelicDraftStock(rewardOptions) {
    return rewardShopHandlers.generateCampRelicDraftStock(rewardOptions);
  }

  function generateShopStock(count) {
    return rewardShopHandlers.generateShopStock(count);
  }

  function applyRelic(relic) {
    rewardShopHandlers.applyRelic(relic);
  }

  function claimReward() {
    rewardShopHandlers.claimReward();
  }

  function buyShopItem(index = state.selectionIndex) {
    rewardShopHandlers.buyShopItem(index);
  }

  function leaveShop() {
    rewardShopHandlers.leaveShop();
  }

  function shopItemName(item) {
    return rewardShopHandlers.shopItemName(item);
  }

  function shopItemDescription(item) {
    return rewardShopHandlers.shopItemDescription(item);
  }

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
    const step = 1000 / 60;
    const steps = Math.max(1, Math.round(ms / step));
    for (let i = 0; i < steps; i += 1) {
      update(1 / 60);
    }
    render();
  }

  function resizeCanvas() {
    const viewportWidth = Math.max(
      1,
      Math.floor(window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || WIDTH)
    );
    const viewportHeight = Math.max(
      120,
      Math.floor(window.visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || HEIGHT)
    );
    gameShell.style.width = `${viewportWidth}px`;
    gameShell.style.height = `${viewportHeight}px`;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    state.viewport = {
      width: viewportWidth,
      height: viewportHeight,
      scale: 1,
      cropWorldX: 0,
      portraitZoomed: false,
    };

    const phaserGame = window.__ABYSS_PHASER_GAME__;
    if (phaserGame?.scale && typeof phaserGame.scale.resize === "function") {
      const currentW = Math.round(phaserGame.scale.gameSize?.width || 0);
      const currentH = Math.round(phaserGame.scale.gameSize?.height || 0);
      if (currentW !== viewportWidth || currentH !== viewportHeight) {
        phaserGame.scale.resize(viewportWidth, viewportHeight);
      }
    }
  }

  function tickFrame(dt) {
    update(dt);
    render();
  }

  let lastFrame = performance.now();
  function gameLoop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    tickFrame(dt);
    requestAnimationFrame(gameLoop);
  }

  function startRuntimeLoop() {
    resizeCanvas();
    render();
    if (phaserBridge && typeof phaserBridge.setStepHandler === "function") {
      let priorTime = performance.now();
      phaserBridge.setStepHandler((dtSeconds, timeMs) => {
        let dt = dtSeconds;
        if (!Number.isFinite(dt) || dt < 0) {
          const now = Number.isFinite(timeMs) ? timeMs : performance.now();
          dt = Math.max(0, (now - priorTime) / 1000);
          priorTime = now;
        } else if (Number.isFinite(timeMs)) {
          priorTime = timeMs;
        }
        tickFrame(Math.min(0.05, Math.max(0, dt)));
      });
      return;
    }
    requestAnimationFrame(gameLoop);
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

  state.profile = loadProfile();
  state.savedRunSnapshot = loadSavedRunSnapshot();
  registerPhaserMenuActions();
  registerPhaserRunApi();
  registerPhaserRewardApi();
  registerPhaserShopApi();
  registerPhaserOverlayApi();

  const requestLandscapeLock = createLandscapeLockRequester(window);

  bindRuntimeWindowLifecycle({
    globalWindow: window,
    globalDocument: document,
    unlockAudio,
    requestLandscapeLock,
    resizeCanvas,
    onHidden: () => {
      if (document.hidden) {
        saveRunSnapshot();
        saveProfile();
        if (state.audio.context && state.audio.context.state === "running") {
          state.audio.context.suspend().catch(() => {});
        }
        if (state.audio.musicElement && !state.audio.musicElement.paused) {
          state.audio.musicElement.pause();
        }
      }
    },
    onVisible: () => {
      if (state.audio.enabled && state.audio.started && state.audio.context && state.audio.context.state === "suspended") {
        state.audio.context.resume().then(() => {
          if (state.audio.musicElement && state.audio.musicElement.paused) {
            const playPromise = state.audio.musicElement.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
          }
        }).catch(() => {});
      }
      requestLandscapeLock();
    },
    onBeforeUnload: () => {
      saveRunSnapshot();
      saveProfile();
    },
  });

  installRuntimeTestHooks({
    publishRuntimeTestHooks,
    renderGameToText,
    advanceTime,
  });
  requestLandscapeLock();

    startRuntimeLoop();
  })();
}
