import { MAX_RUN_HISTORY, STORAGE_KEYS } from "./constants.js";
import { createRuntimeState, createProfile, defaultPlayerStats } from "./state/store.js";
import { loadAudioEnabled, safeGetStorage, safeRemoveStorage, safeSetStorage, saveAudioEnabled } from "./persistence/storage.js";
import {
  CARD_RANKS as RANKS,
  CARD_SUITS as SUITS,
  cardToText,
  canDoubleDown,
  canSplitHand,
  computeHandCardPosition,
  computeHandLayout,
  createDeck,
  handTotal,
  isBlackjack,
  rankValue,
  resolveShowdownOutcome,
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
  BOSS_RELIC,
  RELIC_BY_ID,
  RELIC_RARITY_META,
  RELIC_RARITY_ORDER,
  RELICS,
} from "./bootstrap/relic-catalog.js";
import { buildTransitionSnapshot } from "./bootstrap/combat-actions.js";
import {
  buildEnemyIntroDialogue as buildEnemyIntroDialogueFromModule,
  createEncounter as createEncounterFromModule,
  createEncounterIntroState as createEncounterIntroStateFromModule,
  createEnemy as createEnemyFromModule,
} from "./bootstrap/encounter-factory.js";
import { applyHexAlpha, hydrateShopStock, serializeShopStock } from "./bootstrap/serialization.js";
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
    state.passiveTooltipTimer = 0;
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
    if (!state.run) {
      return;
    }
    const line = typeof message === "string" ? message.trim() : "";
    if (!line) {
      return;
    }
    state.run.log.unshift({ message: line, ttl: 12 });
    if (state.run.log.length > 6) {
      state.run.log.length = 6;
    }
    if (!Array.isArray(state.run.eventLog)) {
      state.run.eventLog = [];
    }
    state.run.eventLog.push(line);
    if (state.run.eventLog.length > 240) {
      state.run.eventLog.shift();
    }
  }

  function setAnnouncement(message, duration = 2.2) {
    state.announcement = typeof message === "string" ? message : "";
    const safeDuration = Math.max(0.25, Number(duration) || 2.2);
    state.announcementTimer = safeDuration;
    state.announcementDuration = safeDuration;
  }

  function getRunEventLog(run = state.run) {
    if (!run || !Array.isArray(run.eventLog)) {
      return [];
    }
    return run.eventLog;
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
    const life = Math.max(0.1, Number(opts.life) || 1.2);
    state.floatingTexts.push({
      text,
      x,
      y,
      color,
      life,
      maxLife: life,
      vy: Number.isFinite(opts.vy) ? opts.vy : 24,
      size: Math.max(12, Number(opts.size) || 26),
      weight: Math.max(500, Number(opts.weight) || 700),
      jitter: Boolean(opts.jitter),
      glow: typeof opts.glow === "string" ? opts.glow : "",
      jitterSeed: Math.random() * Math.PI * 2,
    });
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - (1 - clamped) ** 3;
  }

  function easeOutBack(t) {
    const clamped = Math.max(0, Math.min(1, t));
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (clamped - 1) ** 3 + c1 * (clamped - 1) ** 2;
  }

  function animatedCardPosition(card, targetX, targetY) {
    const dealtAt = Number(card?.dealtAt);
    if (!Number.isFinite(dealtAt)) {
      return { x: targetX, y: targetY, alpha: 1 };
    }

    const progress = (state.worldTime - dealtAt) / 0.28;
    if (progress >= 1) {
      return { x: targetX, y: targetY, alpha: 1 };
    }

    const t = Math.max(0, progress);
    const eased = easeOutBack(t);
    const fromX = Number.isFinite(card?.fromX) ? card.fromX : targetX;
    const fromY = Number.isFinite(card?.fromY) ? card.fromY : targetY;
    const arc = Math.sin(t * Math.PI) * 16 * (1 - t);
    return {
      x: lerp(fromX, targetX, eased),
      y: lerp(fromY, targetY, eased) - arc,
      alpha: 0.42 + 0.58 * easeOutCubic(t),
    };
  }

  function spawnSparkBurst(x, y, color, count = 12, speed = 160) {
    const total = Math.max(2, Math.floor(count));
    for (let i = 0; i < total; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.45 + Math.random() * 0.85);
      state.sparkParticles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - Math.random() * 55,
        size: 1.4 + Math.random() * 3.2,
        color,
        life: 0.34 + Math.random() * 0.35,
        maxLife: 0.34 + Math.random() * 0.35,
      });
    }
  }

  function triggerScreenShake(power = 6, duration = 0.2) {
    state.screenShakePower = Math.max(state.screenShakePower, power);
    state.screenShakeDuration = Math.max(state.screenShakeDuration, duration);
    state.screenShakeTime = Math.max(state.screenShakeTime, duration);
  }

  function triggerFlash(color, intensity = 0.08, duration = 0.16) {
    state.flashOverlays.push({
      color,
      intensity: Math.max(0, intensity),
      life: Math.max(0.01, duration),
      maxLife: Math.max(0.01, duration),
    });
  }

  function triggerImpactBurstAt(x, y, amount, color) {
    const clampedAmount = Math.max(1, Number(amount) || 1);
    spawnSparkBurst(x, y, color, 10 + Math.min(30, Math.floor(clampedAmount * 1.4)), 140 + clampedAmount * 9);
    spawnSparkBurst(x, y, "#f7e8bf", 8 + Math.min(14, Math.floor(clampedAmount * 0.6)), 120 + clampedAmount * 7);
    state.cardBursts.push({
      x,
      y,
      color,
      life: 0.34,
      maxLife: 0.34,
    });
    triggerScreenShake(Math.min(18, 4 + clampedAmount * 0.72), 0.16 + Math.min(0.2, clampedAmount * 0.012));
    triggerFlash(color, Math.min(0.2, 0.035 + clampedAmount * 0.004), 0.14);
  }

  function triggerImpactBurst(side, amount, color) {
    const clampedAmount = Math.max(1, Number(amount) || 1);
    const x = side === "enemy" ? WIDTH * 0.73 : WIDTH * 0.27;
    const y = side === "enemy" ? 108 : 576;
    triggerImpactBurstAt(x, y, clampedAmount, color);
  }

  function handTackleTargets(winner) {
    if (!state.encounter) {
      return null;
    }
    const side = winner === "enemy" ? "dealer" : "player";
    const loserSide = winner === "enemy" ? "player" : "enemy";
    const layout = state.combatLayout || null;
    const box =
      side === "dealer"
        ? layout?.dealerBox || handBounds("dealer", Math.max(1, state.encounter.dealerHand.length))
        : layout?.playerBox || handBounds("player", Math.max(1, state.encounter.playerHand.length));
    if (!box) {
      return null;
    }
    const targetPortrait = loserSide === "enemy" ? layout?.enemyPortrait : layout?.playerPortrait;
    const targetX = targetPortrait ? targetPortrait.centerX : winner === "enemy" ? WIDTH * 0.28 : WIDTH * 0.72;
    const targetY = targetPortrait ? targetPortrait.centerY : winner === "enemy" ? HEIGHT * 0.82 : 114;
    return {
      fromX: box.centerX,
      fromY: box.centerY,
      toX: targetX,
      toY: targetY,
    };
  }

  function triggerHandTackle(winner, amount, impactPayload = null) {
    if (!state.encounter) {
      return false;
    }
    const points = handTackleTargets(winner);
    if (!points) {
      return false;
    }
    const layout = state.combatLayout || null;
    const sourceRects = winner === "enemy" ? layout?.dealerCards : layout?.playerCards;
    const sourceHand = winner === "enemy" ? state.encounter.dealerHand : state.encounter.playerHand;
    const count = Math.min(4, sourceHand.length);
    if (count <= 0) {
      return false;
    }
    const projectiles = [];
    for (let i = 0; i < count; i += 1) {
      const card = sourceHand[i];
      const rect = sourceRects && sourceRects[i] ? sourceRects[i] : null;
      const fallbackX = points.fromX + (i - (count - 1) * 0.5) * 24;
      const fallbackY = points.fromY + Math.abs(i - (count - 1) * 0.5) * 6;
      projectiles.push({
        card: { ...card },
        fromX: rect ? rect.x + rect.w * 0.5 : fallbackX,
        fromY: rect ? rect.y + rect.h * 0.5 : fallbackY,
        w: rect ? rect.w : CARD_W * 0.72,
        h: rect ? rect.h : CARD_H * 0.72,
      });
    }
    state.handTackles.push({
      projectiles,
      winner,
      fromX: points.fromX,
      fromY: points.fromY,
      toX: points.toX,
      toY: points.toY,
      elapsed: 0,
      duration: 0.56,
      impactAt: 0.72,
      impacted: false,
      amount: Math.max(1, Number(amount) || 1),
      color: winner === "enemy" ? "#ff8eaf" : "#f6d06e",
      impactPayload,
    });
    return true;
  }

  function damageFloatAnchor(target) {
    const layout = state.combatLayout || null;
    if (target === "enemy" && layout?.enemyPortrait) {
      return {
        x: layout.enemyPortrait.centerX,
        y: layout.enemyPortrait.y - 8,
      };
    }
    if (target === "player" && layout?.playerPortrait) {
      return {
        x: layout.playerPortrait.centerX,
        y: layout.playerPortrait.y - 8,
      };
    }
    return target === "enemy"
      ? { x: WIDTH * 0.72, y: 108 }
      : { x: WIDTH * 0.26, y: 576 };
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
    if (!state.encounter || state.pendingTransition) {
      return;
    }
    const handType = target === "enemy" ? "dealer" : "player";
    const hand = target === "enemy" ? state.encounter.dealerHand : state.encounter.playerHand;
    const layout = state.combatLayout || null;
    const cardScale = layout?.cardScale || 1;
    const bounds =
      target === "enemy"
        ? layout?.dealerBox || handBounds(handType, Math.max(1, hand.length), 0, cardScale)
        : layout?.playerBox || handBounds(handType, Math.max(1, hand.length), 0, cardScale);
    const color = target === "enemy" ? "#ffb07a" : "#ff8eaf";
    for (let i = 0; i < 3; i += 1) {
      const xJitter = (Math.random() * 2 - 1) * 24;
      const yJitter = (Math.random() * 2 - 1) * 18;
      spawnSparkBurst(bounds.centerX + xJitter, bounds.centerY + yJitter, color, 24 + i * 12, 210 + i * 70);
    }
    if (target === "enemy") {
      state.encounter.resultText = "Defeated Opponent";
      state.encounter.resultTone = "win";
    }
    triggerScreenShake(12, 0.46);
    triggerFlash(color, 0.14, 0.28);
    playImpactSfx(16, target === "enemy" ? "enemy" : "player");
    const transitionDuration = target === "enemy" ? ENEMY_DEFEAT_TRANSITION_SECONDS : PLAYER_DEFEAT_TRANSITION_SECONDS;
    state.pendingTransition = { target, timer: transitionDuration, duration: transitionDuration };
    state.encounter.phase = "done";
    state.encounter.resolveTimer = 0;
  }

  function queueEnemyDefeatTransition() {
    if (!state.encounter || state.pendingTransition) {
      return;
    }
    const transitionDuration = ENEMY_DEFEAT_TRANSITION_SECONDS;
    state.pendingTransition = {
      target: "enemy",
      timer: 0,
      duration: transitionDuration,
      waiting: true,
    };
    state.encounter.phase = "done";
    state.encounter.resolveTimer = 0;
    state.encounter.resultText = "Defeated Opponent";
    state.encounter.resultTone = "win";
  }

  function beginQueuedEnemyDefeatTransition() {
    const transition = state.pendingTransition;
    if (!transition || transition.target !== "enemy" || !transition.waiting) {
      return false;
    }
    transition.waiting = false;
    transition.timer = Math.max(0.001, Number(transition.duration) || ENEMY_DEFEAT_TRANSITION_SECONDS);
    triggerScreenShake(12, 0.46);
    triggerFlash("#ffb07a", 0.14, 0.28);
    playImpactSfx(16, "enemy");
    return true;
  }

  function currentShakeOffset() {
    if (state.screenShakeTime <= 0 || state.screenShakePower <= 0) {
      return { x: 0, y: 0 };
    }
    const duration = Math.max(0.01, state.screenShakeDuration);
    const t = Math.max(0, Math.min(1, state.screenShakeTime / duration));
    const strength = state.screenShakePower * t;
    return {
      x: (Math.random() * 2 - 1) * strength,
      y: (Math.random() * 2 - 1) * strength,
    };
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
    return Boolean(
      state.mode === "playing" &&
      encounter &&
      encounter.intro &&
      encounter.intro.active
    );
  }

  function updateEncounterIntroTyping(encounter, dt) {
    if (!encounter || !encounter.intro || !encounter.intro.active || encounter.intro.ready) {
      return;
    }
    const intro = encounter.intro;
    const dialogue = intro.dialogue || "";
    if (!dialogue.length) {
      intro.visibleChars = 0;
      intro.ready = true;
      intro.typeTimer = 0;
      return;
    }

    intro.typeTimer = Number.isFinite(intro.typeTimer) ? intro.typeTimer : 0;
    intro.typeTimer -= dt;

    while (intro.typeTimer <= 0 && intro.visibleChars < dialogue.length) {
      const ch = dialogue.charAt(intro.visibleChars);
      intro.visibleChars += 1;
      if (/[.!?,]/.test(ch)) {
        intro.typeTimer += 0.052;
      } else if (ch === " ") {
        intro.typeTimer += 0.008;
      } else {
        intro.typeTimer += 0.015;
      }
    }

    if (intro.visibleChars >= dialogue.length) {
      intro.visibleChars = dialogue.length;
      intro.ready = true;
      intro.typeTimer = 0;
    }
  }

  function revealEncounterIntro(encounter = state.encounter) {
    if (!isEncounterIntroActive(encounter) || !encounter?.intro) {
      return false;
    }
    const intro = encounter.intro;
    if (intro.ready) {
      return false;
    }
    intro.visibleChars = (intro.dialogue || "").length;
    intro.ready = true;
    intro.typeTimer = 0;
    saveRunSnapshot();
    return true;
  }

  function advanceEncounterIntro(encounter = state.encounter) {
    if (!isEncounterIntroActive(encounter)) {
      return false;
    }
    if (revealEncounterIntro(encounter)) {
      playUiSfx("select");
      return true;
    }
    return confirmEncounterIntro();
  }

  function confirmEncounterIntro() {
    if (!isEncounterIntroActive() || !state.encounter) {
      return false;
    }
    const intro = state.encounter.intro;
    if (!intro?.ready) {
      playUiSfx("error");
      return false;
    }
    intro.active = false;
    intro.confirmRect = null;
    intro.typeTimer = 0;
    intro.visibleChars = (intro.dialogue || "").length;
    playUiSfx("confirm");
    startHand();
    saveRunSnapshot();
    return true;
  }

  function canPlayerAct() {
    return (
      state.mode === "playing" &&
      Boolean(state.encounter) &&
      state.encounter.phase === "player" &&
      state.encounter.resolveTimer <= 0 &&
      !isEncounterIntroActive(state.encounter)
    );
  }

  function canAdvanceDeal() {
    return (
      state.mode === "playing" &&
      Boolean(state.encounter) &&
      state.encounter.phase === "resolve" &&
      !state.pendingTransition &&
      state.encounter.resolveTimer <= 0 &&
      state.handTackles.length === 0 &&
      !isEncounterIntroActive(state.encounter)
    );
  }

  function advanceToNextDeal() {
    if (!canAdvanceDeal() || !state.encounter) {
      playUiSfx("error");
      return false;
    }
    const encounter = state.encounter;
    encounter.handIndex += 1;
    encounter.nextDealPrompted = false;
    if (!beginQueuedSplitHand(encounter)) {
      startHand();
    }
    saveRunSnapshot();
    return true;
  }

  function activeSplitHandCount(encounter) {
    if (!encounter || !Array.isArray(encounter.splitQueue)) {
      return 1;
    }
    return 1 + encounter.splitQueue.length;
  }

  function canSplitCurrentHand() {
    return canSplitHand({
      canAct: canPlayerAct(),
      encounter: state.encounter,
      maxSplitHands: MAX_SPLIT_HANDS,
    });
  }

  function tryActivateBustGuard(encounter) {
    if (!state.run || state.run.player.bustGuardsLeft <= 0) {
      return false;
    }

    state.run.player.bustGuardsLeft -= 1;
    encounter.bustGuardTriggered = true;
    encounter.resultText = "Bust Guard transforms your bust into 21.";
    addLog("Bust guard triggered.");
    return true;
  }

  function hitAction() {
    if (!canPlayerAct()) {
      return;
    }

    playActionSfx("hit");
    addLog("Hit.");
    const encounter = state.encounter;
    encounter.lastPlayerAction = "hit";
    dealCard(encounter, "player");
    const total = handTotal(encounter.playerHand).total;

    if (total > 21 && !tryActivateBustGuard(encounter)) {
      resolveHand("player_bust");
      return;
    }

    if (total >= 21 || encounter.bustGuardTriggered) {
      resolveDealerThenShowdown(false);
    }
  }

  function standAction() {
    if (!canPlayerAct()) {
      return;
    }
    playActionSfx("stand");
    addLog("Stand.");
    state.encounter.lastPlayerAction = "stand";
    resolveDealerThenShowdown(false);
  }

  function doubleAction() {
    if (!canPlayerAct()) {
      return;
    }

    const encounter = state.encounter;
    if (encounter.doubleDown || encounter.splitUsed || encounter.playerHand.length !== 2) {
      playUiSfx("error");
      return;
    }

    playActionSfx("double");
    addLog("Double down.");
    encounter.doubleDown = true;
    encounter.lastPlayerAction = "double";
    dealCard(encounter, "player");
    const total = handTotal(encounter.playerHand).total;

    if (total > 21 && !tryActivateBustGuard(encounter)) {
      resolveHand("player_bust");
      return;
    }

    resolveDealerThenShowdown(false);
  }

  function startSplitHand(encounter, seedHand, announcementText, announcementDuration = 1.1) {
    if (!encounter || !Array.isArray(seedHand) || seedHand.length === 0) {
      return false;
    }

    encounter.playerHand = seedHand.map((card) => ({ rank: card.rank, suit: card.suit }));
    encounter.dealerHand = [];
    encounter.dealerResolved = false;
    encounter.hideDealerHole = true;
    encounter.phase = "player";
    encounter.resultText = "";
    encounter.resultTone = "neutral";
    encounter.resolveTimer = 0;
    encounter.nextDealPrompted = false;
    encounter.doubleDown = false;
    encounter.bustGuardTriggered = false;
    encounter.critTriggered = false;
    encounter.lastPlayerAction = "split";
    dealCard(encounter, "dealer");
    dealCard(encounter, "player");
    dealCard(encounter, "dealer");

    if (announcementText) {
      setAnnouncement(announcementText, announcementDuration);
    }

    const playerNatural = isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);
    if (playerNatural || dealerNatural) {
      resolveDealerThenShowdown(true);
      return true;
    }

    const total = handTotal(encounter.playerHand).total;
    if (total > 21 && !tryActivateBustGuard(encounter)) {
      resolveHand("player_bust");
      return true;
    }
    if (total >= 21 || encounter.bustGuardTriggered) {
      resolveDealerThenShowdown(false);
      return true;
    }
    if (isBlackjack(encounter.dealerHand)) {
      resolveDealerThenShowdown(true);
    }

    return true;
  }

  function beginQueuedSplitHand(encounter) {
    if (!encounter || !Array.isArray(encounter.splitQueue) || encounter.splitQueue.length === 0) {
      return false;
    }

    const seedHand = encounter.splitQueue.shift();
    encounter.splitHandsResolved = Math.min(
      Math.max(0, encounter.splitHandsTotal - 1),
      nonNegInt(encounter.splitHandsResolved, 0) + 1
    );
    const splitIndex = encounter.splitHandsResolved + 1;
    const splitTotal = Math.max(2, nonNegInt(encounter.splitHandsTotal, 2));
    return startSplitHand(encounter, seedHand, `Split hand ${splitIndex}/${splitTotal}.`);
  }

  function splitAction() {
    if (!canSplitCurrentHand()) {
      playUiSfx("error");
      return;
    }

    const encounter = state.encounter;
    const [first, second] = encounter.playerHand;
    if (state.run) {
      state.run.splitsUsed = nonNegInt(state.run.splitsUsed, 0) + 1;
    }
    if (!Array.isArray(encounter.splitQueue)) {
      encounter.splitQueue = [];
    }
    encounter.splitQueue.unshift([{ rank: second.rank, suit: second.suit }]);
    encounter.splitUsed = true;
    encounter.splitHandsTotal = Math.min(MAX_SPLIT_HANDS, nonNegInt(encounter.splitHandsTotal, 1) + 1);
    encounter.doubleDown = false;

    playActionSfx("double");
    addLog("Hand split.");
    addLog("Each split hand gets a fresh dealer.");
    const splitIndex = nonNegInt(encounter.splitHandsResolved, 0) + 1;
    const splitTotal = Math.max(2, nonNegInt(encounter.splitHandsTotal, 2));
    if (
      !startSplitHand(
        encounter,
        [{ rank: first.rank, suit: first.suit }],
        `Hand split. Play split hand ${splitIndex}/${splitTotal}.`,
        1.2
      )
    ) {
      playUiSfx("error");
    }
  }

  function resolveDealerThenShowdown(naturalCheck) {
    const encounter = state.encounter;
    if (!encounter || encounter.phase === "done") {
      return;
    }

    encounter.phase = "dealer";
    encounter.hideDealerHole = false;
    const dealerAlreadyResolved = Boolean(encounter.dealerResolved);

    if (!naturalCheck && !dealerAlreadyResolved) {
      while (handTotal(encounter.dealerHand).total < 17) {
        dealCard(encounter, "dealer");
      }
      if (encounter.splitUsed) {
        encounter.dealerResolved = true;
      }
    } else if (encounter.splitUsed && isBlackjack(encounter.dealerHand)) {
      encounter.dealerResolved = true;
    }

    const pTotal = encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total;
    const dTotal = handTotal(encounter.dealerHand).total;
    const playerNatural = !encounter.bustGuardTriggered && isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);

    const outcome = resolveShowdownOutcome({
      playerTotal: pTotal,
      dealerTotal: dTotal,
      playerNatural,
      dealerNatural,
    });

    resolveHand(outcome, pTotal, dTotal);
  }

  function resolveHand(outcome, pTotal = handTotal(state.encounter.playerHand).total, dTotal = handTotal(state.encounter.dealerHand).total) {
    if (!state.run || !state.encounter) {
      return;
    }

    const run = state.run;
    const encounter = state.encounter;
    const enemy = encounter.enemy;
    const lowHpBonus = run.player.hp <= run.player.maxHp * 0.5 ? run.player.stats.lowHpDamage : 0;
    const streakBonus = Math.min(4, Math.floor(run.player.streak / 2));
    const firstHandBonus = encounter.handIndex === 1 ? run.player.stats.firstHandDamage : 0;

    let outgoing = 0;
    let incoming = 0;
    let text = "Push.";
    let resultTone = "push";
    const splitBonus = encounter.splitUsed ? run.player.stats.splitWinDamage : 0;
    const eliteBonus = enemy.type === "normal" ? 0 : run.player.stats.eliteDamage;

    if (outcome === "blackjack") {
      outgoing =
        12 +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        run.player.stats.blackjackBonusDamage +
        splitBonus +
        eliteBonus +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0);
      text = "Blackjack!";
      resultTone = "special";
      run.blackjacks = nonNegInt(run.blackjacks, 0) + 1;
    } else if (outcome === "dealer_bust") {
      outgoing =
        7 +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        run.player.stats.dealerBustBonusDamage +
        splitBonus +
        eliteBonus +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0) +
        (encounter.lastPlayerAction === "double" ? run.player.stats.doubleWinDamage : 0);
      text = "Dealer bust.";
      resultTone = "win";
    } else if (outcome === "player_win") {
      outgoing =
        4 +
        Math.max(0, pTotal - dTotal) +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        splitBonus +
        eliteBonus +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0) +
        (encounter.lastPlayerAction === "stand" ? run.player.stats.standWinDamage : 0) +
        (encounter.lastPlayerAction === "double" ? run.player.stats.doubleWinDamage : 0);
      text = "Win hand.";
      resultTone = "win";
    } else if (outcome === "dealer_blackjack") {
      incoming = enemy.attack + 3;
      text = "Dealer blackjack.";
      resultTone = "special";
    } else if (outcome === "dealer_win") {
      incoming = enemy.attack + Math.max(1, Math.floor((dTotal - pTotal) * 0.4));
      text = "Lose hand.";
      resultTone = "loss";
    } else if (outcome === "player_bust") {
      incoming = Math.max(1, enemy.attack + 1 - run.player.stats.bustBlock);
      text = "Bust.";
      resultTone = "loss";
    }

    if (outgoing > 0 && Math.random() < run.player.stats.critChance) {
      outgoing *= 2;
      encounter.critTriggered = true;
      text = "CRIT!";
    }

    const playerLosingOutcome = outcome === "dealer_blackjack" || outcome === "dealer_win" || outcome === "player_bust";
    const enemyLosingOutcome = outcome === "blackjack" || outcome === "dealer_bust" || outcome === "player_win";

    if (playerLosingOutcome) {
      outgoing = 0;
    }
    if (enemyLosingOutcome) {
      incoming = 0;
    }

    if (incoming > 0) {
      incoming = Math.max(1, incoming - run.player.stats.block);
      if (encounter.lastPlayerAction === "double" && run.player.stats.doubleLossBlock > 0) {
        incoming = Math.max(1, incoming - run.player.stats.doubleLossBlock);
      }
    }

    playOutcomeSfx(outcome, outgoing, incoming);
    const useLegacyHandTackle = !isExternalModeRendering("playing");

    if (outgoing > 0) {
      const outgoingPayload = {
        target: "enemy",
        amount: outgoing,
        color: outcome === "blackjack" ? "#f8d37b" : "#ff916e",
        crit: encounter.critTriggered,
      };
      if (!(useLegacyHandTackle && triggerHandTackle("player", outgoing, outgoingPayload))) {
        applyImpactDamage(outgoingPayload);
        if (useLegacyHandTackle) {
          triggerImpactBurst("enemy", outgoing, outgoingPayload.color);
        }
      }
    }

    if (incoming > 0) {
      const incomingPayload = {
        target: "player",
        amount: incoming,
        color: "#ff86aa",
      };
      if (!(useLegacyHandTackle && triggerHandTackle("enemy", incoming, incomingPayload))) {
        applyImpactDamage(incomingPayload);
        if (useLegacyHandTackle) {
          triggerImpactBurst("player", incoming, incomingPayload.color);
        }
      }
    } else if (outgoing > 0) {
      run.player.streak += 1;
      run.maxStreak = Math.max(run.maxStreak || 0, run.player.streak);
      if (encounter.lastPlayerAction === "double") {
        run.doublesWon = nonNegInt(run.doublesWon, 0) + 1;
      }
      if (outcome === "blackjack" && run.player.stats.blackjackHeal > 0) {
        const blackjackHeal = Math.min(run.player.stats.blackjackHeal, run.player.maxHp - run.player.hp);
        if (blackjackHeal > 0) {
          run.player.hp += blackjackHeal;
          spawnFloatText(`+${blackjackHeal}`, WIDTH * 0.26, 514, "#8df0b2");
        }
      }
      if (run.player.stats.healOnWinHand > 0) {
        const heal = Math.min(run.player.stats.healOnWinHand, run.player.maxHp - run.player.hp);
        if (heal > 0) {
          run.player.hp += heal;
          spawnFloatText(`+${heal}`, WIDTH * 0.26, 540, "#8df0b2");
        }
      }
      if (run.player.stats.chipsOnWinHand > 0) {
        gainChips(run.player.stats.chipsOnWinHand);
        spawnFloatText(`+${run.player.stats.chipsOnWinHand}`, WIDTH * 0.5, 72, "#ffd687");
      }
    } else if (outcome === "push" && run.player.stats.chipsOnPush > 0) {
      run.pushes = nonNegInt(run.pushes, 0) + 1;
      gainChips(run.player.stats.chipsOnPush);
      spawnFloatText(`+${run.player.stats.chipsOnPush}`, WIDTH * 0.5, 72, "#ffd687");
      text = `Push +${run.player.stats.chipsOnPush} chips`;
    } else if (outcome === "push") {
      run.pushes = nonNegInt(run.pushes, 0) + 1;
    }

    if (encounter.critTriggered && outgoing > 0) {
      text = `CRIT -${outgoing} HP`;
      resultTone = "special";
    } else if (outgoing > 0) {
      text = `${text} -${outgoing} HP`;
      if (resultTone !== "special") {
        resultTone = "win";
      }
    } else if (incoming > 0) {
      text = `${text} -${incoming} HP`;
      resultTone = "loss";
    }

    if (encounter.bustGuardTriggered) {
      text = `${text} Guard!`;
    }

    if (encounter.critTriggered) {
      for (let i = 0; i < 6; i += 1) {
        const color = i % 2 === 0 ? "#ffd88d" : "#ff9a7d";
        const x = WIDTH * 0.64 + (Math.random() * 2 - 1) * 76;
        const y = 150 + (Math.random() * 2 - 1) * 48;
        spawnSparkBurst(x, y, color, 14 + i * 4, 230 + i * 18);
      }
      triggerFlash("#ffd88d", 0.14, 0.22);
      triggerScreenShake(9.6, 0.3);
    }
    if (outcome === "blackjack") {
      spawnSparkBurst(WIDTH * 0.5, 646, "#f8d37b", 28, 260);
      triggerScreenShake(8.5, 0.24);
    }

    encounter.resultText = text;
    encounter.resultTone = resultTone;
    state.announcement = "";
    state.announcementTimer = 0;
    state.announcementDuration = 0;
    addLog(text);
    run.totalHands += 1;
    encounter.resolvedHands = nonNegInt(encounter.resolvedHands, 0) + 1;
    updateProfileBest(run);
    finalizeResolveState();
  }

  function onEncounterWin() {
    if (!state.run || !state.encounter) {
      return;
    }

    const run = state.run;
    const encounter = state.encounter;
    const enemy = encounter.enemy;

    run.enemiesDefeated += 1;
    const payout = Math.round(enemy.goldDrop * run.player.stats.goldMultiplier) + Math.min(6, run.player.streak);
    gainChips(payout);
    spawnFloatText(`+${payout} chips`, WIDTH * 0.5, 72, "#ffd687");
    spawnSparkBurst(WIDTH * 0.5, 96, "#ffd687", 34, 280);
    triggerScreenShake(7, 0.2);
    triggerFlash("#ffd687", 0.09, 0.2);
    playUiSfx("coin");
    addLog(`${enemy.name} defeated. +${payout} chips.`);

    encounter.phase = "done";

    if (enemy.type === "boss") {
      if (run.floor >= run.maxFloor) {
        finalizeRun("victory");
        state.mode = "victory";
        setAnnouncement("The House collapses.", 2.8);
        return;
      }

      run.floor += 1;
      run.room = 1;
      const heal = 8;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + heal);
      state.rewardOptions = generateRewardOptions(3, true);
      state.mode = "shop";
      run.shopPurchaseMade = false;
      state.selectionIndex = 0;
      state.shopStock = generateCampRelicDraftStock(state.rewardOptions);
      if (!state.shopStock.length) {
        state.shopStock = generateShopStock(3);
      }
      setAnnouncement(`Floor cleared. Restored ${heal} HP. Camp opened.`, 2.4);
      saveRunSnapshot();
      return;
    }

    run.room += 1;

    if (run.room % 2 === 0) {
      state.mode = "shop";
      run.shopPurchaseMade = false;
      state.selectionIndex = 0;
      state.rewardOptions = generateRewardOptions(3, false);
      state.shopStock = generateCampRelicDraftStock(state.rewardOptions);
      if (!state.shopStock.length) {
        state.shopStock = generateShopStock(3);
      }
      setAnnouncement("Relics are available at camp.", 2);
    } else {
      state.mode = "shop";
      run.shopPurchaseMade = false;
      state.selectionIndex = 0;
      state.rewardOptions = [];
      state.shopStock = generateShopStock(3);
      setAnnouncement("Camp opened.", 2);
    }
    saveRunSnapshot();
  }

  function relicRarityWeights(source, floor) {
    const clampedFloor = Math.max(1, Math.min(3, nonNegInt(floor, 1)));
    if (source === "shop") {
      if (clampedFloor === 1) {
        return { common: 68, uncommon: 24, rare: 7, legendary: 1 };
      }
      if (clampedFloor === 2) {
        return { common: 46, uncommon: 34, rare: 17, legendary: 3 };
      }
      return { common: 29, uncommon: 35, rare: 28, legendary: 8 };
    }
    if (clampedFloor === 1) {
      return { common: 64, uncommon: 28, rare: 7, legendary: 1 };
    }
    if (clampedFloor === 2) {
      return { common: 40, uncommon: 37, rare: 19, legendary: 4 };
    }
    return { common: 24, uncommon: 35, rare: 29, legendary: 12 };
  }

  function sampleRarity(weights) {
    const total = Object.values(weights).reduce((acc, value) => acc + Math.max(0, Number(value) || 0), 0);
    if (total <= 0) {
      return "common";
    }
    let roll = Math.random() * total;
    for (const rarity of RELIC_RARITY_ORDER) {
      const weight = Math.max(0, Number(weights[rarity]) || 0);
      if (roll < weight) {
        return rarity;
      }
      roll -= weight;
    }
    return "common";
  }

  function unlockedRelicPool(profile = state.profile) {
    return RELICS.filter((relic) => isRelicUnlocked(relic, profile));
  }

  function sampleRelics(pool, count, source, floor) {
    const options = [];
    const available = [...pool];
    const weights = relicRarityWeights(source, floor);
    const owned = state.run?.player?.relics || {};
    const allowDuplicatesAt = source === "shop" ? 2 : 3;

    while (options.length < count && available.length > 0) {
      const targetRarity = sampleRarity(weights);
      const prioritizeFresh = options.length < allowDuplicatesAt;
      let candidates = available.filter((relic) => normalizeRelicRarity(relic.rarity) === targetRarity);
      if (prioritizeFresh) {
        const unowned = candidates.filter((relic) => nonNegInt(owned[relic.id], 0) === 0);
        if (unowned.length) {
          candidates = unowned;
        }
      }
      if (!candidates.length) {
        candidates = available;
        if (prioritizeFresh) {
          const unownedFallback = candidates.filter((relic) => nonNegInt(owned[relic.id], 0) === 0);
          if (unownedFallback.length) {
            candidates = unownedFallback;
          }
        }
      }
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      options.push(picked);
      const idx = available.findIndex((entry) => entry.id === picked.id);
      if (idx >= 0) {
        available.splice(idx, 1);
      }
    }
    return options;
  }

  function generateRewardOptions(count, includeBossRelic) {
    const options = [];
    const floor = state.run ? state.run.floor : 1;
    const pool = shuffle(unlockedRelicPool());

    if (includeBossRelic) {
      options.push(BOSS_RELIC);
    }
    const rolled = sampleRelics(pool, Math.max(0, count - options.length), "reward", floor);
    for (const relic of rolled) {
      if (options.some((entry) => entry.id === relic.id)) {
        continue;
      }
      options.push(relic);
      if (options.length >= count) {
        break;
      }
    }

    return options;
  }

  function generateCampRelicDraftStock(rewardOptions) {
    const floorScale = state.run ? state.run.floor * 2 : 0;
    if (!Array.isArray(rewardOptions)) {
      return [];
    }
    return rewardOptions
      .filter(Boolean)
      .map((relic) => ({
        type: "relic",
        relic,
        cost: nonNegInt(relic.shopCost, 0) + floorScale + relicRarityMeta(relic).shopMarkup,
        sold: false,
      }));
  }

  function generateShopStock(count) {
    const floorScale = state.run ? state.run.floor * 2 : 0;
    const floor = state.run ? state.run.floor : 1;
    const relicPool = shuffle(unlockedRelicPool());
    const relics = sampleRelics(relicPool, Math.max(1, count - 1), "shop", floor);

    const stock = relics.map((relic) => ({
      type: "relic",
      relic,
      cost: relic.shopCost + floorScale + relicRarityMeta(relic).shopMarkup,
      sold: false,
    }));

    stock.push({
      type: "heal",
      id: "patch-kit",
      name: "Patch Kit",
      description: "Restore 10 HP.",
      cost: 10 + floorScale,
      sold: false,
    });

    return shuffle(stock).slice(0, count);
  }

  function applyRelic(relic) {
    if (!state.run) {
      return;
    }

    const run = state.run;
    run.player.relics[relic.id] = (run.player.relics[relic.id] || 0) + 1;
    relic.apply(run);
    run.player.stats.critChance = Math.min(0.6, run.player.stats.critChance);
    run.player.stats.flatDamage = Math.min(14, run.player.stats.flatDamage);
    run.player.stats.block = Math.min(10, run.player.stats.block);
    run.player.stats.goldMultiplier = Math.max(0.5, Math.min(2.35, run.player.stats.goldMultiplier));
    run.player.hp = Math.min(run.player.maxHp, run.player.hp);

    if (state.profile) {
      state.profile.relicCollection[relic.id] = nonNegInt(state.profile.relicCollection[relic.id], 0) + 1;
      state.profile.totals.relicsCollected += 1;
      saveProfile();
    }
  }

  function claimReward() {
    if (state.mode !== "reward" || state.rewardOptions.length === 0 || !state.run) {
      return;
    }

    state.mode = nextModeAfterRewardClaim({
      floor: state.run.floor,
      maxFloor: state.run.maxFloor,
      room: state.run.room,
      roomsPerFloor: state.run.roomsPerFloor,
    });
    state.run.shopPurchaseMade = false;
    state.selectionIndex = 0;
    state.shopStock = generateCampRelicDraftStock(state.rewardOptions);
    if (!state.shopStock.length) {
      state.shopStock = generateShopStock(3);
    }
    playUiSfx("confirm");
    setAnnouncement("Relics moved to camp. Spend chips to buy one.", 2);
    saveRunSnapshot();
  }

  function buyShopItem(index = state.selectionIndex) {
    if (state.mode !== "shop" || !state.run || state.shopStock.length === 0) {
      return;
    }

    const run = state.run;
    const targetIndex = clampNumber(index, 0, state.shopStock.length - 1, state.selectionIndex);
    state.selectionIndex = targetIndex;
    const item = state.shopStock[targetIndex];
    if (run.shopPurchaseMade) {
      playUiSfx("error");
      setAnnouncement("Only one purchase per camp.", 1.35);
      addLog("Camp allows one purchase only.");
      return;
    }
    if (!item || item.sold) {
      playUiSfx("error");
      return;
    }

    if (item.type === "relic" && state.shopStock.some((entry) => entry.type === "relic" && entry.sold)) {
      playUiSfx("error");
      addLog("Only one relic can be bought per camp.");
      setAnnouncement("Only one relic per camp visit.", 1.2);
      return;
    }

    if (run.player.gold < item.cost) {
      playUiSfx("error");
      addLog("Not enough chips.");
      setAnnouncement("Need more chips.", 1.2);
      saveRunSnapshot();
      return;
    }

    playUiSfx("coin");
    gainChips(-item.cost);
    spawnFloatText(`-${item.cost}`, WIDTH * 0.5, 646, "#ffd28a");

    if (item.type === "relic") {
      applyRelic(item.relic);
      addLog(`Bought ${item.relic.name}.`);
      addLog(passiveDescription(item.relic.description));
    } else {
      const heal = Math.min(10, run.player.maxHp - run.player.hp);
      run.player.hp += heal;
      addLog(`Patch Kit restores ${heal} HP.`);
      if (heal > 0) {
        spawnFloatText(`+${heal}`, WIDTH * 0.27, 541, "#8df0b2");
      }
    }

    item.sold = true;
    run.shopPurchaseMade = true;
    saveRunSnapshot();
  }

  function leaveShop() {
    if (state.mode !== "shop") {
      return;
    }
    const nextMode = nextModeAfterShopContinue();
    if (nextMode !== "playing") {
      return;
    }
    playUiSfx("confirm");
    addLog("Left camp.");
    beginEncounter();
  }

  function shopItemName(item) {
    if (!item || typeof item !== "object") {
      return "Unknown Item";
    }
    if (item.type === "relic") {
      return item.relic?.name || "Unknown Relic";
    }
    return item.name || "Patch Kit";
  }

  function shopItemDescription(item) {
    if (!item || typeof item !== "object") {
      return "";
    }
    if (item.type === "relic") {
      return passiveDescription(item.relic?.description || "");
    }
    return item.description || "";
  }

  function moveSelection(delta, length) {
    if (!length) {
      return;
    }
    if (delta !== 0) {
      playUiSfx("select");
    }
    state.selectionIndex = (state.selectionIndex + delta + length) % length;
  }

  function hasSavedRun() {
    return Boolean(state.savedRunSnapshot && state.savedRunSnapshot.run);
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
    playUiSfx("confirm");
    state.mode = "collection";
    state.collectionPage = Math.max(0, nonNegInt(page, 0));
  }

  function update(dt) {
    state.worldTime += dt;
    updateMusic(dt);

    for (const orb of AMBIENT_ORBS) {
      orb.y += orb.speed * dt;
      if (orb.y > HEIGHT + 12) {
        orb.y = -12;
        orb.x = Math.random() * WIDTH;
      }
    }

    if (state.mode === "menu") {
      for (const mote of MENU_MOTES) {
        const speedScale = mote.speedScale || 1;
        const turbulence = Math.sin(state.worldTime * (1.6 + mote.swirl) + mote.phase) * (18 * mote.drift * speedScale);
        const flutter = Math.cos(state.worldTime * (2.3 + mote.swirl * 0.7) + mote.phase * 0.7) * (8 * mote.drift * speedScale);
        mote.x += (mote.vx * speedScale + turbulence) * dt;
        mote.y += (mote.vy * speedScale + flutter) * dt;
        if (mote.x < -48) {
          mote.x = WIDTH + 48;
        } else if (mote.x > WIDTH + 48) {
          mote.x = -48;
        }
        if (mote.y < -48) {
          mote.y = HEIGHT + 48;
        } else if (mote.y > HEIGHT + 48) {
          mote.y = -48;
        }
      }

      if (Math.random() < dt * 1.8) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const life = 1.2 + Math.random() * 1.25;
        state.menuSparks.push({
          x: dir > 0 ? -24 : WIDTH + 24,
          y: HEIGHT * (0.54 + Math.random() * 0.42),
          vx: dir * (68 + Math.random() * 126),
          vy: -38 - Math.random() * 42,
          life,
          maxLife: life,
          size: 0.9 + Math.random() * 1.35,
        });
      }
    } else {
      state.menuSparks = [];
    }

    state.floatingTexts = state.floatingTexts.filter((f) => {
      f.life -= dt;
      f.y -= f.vy * dt;
      return f.life > 0;
    });

    state.cardBursts = state.cardBursts.filter((burst) => {
      burst.life -= dt;
      return burst.life > 0;
    });

    state.sparkParticles = state.sparkParticles.filter((spark) => {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= Math.max(0, 1 - dt * 3.5);
      spark.vy += 180 * dt;
      return spark.life > 0;
    });

    state.handTackles = state.handTackles.filter((tackle) => {
      tackle.elapsed += dt;
      const progress = Math.max(0, Math.min(1, tackle.elapsed / Math.max(0.01, tackle.duration)));
      const travel = Math.max(0, Math.min(1, progress / Math.max(0.01, tackle.impactAt)));
      const eased = easeOutCubic(travel);
      const currentX = lerp(tackle.fromX, tackle.toX, eased);
      const currentY = lerp(tackle.fromY, tackle.toY, eased) - Math.sin(travel * Math.PI) * 42 * (1 - travel * 0.35);
      if (!tackle.impacted && progress >= tackle.impactAt) {
        tackle.impacted = true;
        triggerImpactBurstAt(tackle.toX, tackle.toY, tackle.amount + 2, tackle.color);
        playGruntSfx();
        if (tackle.impactPayload) {
          applyImpactDamage(tackle.impactPayload);
        }
      } else if (!tackle.impacted && Math.random() < dt * 24) {
        spawnSparkBurst(currentX, currentY, tackle.color, 2, 68);
      }
      return progress < 1;
    });

    state.menuSparks = state.menuSparks.filter((spark) => {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= Math.max(0, 1 - dt * 0.85);
      spark.vy -= 7 * dt;
      return spark.life > 0;
    });

    state.flashOverlays = state.flashOverlays.filter((flash) => {
      flash.life -= dt;
      return flash.life > 0;
    });

    if (state.screenShakeTime > 0) {
      state.screenShakeTime = Math.max(0, state.screenShakeTime - dt);
    }
    if (state.screenShakePower > 0) {
      state.screenShakePower = Math.max(0, state.screenShakePower - dt * 30);
    }
    if (state.screenShakeTime <= 0) {
      state.screenShakeDuration = 0;
    }

    if (state.announcementTimer > 0) {
      state.announcementTimer = Math.max(0, state.announcementTimer - dt);
      if (state.announcementTimer <= 0) {
        state.announcement = "";
        state.announcementDuration = 0;
      }
    }

    if (state.mode === "playing" && state.encounter) {
      updateEncounterIntroTyping(state.encounter, dt);
    }

    if (state.run) {
      state.run.log = state.run.log.filter((entry) => {
        entry.ttl -= dt;
        return entry.ttl > 0;
      });

      if (state.mode === "playing" || state.mode === "reward" || state.mode === "shop") {
        state.autosaveTimer += dt;
        if (state.autosaveTimer >= 0.75) {
          state.autosaveTimer = 0;
          saveRunSnapshot();
        }
      }
    }

    if (state.pendingTransition) {
      if (!state.pendingTransition.waiting) {
        state.pendingTransition.timer -= dt;
      }
      if (!state.pendingTransition.waiting && state.pendingTransition.timer <= 0) {
        const transition = state.pendingTransition;
        state.pendingTransition = null;
        if (transition.target === "enemy") {
          onEncounterWin();
        } else if (transition.target === "player" && state.encounter && state.run) {
          finalizeRun("defeat");
          state.mode = "gameover";
          state.encounter.phase = "done";
        }
      }
    }

    if (state.passiveTooltipTimer > 0) {
      state.passiveTooltipTimer = Math.max(0, state.passiveTooltipTimer - dt);
      if (state.passiveTooltipTimer <= 0) {
        hidePassiveTooltip();
      }
    }

    if (state.mode === "playing" && state.encounter && state.encounter.phase === "resolve" && !state.pendingTransition) {
      if (state.encounter.resolveTimer > 0) {
        state.encounter.resolveTimer = Math.max(0, state.encounter.resolveTimer - dt);
      }
      if (state.encounter.resolveTimer <= 0 && state.handTackles.length === 0 && !state.encounter.nextDealPrompted) {
        state.encounter.nextDealPrompted = true;
      }
    }
  }

  function render() {
    // Phaser scenes are the renderer of record.
  }

  function availableActions() {
    if (state.mode === "menu") {
      return hasSavedRun()
        ? ["enter(start)", "r(resume)", "a(collections)"]
        : ["enter(start)", "a(collections)"];
    }
    if (state.mode === "collection") {
      return ["enter(back)", "space(back)", "a(back)"];
    }
    if (state.mode === "playing") {
      if (isEncounterIntroActive()) {
        return state.encounter?.intro?.ready
          ? ["enter(let's-go)", "space(let's-go)", "tap(let's-go)"]
          : ["wait(dialogue)"];
      }
      if (canAdvanceDeal()) {
        return ["enter(deal)", "tap(deal)"];
      }
      if (!canPlayerAct()) {
        return ["observe(result)"];
      }
      const canDouble = canDoubleDown({
        canAct: canPlayerAct(),
        encounter: state.encounter,
      });
      const canSplit = canSplitCurrentHand();
      const actions = ["z(hit)", "x(stand)"];
      if (canSplit) {
        actions.push("s(split)");
      }
      if (canDouble) {
        actions.push("c(double)");
      }
      return actions;
    }
    if (state.mode === "reward") {
      return ["left(prev)", "right(next)", "enter(claim)", "space(claim)"];
    }
    if (state.mode === "shop") {
      return ["left(prev)", "right(next)", "space(buy)", "enter(continue)"];
    }
    if (state.mode === "gameover" || state.mode === "victory") {
      return ["enter(restart)"];
    }
    return [];
  }

  function renderGameToText() {
    const run = state.run;
    const encounter = state.encounter;

    const payload = {
      coordSystem: "origin=(0,0) top-left on 1280x720 canvas, +x right, +y down",
      mode: state.mode,
      actions: availableActions(),
      run: run
        ? {
            floor: run.floor,
            room: run.room,
            maxFloor: run.maxFloor,
            roomsPerFloor: run.roomsPerFloor,
            playerHp: run.player.hp,
            playerMaxHp: run.player.maxHp,
            gold: run.player.gold,
            streak: run.player.streak,
            bustGuards: run.player.bustGuardsLeft,
            relics: run.player.relics,
            passiveSummary: passiveSummary(run),
          }
        : null,
      encounter: encounter
        ? {
            enemy: {
              name: encounter.enemy.name,
              type: encounter.enemy.type,
              hp: encounter.enemy.hp,
              maxHp: encounter.enemy.maxHp,
              attack: encounter.enemy.attack,
            },
            phase: encounter.phase,
            handIndex: encounter.handIndex,
            playerHand: encounter.playerHand.map(cardToText),
            dealerHand: encounter.dealerHand.map((card, idx) => {
              if (state.mode === "playing" && encounter.phase === "player" && encounter.hideDealerHole && idx === 1) {
                return "??";
              }
              return cardToText(card);
            }),
            playerTotal: encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total,
            dealerVisibleTotal: visibleDealerTotal(encounter),
            resultText: encounter.resultText,
            resultTone: encounter.resultTone || "neutral",
            nextDealReady: canAdvanceDeal(),
            doubleDown: encounter.doubleDown,
            splitQueueHands: Array.isArray(encounter.splitQueue) ? encounter.splitQueue.length : 0,
            splitUsed: Boolean(encounter.splitUsed),
            splitHandsTotal: Math.max(1, nonNegInt(encounter.splitHandsTotal, 1)),
            splitHandsResolved: Math.max(0, nonNegInt(encounter.splitHandsResolved, 0)),
            dealerResolved: Boolean(encounter.dealerResolved),
            introActive: Boolean(encounter.intro?.active),
            introReady: Boolean(encounter.intro?.ready),
            introText: encounter.intro?.dialogue || "",
          }
        : null,
      rewards:
        state.mode === "reward"
          ? state.rewardOptions.map((relic, idx) => ({
              index: idx,
              name: relic.name,
              selected: idx === state.selectionIndex,
            }))
          : [],
      shop:
        state.mode === "shop"
          ? state.shopStock.map((item, idx) => ({
              index: idx,
              name: shopItemName(item),
              cost: item.cost,
              sold: !!item.sold,
              selected: idx === state.selectionIndex,
            }))
          : [],
      collection:
        state.mode === "collection"
          ? (() => {
              const entries = collectionEntries();
              return {
                totalRelics: entries.length,
                unlockedRelics: entries.filter((entry) => entry.unlocked).length,
                discoveredRelics: entries.filter((entry) => entry.copies > 0).length,
              };
            })()
          : null,
      banner: state.announcement,
      hasSavedRun: hasSavedRun(),
      mobileControls: false,
      audio: {
        enabled: state.audio.enabled,
        started: state.audio.started,
        contextState: state.audio.context ? state.audio.context.state : "none",
      },
      profile: state.profile
        ? {
            runsStarted: state.profile.totals.runsStarted,
            runsWon: state.profile.totals.runsWon,
            enemiesDefeated: state.profile.totals.enemiesDefeated,
            relicsCollected: state.profile.totals.relicsCollected,
          }
        : null,
    };

    return JSON.stringify(payload);
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
      methods: MENU_API_METHODS,
      label: "menu",
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
    if (state.mode !== "playing" || !state.run || !state.encounter) {
      return null;
    }
    const run = state.run;
    const encounter = state.encounter;
    const introActive = isEncounterIntroActive(encounter);
    const intro = encounter.intro || null;
    const introDialogue = typeof intro?.dialogue === "string" ? intro.dialogue : "";
    const visibleChars = Math.max(
      0,
      Math.min(
        introDialogue.length,
        Number.isFinite(intro?.visibleChars) ? Math.floor(intro.visibleChars) : introDialogue.length
      )
    );
    const canAct = canPlayerAct();
    const canDouble = canDoubleDown({
      canAct,
      encounter,
    });
    const logs = getRunEventLog(run).slice(-120);
    const passives = passiveStacksForRun(run).map((entry) => {
      const rarity = relicRarityMeta(entry.relic);
      return {
        id: entry.relic.id,
        name: entry.relic.name,
        description: passiveDescription(entry.relic.description),
        count: entry.count,
        thumbUrl: passiveThumbUrl(entry.relic),
        rarityLabel: rarity.label,
      };
    });
    const transition = buildTransitionSnapshot(state.pendingTransition);

    return {
      mode: state.mode,
      run: {
        floor: run.floor,
        room: run.room,
        roomsPerFloor: run.roomsPerFloor,
        chips: run.player?.gold || 0,
        streak: run.player?.streak || 0,
        bustGuardsLeft: run.player?.bustGuardsLeft || 0,
      },
      player: {
        hp: run.player?.hp || 0,
        maxHp: run.player?.maxHp || 1,
      },
      enemy: {
        name: encounter.enemy?.name || "Enemy",
        hp: encounter.enemy?.hp || 0,
        maxHp: encounter.enemy?.maxHp || 1,
        color: encounter.enemy?.color || "#a3be8d",
        type: encounter.enemy?.type || "normal",
        avatarKey: encounter.enemy?.avatarKey || "",
      },
      handIndex: Math.max(1, Number(encounter.handIndex) || 1),
      phase: encounter.phase,
      cards: {
        player: encounter.playerHand.map((card) => ({
          rank: card.rank,
          suit: card.suit,
          hidden: false,
          dealtAt: Number.isFinite(card.dealtAt) ? Math.floor(card.dealtAt) : 0,
        })),
        dealer: encounter.dealerHand.map((card, index) => ({
          rank: card.rank,
          suit: card.suit,
          hidden: Boolean(encounter.hideDealerHole && index === 1),
          dealtAt: Number.isFinite(card.dealtAt) ? Math.floor(card.dealtAt) : 0,
        })),
      },
      totals: {
        player: encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total,
        dealer:
          encounter.hideDealerHole && encounter.phase === "player"
            ? visibleDealerTotal(encounter)
            : handTotal(encounter.dealerHand).total,
      },
      resultText: encounter.resultText || "",
      resultTone: encounter.resultTone || "neutral",
      announcement: state.announcement || "",
      transition,
      intro: {
        active: introActive,
        ready: Boolean(intro?.ready),
        text: introDialogue.slice(0, visibleChars),
        fullText: introDialogue,
      },
      logs,
      passives,
      status: {
        canAct,
        canHit: canAct,
        canStand: canAct,
        canSplit: canSplitCurrentHand(),
        canDouble,
        canDeal: canAdvanceDeal(),
      },
    };
  }

  function registerPhaserRunApi() {
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
      methods: RUN_API_METHODS,
      label: "run",
      assertApiContract,
    });
  }

  function buildPhaserRewardSnapshot() {
    if (state.mode !== "reward") {
      return null;
    }
    const run = state.run || null;
    const options = state.rewardOptions.map((relic, index) => {
      const rarity = relicRarityMeta(relic);
      return {
        id: relic.id,
        name: relic.name,
        description: passiveDescription(relic.description),
        rarity: normalizeRelicRarity(relic.rarity),
        rarityLabel: rarity.label,
        color: relic.color || rarity.glow || "#c8d7a1",
        thumbUrl: passiveThumbUrl(relic),
        selected: index === state.selectionIndex,
      };
    });

    return {
      mode: state.mode,
      run: {
        floor: run?.floor || 1,
        room: run?.room || 1,
        roomsPerFloor: run?.roomsPerFloor || 5,
        chips: run?.player?.gold || 0,
      },
      options,
      selectionIndex: state.selectionIndex,
      canClaim: options.length > 0,
      logs: getRunEventLog(run).slice(-120),
    };
  }

  function registerPhaserRewardApi() {
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
      methods: REWARD_API_METHODS,
      label: "reward",
      assertApiContract,
    });
  }

  function buildPhaserShopSnapshot() {
    if (state.mode !== "shop") {
      return null;
    }
    const run = state.run || null;
    const purchaseLocked = Boolean(run?.shopPurchaseMade);
    const items = state.shopStock.map((item, index) => {
      const idBase = item.type === "relic" ? item.relic?.id || "relic" : item.id || "service";
      const affordable = Boolean(run && run.player && run.player.gold >= item.cost);
      const sold = Boolean(item.sold);
      return {
        id: `${idBase}-${index}`,
        name: shopItemName(item),
        description: shopItemDescription(item),
        type: item.type === "relic" ? "RELIC" : "SERVICE",
        cost: nonNegInt(item.cost, 0),
        sold,
        selected: index === state.selectionIndex,
        canBuy: !purchaseLocked && !sold && affordable,
      };
    });

    let canBuySelected = false;
    if (run && state.shopStock.length > 0) {
      const selectedIndex = clampNumber(state.selectionIndex, 0, state.shopStock.length - 1, 0);
      const selectedItem = state.shopStock[selectedIndex];
      canBuySelected = Boolean(
        selectedItem &&
          !selectedItem.sold &&
          !purchaseLocked &&
          Number(run.player?.gold || 0) >= Number(selectedItem.cost || 0)
      );
    }

    return {
      mode: state.mode,
      run: {
        floor: run?.floor || 1,
        room: run?.room || 1,
        roomsPerFloor: run?.roomsPerFloor || 5,
        chips: run?.player?.gold || 0,
        streak: run?.player?.streak || 0,
        bustGuardsLeft: run?.player?.bustGuardsLeft || 0,
        hp: run?.player?.hp || 0,
        maxHp: run?.player?.maxHp || 1,
        shopPurchaseMade: purchaseLocked,
      },
      items,
      selectionIndex: state.selectionIndex,
      canBuySelected,
      canContinue: true,
      logs: getRunEventLog(run).slice(-120),
    };
  }

  function registerPhaserShopApi() {
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
      methods: SHOP_API_METHODS,
      label: "shop",
      assertApiContract,
    });
  }

  function buildPhaserOverlaySnapshot() {
    if (state.mode === "collection") {
      const entries = collectionEntries();
      const mappedEntries = entries.map((entry) => {
        const rarityMeta = RELIC_RARITY_META[entry.rarity] || RELIC_RARITY_META.common;
        return {
          id: entry.relic.id,
          thumbUrl: entry.unlocked ? passiveThumbUrl(entry.relic) : "",
          rarityLabel: entry.rarityLabel,
          rarityColor: rarityMeta.glow,
          name: entry.unlocked ? entry.relic.name : "LOCKED",
          description: entry.unlocked ? passiveDescription(entry.relic.description) : entry.unlockText,
          unlocked: entry.unlocked,
          copies: entry.copies,
        };
      });

      const unlockedCount = entries.filter((entry) => entry.unlocked).length;
      const foundCount = entries.filter((entry) => entry.copies > 0).length;
      const totalCopies = entries.reduce((acc, entry) => acc + entry.copies, 0);

      return {
        mode: state.mode,
        summary: `Unlocked ${unlockedCount}/${entries.length}  •  Found ${foundCount}/${entries.length}  •  Copies ${totalCopies}`,
        entries: mappedEntries,
      };
    }

    if (state.mode === "gameover" || state.mode === "victory") {
      const title = state.mode === "gameover" ? "RUN LOST" : "HOUSE BROKEN";
      const subtitle =
        state.mode === "gameover"
          ? "The House keeps your soul this time."
          : "You shattered the final dealer.";
      const prompt =
        state.mode === "gameover"
          ? "Press Enter to run it back."
          : "Press Enter for another run.";

      const run = state.run || null;
      const stats = run
        ? [
            `Floor reached: ${run.floor}/${run.maxFloor}`,
            `Enemies defeated: ${run.enemiesDefeated}`,
            `Hands played: ${run.totalHands}`,
            `Total damage dealt: ${run.player?.totalDamageDealt || 0}`,
            `Total damage taken: ${run.player?.totalDamageTaken || 0}`,
            `Chips banked: ${run.player?.gold || 0}`,
          ]
        : [];

      return {
        mode: state.mode,
        title,
        subtitle,
        prompt,
        stats,
        canRestart: true,
      };
    }

    return null;
  }

  function registerPhaserOverlayApi() {
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
      methods: OVERLAY_API_METHODS,
      label: "overlay",
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
