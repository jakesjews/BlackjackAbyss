(() => {
  "use strict";

  const gameShell = document.getElementById("game-shell");
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const mobileControls = document.getElementById("mobile-controls");
  const mobileButtons = mobileControls
    ? {
        left: mobileControls.querySelector('[data-mobile-action="left"]'),
        hit: mobileControls.querySelector('[data-mobile-action="hit"]'),
        stand: mobileControls.querySelector('[data-mobile-action="stand"]'),
        double: mobileControls.querySelector('[data-mobile-action="double"]'),
        right: mobileControls.querySelector('[data-mobile-action="right"]'),
        confirm: mobileControls.querySelector('[data-mobile-action="confirm"]'),
      }
    : null;
  if (!gameShell || !canvas || !ctx) {
    throw new Error("Unable to initialize canvas rendering context.");
  }

  const WIDTH = 1280;
  const HEIGHT = 720;
  const CARD_W = 88;
  const CARD_H = 124;
  const FONT_UI = '"Sora", "Segoe UI", sans-serif';
  const FONT_DISPLAY = '"Chakra Petch", "Sora", sans-serif';
  const SUITS = ["S", "H", "D", "C"];
  const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const AMBIENT_ORBS = Array.from({ length: 44 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    radius: 1.2 + Math.random() * 4.6,
    speed: 3 + Math.random() * 12,
    alpha: 0.05 + Math.random() * 0.11,
  }));
  const MENU_ART_SOURCES = ["/images/splash_art.png", "public/images/splash_art.png"];
  const menuArtImage = new window.Image();
  menuArtImage.decoding = "async";
  let menuArtSourceIndex = 0;
  menuArtImage.addEventListener("error", () => {
    if (menuArtSourceIndex >= MENU_ART_SOURCES.length - 1) {
      return;
    }
    menuArtSourceIndex += 1;
    menuArtImage.src = MENU_ART_SOURCES[menuArtSourceIndex];
  });
  menuArtImage.src = MENU_ART_SOURCES[menuArtSourceIndex];
  const STORAGE_KEYS = {
    profile: "blackjack-abyss.profile.v1",
    run: "blackjack-abyss.run.v1",
    audioEnabled: "blackjack-abyss.audio-enabled.v1",
  };
  const MAX_RUN_HISTORY = 24;
  const MUSIC_STEP_SECONDS = 0.235;
  const MUSIC_CHORDS = [
    [0, 3, 7],
    [2, 5, 9],
    [3, 7, 10],
    [5, 8, 12],
  ];

  function defaultPlayerStats() {
    return {
      flatDamage: 0,
      block: 0,
      lowHpDamage: 0,
      critChance: 0,
      goldMultiplier: 1,
      healOnWinHand: 0,
      bustGuardPerEncounter: 1,
      luckyStart: 0,
      blackjackBonusDamage: 0,
      dealerBustBonusDamage: 0,
      standWinDamage: 0,
      doubleWinDamage: 0,
      firstHandDamage: 0,
      bustBlock: 0,
      chipsOnWinHand: 0,
      chipsOnPush: 0,
      healOnEncounterStart: 0,
    };
  }

  function createProfile() {
    return {
      version: 1,
      totals: {
        runsStarted: 0,
        runsCompleted: 0,
        runsWon: 0,
        runsLost: 0,
        enemiesDefeated: 0,
        handsPlayed: 0,
        damageDealt: 0,
        damageTaken: 0,
        chipsEarned: 0,
        chipsSpent: 0,
        relicsCollected: 0,
        bestFloor: 1,
        bestRoom: 1,
        longestStreak: 0,
      },
      relicCollection: {},
      runs: [],
    };
  }

  function safeGetStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures and continue gameplay.
    }
  }

  function safeRemoveStorage(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures and continue gameplay.
    }
  }

  function loadAudioEnabled() {
    const raw = safeGetStorage(STORAGE_KEYS.audioEnabled);
    if (raw === "0" || raw === "false") {
      return false;
    }
    if (raw === "1" || raw === "true") {
      return true;
    }
    return true;
  }

  function saveAudioEnabled(enabled) {
    safeSetStorage(STORAGE_KEYS.audioEnabled, enabled ? "1" : "0");
  }

  const RELICS = [
    {
      id: "razor-chip",
      name: "Razor Chip",
      description: "+2 outgoing damage each hand.",
      color: "#f07464",
      shopCost: 16,
      apply: (run) => {
        run.player.stats.flatDamage += 2;
      },
    },
    {
      id: "steel-shell",
      name: "Steel Shell",
      description: "Reduce incoming damage by 2.",
      color: "#7fb6ff",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.block += 2;
      },
    },
    {
      id: "blood-prism",
      name: "Blood Prism",
      description: "+3 damage while under 50% HP.",
      color: "#f05a76",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.lowHpDamage += 3;
      },
    },
    {
      id: "loaded-die",
      name: "Loaded Die",
      description: "+12% crit chance for outgoing damage.",
      color: "#f5ca67",
      shopCost: 22,
      apply: (run) => {
        run.player.stats.critChance += 0.12;
      },
    },
    {
      id: "insurance-sigil",
      name: "Insurance Sigil",
      description: "Gain +2 bust guards each encounter.",
      color: "#71e2ca",
      shopCost: 24,
      apply: (run) => {
        run.player.stats.bustGuardPerEncounter += 2;
      },
    },
    {
      id: "lucky-opener",
      name: "Lucky Opener",
      description: "Your first two cards trend to 8 or higher.",
      color: "#8ddf7d",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.luckyStart += 2;
      },
    },
    {
      id: "velvet-wallet",
      name: "Velvet Wallet",
      description: "+35% chips from enemy payouts.",
      color: "#f2a85d",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.goldMultiplier += 0.35;
      },
    },
    {
      id: "soul-leech",
      name: "Soul Leech",
      description: "Heal 2 HP when winning a hand.",
      color: "#bf8cff",
      shopCost: 24,
      apply: (run) => {
        run.player.stats.healOnWinHand += 2;
      },
    },
    {
      id: "vitality-coil",
      name: "Vitality Coil",
      description: "+8 max HP and heal 8.",
      color: "#55ddb6",
      shopCost: 26,
      apply: (run) => {
        run.player.maxHp += 8;
        run.player.hp = Math.min(run.player.maxHp, run.player.hp + 8);
      },
    },
    {
      id: "dealer-tell",
      name: "Dealer Tell",
      description: "+2 damage when you Stand and win.",
      color: "#84b7ff",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.standWinDamage += 2;
      },
    },
    {
      id: "all-in-marker",
      name: "All-In Marker",
      description: "+2 damage on successful Double Down hands.",
      color: "#ffb470",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.doubleWinDamage += 2;
      },
    },
    {
      id: "counterweight",
      name: "Counterweight",
      description: "Busting takes 2 less damage.",
      color: "#8eb2d3",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.bustBlock += 2;
      },
    },
    {
      id: "first-spark",
      name: "First Spark",
      description: "+2 damage on the first hand of each encounter.",
      color: "#ffd167",
      shopCost: 16,
      apply: (run) => {
        run.player.stats.firstHandDamage += 2;
      },
    },
    {
      id: "coin-magnet",
      name: "Coin Magnet",
      description: "Gain +2 chips whenever you win a hand.",
      color: "#f6c66b",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.chipsOnWinHand += 2;
      },
    },
    {
      id: "push-protocol",
      name: "Push Protocol",
      description: "Pushes grant +3 chips.",
      color: "#9ec6dd",
      shopCost: 14,
      apply: (run) => {
        run.player.stats.chipsOnPush += 3;
      },
    },
    {
      id: "life-thread",
      name: "Life Thread",
      description: "Heal 2 HP at the start of each encounter.",
      color: "#79e5b5",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.healOnEncounterStart += 2;
      },
    },
    {
      id: "ace-sleeve",
      name: "Ace Sleeve",
      description: "+1 Lucky Opener card and +4% crit chance.",
      color: "#bce58b",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.luckyStart += 1;
        run.player.stats.critChance += 0.04;
      },
    },
    {
      id: "dealer-tax-stamp",
      name: "Dealer Tax Stamp",
      description: "Dealer busts take +4 extra damage.",
      color: "#ff8d72",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.dealerBustBonusDamage += 4;
      },
    },
    {
      id: "royal-wedge",
      name: "Royal Wedge",
      description: "Blackjacks deal +4 extra damage.",
      color: "#ffd995",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.blackjackBonusDamage += 4;
      },
    },
    {
      id: "safety-net",
      name: "Safety Net",
      description: "+1 bust guard each encounter and +1 block.",
      color: "#7fd7d7",
      shopCost: 24,
      apply: (run) => {
        run.player.stats.bustGuardPerEncounter += 1;
        run.player.stats.block += 1;
      },
    },
    {
      id: "pocket-anvil",
      name: "Pocket Anvil",
      description: "+5 max HP, heal 5, and +1 damage.",
      color: "#9ab2c5",
      shopCost: 26,
      apply: (run) => {
        run.player.maxHp += 5;
        run.player.hp = Math.min(run.player.maxHp, run.player.hp + 5);
        run.player.stats.flatDamage += 1;
      },
    },
  ];

  const BOSS_RELIC = {
    id: "crown-of-odds",
    name: "Crown of Odds",
    description: "+3 damage, +2 block, +15% crit chance.",
    color: "#ffe082",
    shopCost: 99,
    apply: (run) => {
      run.player.stats.flatDamage += 3;
      run.player.stats.block += 2;
      run.player.stats.critChance += 0.15;
    },
  };

  const RELIC_BY_ID = new Map([...RELICS, BOSS_RELIC].map((r) => [r.id, r]));

  const ENEMY_NAMES = {
    normal: [
      "Pit Croupier",
      "Tin Dealer",
      "Shiv Shark",
      "Brick Smiler",
      "Card Warden",
      "Ash Gambler",
    ],
    elite: ["Velvet Reaper", "Latch Queen", "Bone Accountant", "Stack Baron"],
    boss: ["The House", "Abyss Banker", "Null Dealer"],
  };

  const state = {
    mode: "menu",
    run: null,
    profile: null,
    savedRunSnapshot: null,
    mobileActive: false,
    compactControls: false,
    mobilePortrait: false,
    autosaveTimer: 0,
    encounter: null,
    rewardOptions: [],
    shopStock: [],
    selectionIndex: 0,
    floatingTexts: [],
    cardBursts: [],
    sparkParticles: [],
    flashOverlays: [],
    screenShakeTime: 0,
    screenShakeDuration: 0,
    screenShakePower: 0,
    announcement: "",
    announcementTimer: 0,
    announcementDuration: 0,
    audio: {
      enabled: loadAudioEnabled(),
      started: false,
      primed: false,
      context: null,
      masterGain: null,
      musicGain: null,
      sfxGain: null,
      stepTimer: MUSIC_STEP_SECONDS,
      stepIndex: 0,
      lastMusicMode: "menu",
    },
    rewardUi: null,
    rewardTouch: null,
    rewardDragOffset: 0,
    shopUi: null,
    shopTouch: null,
    shopDragOffset: 0,
    worldTime: 0,
    viewport: {
      width: WIDTH,
      height: HEIGHT,
      scale: 1,
      cropWorldX: 0,
      portraitZoomed: false,
    },
  };

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
    if (!cardLike || typeof cardLike !== "object") {
      return null;
    }
    if (!RANKS.includes(cardLike.rank) || !SUITS.includes(cardLike.suit)) {
      return null;
    }
    return { rank: cardLike.rank, suit: cardLike.suit };
  }

  function sanitizeCardList(listLike) {
    if (!Array.isArray(listLike)) {
      return [];
    }
    return listLike.map(sanitizeCard).filter(Boolean);
  }

  function sanitizeRun(runLike) {
    if (!runLike || typeof runLike !== "object") {
      return null;
    }

    const run = createRun();
    run.floor = nonNegInt(runLike.floor, run.floor) || 1;
    run.maxFloor = nonNegInt(runLike.maxFloor, run.maxFloor) || run.maxFloor;
    run.room = Math.max(1, nonNegInt(runLike.room, run.room));
    run.roomsPerFloor = Math.max(3, nonNegInt(runLike.roomsPerFloor, run.roomsPerFloor));
    run.enemiesDefeated = nonNegInt(runLike.enemiesDefeated, 0);
    run.totalHands = nonNegInt(runLike.totalHands, 0);
    run.chipsEarnedRun = nonNegInt(runLike.chipsEarnedRun, 0);
    run.chipsSpentRun = nonNegInt(runLike.chipsSpentRun, 0);
    run.maxStreak = nonNegInt(runLike.maxStreak, 0);

    const player = runLike.player && typeof runLike.player === "object" ? runLike.player : {};
    run.player.maxHp = Math.max(10, nonNegInt(player.maxHp, run.player.maxHp));
    run.player.hp = clampNumber(player.hp, 0, run.player.maxHp, run.player.maxHp);
    run.player.gold = nonNegInt(player.gold, run.player.gold);
    run.player.streak = nonNegInt(player.streak, 0);
    run.player.totalDamageDealt = nonNegInt(player.totalDamageDealt, 0);
    run.player.totalDamageTaken = nonNegInt(player.totalDamageTaken, 0);
    run.player.bustGuardsLeft = nonNegInt(player.bustGuardsLeft, 0);
    run.player.stats = mergePlayerStats(player.stats);
    run.player.relics = {};

    if (player.relics && typeof player.relics === "object") {
      for (const [id, count] of Object.entries(player.relics)) {
        if (typeof id === "string" && id.length > 0) {
          run.player.relics[id] = nonNegInt(count, 0);
        }
      }
    }

    if (Array.isArray(runLike.log)) {
      run.log = runLike.log
        .slice(0, 6)
        .map((entry) => ({
          message: String(entry?.message || ""),
          ttl: clampNumber(entry?.ttl, 0, 30, 8),
        }))
        .filter((entry) => entry.message.length > 0);
    }

    run.maxStreak = Math.max(run.maxStreak, run.player.streak);
    return run;
  }

  function sanitizeEncounter(encounterLike, run) {
    if (!encounterLike || typeof encounterLike !== "object" || !run) {
      return null;
    }

    const type = ["normal", "elite", "boss"].includes(encounterLike?.enemy?.type)
      ? encounterLike.enemy.type
      : roomType(run.room, run.roomsPerFloor);

    const enemyBase = createEnemy(run.floor, run.room, type);
    const enemyLike = encounterLike.enemy && typeof encounterLike.enemy === "object" ? encounterLike.enemy : {};
    const enemy = {
      ...enemyBase,
      name: typeof enemyLike.name === "string" && enemyLike.name.length > 0 ? enemyLike.name : enemyBase.name,
      hp: clampNumber(enemyLike.hp, 0, 9999, enemyBase.hp),
      maxHp: Math.max(1, nonNegInt(enemyLike.maxHp, enemyBase.maxHp)),
      attack: Math.max(1, nonNegInt(enemyLike.attack, enemyBase.attack)),
    };
    enemy.hp = Math.min(enemy.hp, enemy.maxHp);

    const encounter = {
      enemy,
      shoe: sanitizeCardList(encounterLike.shoe),
      discard: sanitizeCardList(encounterLike.discard),
      playerHand: sanitizeCardList(encounterLike.playerHand),
      dealerHand: sanitizeCardList(encounterLike.dealerHand),
      splitQueue: Array.isArray(encounterLike.splitQueue)
        ? encounterLike.splitQueue
            .map((hand) => sanitizeCardList(hand))
            .filter((hand) => hand.length > 0)
            .slice(0, 3)
        : [],
      splitUsed: Boolean(encounterLike.splitUsed),
      hideDealerHole: Boolean(encounterLike.hideDealerHole),
      phase: ["player", "dealer", "resolve", "done"].includes(encounterLike.phase) ? encounterLike.phase : "player",
      resultText: typeof encounterLike.resultText === "string" ? encounterLike.resultText : "",
      resolveTimer: clampNumber(encounterLike.resolveTimer, 0, 10, 0),
      handIndex: Math.max(1, nonNegInt(encounterLike.handIndex, 1)),
      doubleDown: Boolean(encounterLike.doubleDown),
      bustGuardTriggered: Boolean(encounterLike.bustGuardTriggered),
      critTriggered: Boolean(encounterLike.critTriggered),
      lastPlayerAction: ["hit", "stand", "double", "split", "none"].includes(encounterLike.lastPlayerAction)
        ? encounterLike.lastPlayerAction
        : "none",
    };

    return encounter;
  }

  function serializeShopStock(stock) {
    if (!Array.isArray(stock)) {
      return [];
    }
    return stock.map((item) => {
      if (item.type === "relic") {
        return {
          type: "relic",
          relicId: item.relic?.id || "",
          cost: nonNegInt(item.cost, 0),
          sold: Boolean(item.sold),
        };
      }
      return {
        type: "heal",
        id: item.id || "patch-kit",
        name: item.name || "Patch Kit",
        description: item.description || "Restore 10 HP.",
        cost: nonNegInt(item.cost, 0),
        sold: Boolean(item.sold),
      };
    });
  }

  function hydrateShopStock(serialized) {
    if (!Array.isArray(serialized)) {
      return [];
    }
    return serialized
      .map((item) => {
        if (item.type === "relic") {
          const relic = RELIC_BY_ID.get(item.relicId);
          if (!relic) {
            return null;
          }
          return {
            type: "relic",
            relic,
            cost: nonNegInt(item.cost, relic.shopCost),
            sold: Boolean(item.sold),
          };
        }
        return {
          type: "heal",
          id: typeof item.id === "string" ? item.id : "patch-kit",
          name: typeof item.name === "string" ? item.name : "Patch Kit",
          description: typeof item.description === "string" ? item.description : "Restore 10 HP.",
          cost: nonNegInt(item.cost, 10),
          sold: Boolean(item.sold),
        };
      })
      .filter(Boolean);
  }

  function clearSavedRun() {
    safeRemoveStorage(STORAGE_KEYS.run);
    state.savedRunSnapshot = null;
  }

  function saveRunSnapshot() {
    if (!state.run) {
      clearSavedRun();
      return;
    }
    const snapshot = {
      version: 1,
      savedAt: Date.now(),
      mode: state.mode,
      run: state.run,
      encounter: state.encounter,
      rewardOptionIds: state.rewardOptions.map((relic) => relic.id),
      shopStock: serializeShopStock(state.shopStock),
      selectionIndex: state.selectionIndex,
      announcement: state.announcement,
      announcementTimer: state.announcementTimer,
    };
    safeSetStorage(STORAGE_KEYS.run, JSON.stringify(snapshot));
    state.savedRunSnapshot = snapshot;
  }

  function loadSavedRunSnapshot() {
    const raw = safeGetStorage(STORAGE_KEYS.run);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      if (!parsed.run) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function resumeSavedRun() {
    const snapshot = state.savedRunSnapshot || loadSavedRunSnapshot();
    if (!snapshot) {
      return false;
    }

    const run = sanitizeRun(snapshot.run);
    const encounter = sanitizeEncounter(snapshot.encounter, run);
    if (!run || !encounter) {
      clearSavedRun();
      return false;
    }

    const validMode = ["playing", "reward", "shop", "gameover", "victory"].includes(snapshot.mode) ? snapshot.mode : "playing";

    state.run = run;
    state.encounter = encounter;
    state.mode = validMode;
    state.rewardOptions = Array.isArray(snapshot.rewardOptionIds)
      ? snapshot.rewardOptionIds.map((id) => RELIC_BY_ID.get(id)).filter(Boolean)
      : [];
    state.shopStock = hydrateShopStock(snapshot.shopStock);
    state.selectionIndex = nonNegInt(snapshot.selectionIndex, 0);
    setAnnouncement("Run resumed.", 1.8);
    state.floatingTexts = [];
    state.cardBursts = [];
    state.sparkParticles = [];
    state.flashOverlays = [];
    state.screenShakeTime = 0;
    state.screenShakeDuration = 0;
    state.screenShakePower = 0;
    state.autosaveTimer = 0;
    if (state.run && Array.isArray(state.run.log)) {
      state.run.log = [];
    }
    state.savedRunSnapshot = snapshot;
    updateProfileBest(run);
    unlockAudio();
    playUiSfx("confirm");
    resizeCanvas();
    return true;
  }

  function updateProfileBest(run) {
    if (!state.profile || !run) {
      return;
    }
    state.profile.totals.bestFloor = Math.max(state.profile.totals.bestFloor, run.floor);
    state.profile.totals.bestRoom = Math.max(state.profile.totals.bestRoom, run.room);
    state.profile.totals.longestStreak = Math.max(state.profile.totals.longestStreak, run.maxStreak || 0, run.player?.streak || 0);
  }

  function finalizeRun(outcome) {
    if (!state.profile || !state.run) {
      clearSavedRun();
      return;
    }

    const run = state.run;
    const totals = state.profile.totals;
    totals.runsCompleted += 1;
    if (outcome === "victory") {
      totals.runsWon += 1;
    } else {
      totals.runsLost += 1;
    }

    totals.enemiesDefeated += run.enemiesDefeated;
    totals.handsPlayed += run.totalHands;
    totals.damageDealt += run.player.totalDamageDealt;
    totals.damageTaken += run.player.totalDamageTaken;
    totals.chipsEarned += run.chipsEarnedRun || 0;
    totals.chipsSpent += run.chipsSpentRun || 0;
    updateProfileBest(run);

    state.profile.runs.unshift({
      at: Date.now(),
      outcome,
      floor: run.floor,
      room: run.room,
      enemiesDefeated: run.enemiesDefeated,
      hands: run.totalHands,
      chips: run.player.gold,
    });
    if (state.profile.runs.length > MAX_RUN_HISTORY) {
      state.profile.runs.length = MAX_RUN_HISTORY;
    }

    saveProfile();
    clearSavedRun();
  }

  function gainChips(amount) {
    if (!state.run || !Number.isFinite(amount) || amount === 0) {
      return;
    }

    const run = state.run;
    run.player.gold = Math.max(0, run.player.gold + Math.round(amount));
    if (amount > 0) {
      run.chipsEarnedRun = (run.chipsEarnedRun || 0) + Math.round(amount);
    } else {
      run.chipsSpentRun = (run.chipsSpentRun || 0) + Math.round(Math.abs(amount));
    }
  }

  function passiveDescription(text) {
    if (typeof text !== "string" || text.length === 0) {
      return "Passive: No effect.";
    }
    return text.toLowerCase().startsWith("passive:") ? text : `Passive: ${text}`;
  }

  function passiveSummary(run) {
    if (!run) {
      return "";
    }

    const s = run.player.stats;
    const bits = [];
    if (s.flatDamage > 0) bits.push(`+${s.flatDamage} dmg`);
    if (s.block > 0) bits.push(`-${s.block} incoming`);
    if (s.critChance > 0) bits.push(`${Math.round(s.critChance * 100)}% crit`);
    if (s.healOnWinHand > 0) bits.push(`heal ${s.healOnWinHand}/win`);
    if (s.goldMultiplier > 1) bits.push(`+${Math.round((s.goldMultiplier - 1) * 100)}% chips`);
    if (s.bustGuardPerEncounter > 0) bits.push(`${s.bustGuardPerEncounter} guards/enc`);
    if (s.firstHandDamage > 0) bits.push(`+${s.firstHandDamage} first hand`);
    if (s.chipsOnWinHand > 0) bits.push(`+${s.chipsOnWinHand} chips/win`);
    if (s.chipsOnPush > 0) bits.push(`+${s.chipsOnPush} chips/push`);

    return bits.slice(0, 4).join(" | ");
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function createDeck(numDecks = 4) {
    const deck = [];
    for (let n = 0; n < numDecks; n += 1) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          deck.push({ suit, rank });
        }
      }
    }
    return deck;
  }

  function rankValue(rank) {
    if (rank === "A") {
      return 11;
    }
    if (rank === "K" || rank === "Q" || rank === "J") {
      return 10;
    }
    return Number(rank);
  }

  function handTotal(cards) {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      total += rankValue(card.rank);
      if (card.rank === "A") {
        aces += 1;
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return { total, softAces: aces };
  }

  function isBlackjack(cards) {
    return cards.length === 2 && handTotal(cards).total === 21;
  }

  function createRun() {
    return {
      floor: 1,
      maxFloor: 3,
      room: 1,
      roomsPerFloor: 5,
      enemiesDefeated: 0,
      totalHands: 0,
      chipsEarnedRun: 0,
      chipsSpentRun: 0,
      maxStreak: 0,
      player: {
        hp: 42,
        maxHp: 42,
        gold: 24,
        streak: 0,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        bustGuardsLeft: 0,
        relics: {},
        stats: defaultPlayerStats(),
      },
      log: [],
    };
  }

  function roomType(room, roomsPerFloor) {
    if (room >= roomsPerFloor) {
      return "boss";
    }
    if (room === 3) {
      return "elite";
    }
    return "normal";
  }

  function pickEnemyName(type) {
    const names = ENEMY_NAMES[type];
    return names[Math.floor(Math.random() * names.length)];
  }

  function createEnemy(floor, room, type) {
    const baseHp = 14 + floor * 3 + room * 2;
    const hp =
      type === "boss"
        ? baseHp + 28
        : type === "elite"
          ? baseHp + 11
          : baseHp;

    const attack =
      type === "boss"
        ? 5 + floor
        : type === "elite"
          ? 3 + floor
          : 1 + floor;

    const goldDrop =
      type === "boss"
        ? 40 + floor * 10
        : type === "elite"
          ? 26 + floor * 7
          : 12 + floor * 5 + room * 2;

    return {
      name: pickEnemyName(type),
      type,
      hp,
      maxHp: hp,
      attack,
      goldDrop,
      color:
        type === "boss"
          ? "#ff7a5c"
          : type === "elite"
            ? "#f2c05c"
            : "#83b9ff",
    };
  }

  function addLog(message) {
    if (!state.run) {
      return;
    }
    state.run.log.unshift({ message, ttl: 12 });
    if (state.run.log.length > 6) {
      state.run.log.length = 6;
    }
  }

  function setAnnouncement(message, duration = 1.8) {
    state.announcement = typeof message === "string" ? message : "";
    const safeDuration = Math.max(0.25, Number(duration) || 1.8);
    state.announcementTimer = safeDuration;
    state.announcementDuration = safeDuration;
  }

  function semitoneToFreq(base, semitoneOffset) {
    return base * 2 ** (semitoneOffset / 12);
  }

  function getAudioContextCtor() {
    return window.AudioContext || window.webkitAudioContext || null;
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
    state.audio.stepTimer = MUSIC_STEP_SECONDS;
    state.audio.stepIndex = 0;
    return context;
  }

  function syncAudioEnabled() {
    if (!state.audio.context || !state.audio.masterGain) {
      return;
    }
    const target = state.audio.enabled ? 0.86 : 0;
    state.audio.masterGain.gain.setTargetAtTime(target, state.audio.context.currentTime, 0.08);
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
    };

    if (context.state !== "running" && state.audio.enabled) {
      context.resume().then(prime).catch(() => {});
    } else {
      prime();
    }
  }

  function setAudioEnabled(enabled) {
    state.audio.enabled = Boolean(enabled);
    saveAudioEnabled(state.audio.enabled);
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
    const bus = opts.bus === "music" ? state.audio.musicGain : state.audio.sfxGain;
    if (!context || !bus) {
      return;
    }

    const when = Math.max(context.currentTime, Number(opts.when) || context.currentTime);
    const attack = Math.max(0.001, Number(opts.attack) || 0.002);
    const release = Math.max(0.012, Number(opts.release) || 0.09);
    const gainLevel = Math.max(0.001, Number(opts.gain) || 0.08);
    const sustainLevel = Math.max(0, Math.min(gainLevel, Number(opts.sustainGain) || gainLevel * 0.72));

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

  function playUiSfx(kind) {
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

    if (outgoing > 0) {
      playImpactSfx(outgoing, "enemy");
    }
    if (incoming > 0) {
      playImpactSfx(incoming, "player");
    }

    if (outcome === "push") {
      playTone(420, 0.06, { type: "sine", gain: 0.03, release: 0.04 });
    }
  }

  function updateMusic(dt) {
    if (!canPlayAudio()) {
      return;
    }

    const context = state.audio.context;
    if (!context || !state.audio.musicGain) {
      return;
    }
    const calmMode = state.mode === "menu";
    const tenseMode = state.mode === "playing";
    const targetMusicGain = calmMode ? 0.12 : tenseMode ? 0.2 : 0.15;
    state.audio.musicGain.gain.setTargetAtTime(targetMusicGain, context.currentTime, 0.35);

    if (state.audio.lastMusicMode !== state.mode) {
      state.audio.lastMusicMode = state.mode;
      state.audio.stepTimer = Math.min(state.audio.stepTimer, MUSIC_STEP_SECONDS * 0.5);
    }

    state.audio.stepTimer -= dt;
    while (state.audio.stepTimer <= 0) {
      state.audio.stepTimer += MUSIC_STEP_SECONDS;

      const step = state.audio.stepIndex++;
      const bar = Math.floor(step / 16);
      const beat = step % 16;
      const chord = MUSIC_CHORDS[bar % MUSIC_CHORDS.length];
      const base = 116;
      const bass = chord[0] - 12;

      if (beat % 4 === 0) {
        playTone(semitoneToFreq(base, bass), 0.16, {
          type: "triangle",
          gain: tenseMode ? 0.085 : 0.055,
          release: 0.1,
          bus: "music",
        });
      }

      if (beat % 2 === 0) {
        const arp = chord[(Math.floor(beat / 2) + bar) % chord.length] + 12;
        playTone(semitoneToFreq(base, arp), 0.12, {
          type: "sine",
          gain: tenseMode ? 0.05 : 0.035,
          release: 0.09,
          bus: "music",
          detune: beat % 4 === 0 ? 3 : -2,
        });
      }

      if (tenseMode && beat % 4 === 2) {
        playTone(semitoneToFreq(base, chord[2] + 19), 0.07, {
          type: "square",
          gain: 0.023,
          release: 0.05,
          bus: "music",
        });
      }
    }
  }

  function spawnFloatText(text, x, y, color) {
    state.floatingTexts.push({ text, x, y, color, life: 1.2, maxLife: 1.2, vy: 24 });
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

  function triggerImpactBurst(side, amount, color) {
    const clampedAmount = Math.max(1, Number(amount) || 1);
    const x = side === "enemy" ? WIDTH * 0.73 : WIDTH * 0.27;
    const y = side === "enemy" ? 108 : 576;
    spawnSparkBurst(x, y, color, 8 + Math.min(26, Math.floor(clampedAmount * 1.2)), 120 + clampedAmount * 8);
    triggerScreenShake(Math.min(16, 3 + clampedAmount * 0.66), 0.14 + Math.min(0.16, clampedAmount * 0.01));
    triggerFlash(color, Math.min(0.16, 0.03 + clampedAmount * 0.004), 0.12);
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

  function cardToText(card) {
    return `${card.rank}${card.suit}`;
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

  function handCardPosition(handType, index, count) {
    const spacing = 96;
    const portraitOffset = state.viewport?.portraitZoomed ? 24 : 0;
    const y = handType === "dealer" ? 190 + portraitOffset : 430 + portraitOffset;
    const startX = WIDTH * 0.5 - ((count - 1) * spacing) * 0.5 - CARD_W * 0.5;
    return { x: startX + index * spacing, y };
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

    const pos = handCardPosition(target, hand.length - 1, hand.length);
    state.cardBursts.push({
      x: pos.x + CARD_W * 0.5,
      y: pos.y + CARD_H * 0.5,
      color: target === "player" ? "#67ddff" : "#ffa562",
      life: 0.28,
      maxLife: 0.28,
    });
    spawnSparkBurst(pos.x + CARD_W * 0.5, pos.y + CARD_H * 0.5, target === "player" ? "#76e5ff" : "#ffbb84", 5, 88);
    playDealSfx(target);

    return hand[hand.length - 1];
  }

  function createEncounter(run) {
    const type = roomType(run.room, run.roomsPerFloor);
    const enemy = createEnemy(run.floor, run.room, type);
    return {
      enemy,
      shoe: shuffle(createDeck(4)),
      discard: [],
      playerHand: [],
      dealerHand: [],
      splitQueue: [],
      splitUsed: false,
      hideDealerHole: true,
      phase: "player",
      resultText: "",
      resolveTimer: 0,
      handIndex: 1,
      doubleDown: false,
      bustGuardTriggered: false,
      critTriggered: false,
      lastPlayerAction: "none",
    };
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
    encounter.hideDealerHole = true;
    encounter.phase = "player";
    encounter.resultText = "";
    encounter.resolveTimer = 0;
    encounter.doubleDown = false;
    encounter.bustGuardTriggered = false;
    encounter.critTriggered = false;
    encounter.lastPlayerAction = "none";

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
    state.run.player.hp = clampNumber(state.run.player.hp, 0, state.run.player.maxHp, state.run.player.maxHp);
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
    setAnnouncement(`${enemy.name} enters the table.`, 1.9);

    startHand();
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
    state.run.player.hp = state.run.player.maxHp;
    state.rewardOptions = [];
    state.shopStock = [];
    state.selectionIndex = 0;
    state.floatingTexts = [];
    state.cardBursts = [];
    state.sparkParticles = [];
    state.flashOverlays = [];
    state.screenShakeTime = 0;
    state.screenShakeDuration = 0;
    state.screenShakePower = 0;
    setAnnouncement("Deal the first hand.", 2.2);
    clearSavedRun();
    beginEncounter();
    resizeCanvas();
  }

  function canPlayerAct() {
    return (
      state.mode === "playing" &&
      Boolean(state.encounter) &&
      state.encounter.phase === "player" &&
      state.encounter.resolveTimer <= 0
    );
  }

  function canSplitCurrentHand() {
    if (!canPlayerAct() || !state.encounter) {
      return false;
    }
    const encounter = state.encounter;
    if (encounter.splitUsed || encounter.doubleDown || encounter.playerHand.length !== 2) {
      return false;
    }
    const [a, b] = encounter.playerHand;
    return Boolean(a && b && a.rank === b.rank);
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

  function beginQueuedSplitHand(encounter) {
    if (!encounter || !Array.isArray(encounter.splitQueue) || encounter.splitQueue.length === 0) {
      return false;
    }

    const seedHand = encounter.splitQueue.shift();
    encounter.playerHand = seedHand.map((card) => ({ rank: card.rank, suit: card.suit }));
    encounter.dealerHand = [];
    encounter.hideDealerHole = true;
    encounter.phase = "player";
    encounter.resultText = "";
    encounter.resolveTimer = 0;
    encounter.doubleDown = false;
    encounter.bustGuardTriggered = false;
    encounter.critTriggered = false;
    encounter.lastPlayerAction = "none";

    dealCard(encounter, "dealer");
    dealCard(encounter, "player");
    dealCard(encounter, "dealer");
    setAnnouncement("Split hand is live.", 1.1);

    const playerNatural = isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);
    if (playerNatural || dealerNatural) {
      resolveDealerThenShowdown(true);
    }

    return true;
  }

  function splitAction() {
    if (!canSplitCurrentHand()) {
      playUiSfx("error");
      return;
    }

    const encounter = state.encounter;
    const [first, second] = encounter.playerHand;
    encounter.playerHand = [{ rank: first.rank, suit: first.suit }];
    encounter.splitQueue = [[{ rank: second.rank, suit: second.suit }]];
    encounter.splitUsed = true;
    encounter.doubleDown = false;
    encounter.lastPlayerAction = "split";

    playActionSfx("double");
    setAnnouncement("Hand split. Play the first split hand.", 1.2);
    addLog("Hand split.");

    dealCard(encounter, "player");
    const total = handTotal(encounter.playerHand).total;
    if (total > 21 && !tryActivateBustGuard(encounter)) {
      resolveHand("player_bust");
      return;
    }

    const playerNatural = isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);
    if (playerNatural || dealerNatural) {
      resolveDealerThenShowdown(true);
    }
  }

  function resolveDealerThenShowdown(naturalCheck) {
    const encounter = state.encounter;
    if (!encounter || encounter.phase === "done") {
      return;
    }

    encounter.phase = "dealer";
    encounter.hideDealerHole = false;

    if (!naturalCheck) {
      while (handTotal(encounter.dealerHand).total < 17) {
        dealCard(encounter, "dealer");
      }
    }

    const pTotal = encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total;
    const dTotal = handTotal(encounter.dealerHand).total;
    const playerNatural = !encounter.bustGuardTriggered && isBlackjack(encounter.playerHand);
    const dealerNatural = isBlackjack(encounter.dealerHand);

    let outcome = "push";
    if (pTotal > 21) {
      outcome = "player_bust";
    } else if (dTotal > 21) {
      outcome = "dealer_bust";
    } else if (playerNatural && !dealerNatural) {
      outcome = "blackjack";
    } else if (dealerNatural && !playerNatural) {
      outcome = "dealer_blackjack";
    } else if (pTotal > dTotal) {
      outcome = "player_win";
    } else if (dTotal > pTotal) {
      outcome = "dealer_win";
    }

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
    let text = "Push. No damage.";

    if (outcome === "blackjack") {
      outgoing =
        12 +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        run.player.stats.blackjackBonusDamage +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0);
      text = "Blackjack! You slam the table.";
    } else if (outcome === "dealer_bust") {
      outgoing =
        7 +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        run.player.stats.dealerBustBonusDamage +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0) +
        (encounter.lastPlayerAction === "double" ? run.player.stats.doubleWinDamage : 0);
      text = "Dealer busts. You cash in.";
    } else if (outcome === "player_win") {
      outgoing =
        4 +
        Math.max(0, pTotal - dTotal) +
        run.player.stats.flatDamage +
        lowHpBonus +
        streakBonus +
        firstHandBonus +
        (encounter.doubleDown ? 2 : 0) +
        (encounter.lastPlayerAction === "stand" ? run.player.stats.standWinDamage : 0) +
        (encounter.lastPlayerAction === "double" ? run.player.stats.doubleWinDamage : 0);
      text = "Hand won.";
    } else if (outcome === "dealer_blackjack") {
      incoming = enemy.attack + 5;
      text = "Dealer blackjack. Brutal.";
    } else if (outcome === "dealer_win") {
      incoming = enemy.attack + Math.max(1, Math.floor((dTotal - pTotal) * 0.5) + 1);
      text = "Hand lost.";
    } else if (outcome === "player_bust") {
      incoming = Math.max(1, enemy.attack + 3 - run.player.stats.bustBlock);
      text = "Bust. The house punishes greed.";
    }

    if (outgoing > 0 && Math.random() < run.player.stats.critChance) {
      outgoing *= 2;
      encounter.critTriggered = true;
      text += " Critical burst!";
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
    }

    playOutcomeSfx(outcome, outgoing, incoming);

    if (outgoing > 0) {
      enemy.hp = Math.max(0, enemy.hp - outgoing);
      run.player.totalDamageDealt += outgoing;
      spawnFloatText(`-${outgoing}`, WIDTH * 0.72, 108, "#ff916e");
      triggerImpactBurst("enemy", outgoing, outcome === "blackjack" ? "#f8d37b" : "#ff916e");
    }

    if (incoming > 0) {
      run.player.hp = Math.max(0, run.player.hp - incoming);
      run.player.totalDamageTaken += incoming;
      run.player.streak = 0;
      spawnFloatText(`-${incoming}`, WIDTH * 0.26, 576, "#ff86aa");
      triggerImpactBurst("player", incoming, "#ff86aa");
    } else if (outgoing > 0) {
      run.player.streak += 1;
      run.maxStreak = Math.max(run.maxStreak || 0, run.player.streak);
      if (run.player.stats.healOnWinHand > 0) {
        const heal = Math.min(run.player.stats.healOnWinHand, run.player.maxHp - run.player.hp);
        if (heal > 0) {
          run.player.hp += heal;
          spawnFloatText(`+${heal}`, WIDTH * 0.26, 540, "#8df0b2");
        }
      }
      if (run.player.stats.chipsOnWinHand > 0) {
        gainChips(run.player.stats.chipsOnWinHand);
        spawnFloatText(`+${run.player.stats.chipsOnWinHand} chips`, WIDTH * 0.5, 72, "#ffd687");
      }
    } else if (outcome === "push" && run.player.stats.chipsOnPush > 0) {
      gainChips(run.player.stats.chipsOnPush);
      spawnFloatText(`+${run.player.stats.chipsOnPush} chips`, WIDTH * 0.5, 72, "#ffd687");
      text += ` Pocketed ${run.player.stats.chipsOnPush} chips.`;
    }

    if (outgoing > 0) {
      text += ` Enemy takes ${outgoing}.`;
    }
    if (incoming > 0) {
      text += ` You take ${incoming}.`;
    }

    if (encounter.bustGuardTriggered) {
      text += " Bust Guard converted the bust.";
    }

    if (encounter.critTriggered) {
      spawnSparkBurst(WIDTH * 0.6, 148, "#ffd88d", 20, 240);
      triggerFlash("#ffd88d", 0.1, 0.16);
    }
    if (outcome === "blackjack") {
      spawnSparkBurst(WIDTH * 0.5, 646, "#f8d37b", 28, 260);
      triggerScreenShake(8.5, 0.24);
    }

    encounter.resultText = "";
    setAnnouncement(text, 1.45);
    run.totalHands += 1;
    updateProfileBest(run);

    if (run.player.hp <= 0) {
      finalizeRun("defeat");
      state.mode = "gameover";
      encounter.phase = "done";
      return;
    }

    if (enemy.hp <= 0) {
      onEncounterWin();
      return;
    }

    encounter.phase = "resolve";
    encounter.resolveTimer = 1.05;
    saveRunSnapshot();
  }

  function onEncounterWin() {
    if (!state.run || !state.encounter) {
      return;
    }

    const run = state.run;
    const encounter = state.encounter;
    const enemy = encounter.enemy;

    run.enemiesDefeated += 1;
    const payout = Math.round(enemy.goldDrop * run.player.stats.goldMultiplier) + Math.min(10, run.player.streak);
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
      state.mode = "reward";
      state.selectionIndex = 0;
      state.rewardOptions = generateRewardOptions(3, true);
      setAnnouncement(`Floor cleared. Restored ${heal} HP.`, 2.4);
      saveRunSnapshot();
      return;
    }

    run.room += 1;

    if (run.room % 2 === 0) {
      state.mode = "reward";
      state.selectionIndex = 0;
      state.rewardOptions = generateRewardOptions(3, false);
      setAnnouncement("Relic draft unlocked.", 2);
    } else {
      state.mode = "shop";
      state.selectionIndex = 0;
      state.shopStock = generateShopStock(3);
      setAnnouncement("Black market table unlocked.", 2);
    }
    saveRunSnapshot();
  }

  function generateRewardOptions(count, includeBossRelic) {
    const pool = shuffle([...RELICS]);
    const options = [];

    if (includeBossRelic) {
      options.push(BOSS_RELIC);
    }

    while (options.length < count && pool.length > 0) {
      options.push(pool.pop());
    }

    return options;
  }

  function generateShopStock(count) {
    const floorScale = state.run ? state.run.floor * 2 : 0;
    const relics = shuffle([...RELICS]).slice(0, Math.max(1, count - 1));

    const stock = relics.map((relic) => ({
      type: "relic",
      relic,
      cost: relic.shopCost + floorScale,
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
    run.player.hp = Math.min(run.player.maxHp, run.player.hp);

    if (state.profile) {
      state.profile.relicCollection[relic.id] = nonNegInt(state.profile.relicCollection[relic.id], 0) + 1;
      state.profile.totals.relicsCollected += 1;
      saveProfile();
    }
  }

  function claimReward() {
    if (state.mode !== "reward" || state.rewardOptions.length === 0) {
      return;
    }

    const relic = state.rewardOptions[state.selectionIndex] || state.rewardOptions[0];
    applyRelic(relic);
    playUiSfx("confirm");
    addLog(`Relic claimed: ${relic.name}.`);
    addLog(passiveDescription(relic.description));

    state.rewardOptions = [];
    state.selectionIndex = 0;
    beginEncounter();
  }

  function buyShopItem() {
    if (state.mode !== "shop" || !state.run || state.shopStock.length === 0) {
      return;
    }

    const run = state.run;
    const item = state.shopStock[state.selectionIndex];
    if (!item || item.sold) {
      playUiSfx("error");
      return;
    }

    if (item.type === "relic" && state.shopStock.some((entry) => entry.type === "relic" && entry.sold)) {
      playUiSfx("error");
      addLog("Only one relic can be bought per shop.");
      setAnnouncement("Only one relic per shop visit.", 1.2);
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
    saveRunSnapshot();
  }

  function leaveShop() {
    if (state.mode !== "shop") {
      return;
    }
    playUiSfx("confirm");
    beginEncounter();
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

  function shouldUseMobileControls() {
    if (!mobileControls) {
      return false;
    }
    const coarsePointer = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
    return coarsePointer || "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  function shortcutHintForAction(action) {
    if (state.mode === "menu") {
      if (action === "left") {
        return "R";
      }
      if (action === "confirm") {
        return "Enter / Space";
      }
      return "";
    }

    if (state.mode === "playing") {
      if (action === "hit") {
        return "A";
      }
      if (action === "stand") {
        return "B";
      }
      if (action === "double") {
        return "Space";
      }
      if (action === "confirm") {
        return "S";
      }
      return "";
    }

    if (state.mode === "reward") {
      if (action === "left") {
        return "←";
      }
      if (action === "right") {
        return "→";
      }
      if (action === "confirm") {
        return "Enter / Space";
      }
      return "";
    }

    if (state.mode === "shop") {
      if (action === "left") {
        return "←";
      }
      if (action === "right") {
        return "→";
      }
      if (action === "double") {
        return "Space";
      }
      if (action === "confirm") {
        return "Enter";
      }
      return "";
    }

    if (state.mode === "gameover" || state.mode === "victory") {
      if (action === "confirm") {
        return "Enter / Space";
      }
      return "";
    }

    return "";
  }

  function iconForAction(action, label) {
    if (action === "left") {
      return state.mode === "menu" ? "↺" : "◀";
    }
    if (action === "right") {
      return "▶";
    }
    if (action === "hit") {
      return "✚";
    }
    if (action === "stand") {
      return "■";
    }
    if (action === "double") {
      return state.mode === "shop" || label === "Buy" ? "🛒" : "×2";
    }
    if (action === "confirm") {
      if (state.mode === "playing") {
        return "⇄";
      }
      if (state.mode === "reward") {
        return "";
      }
      if (state.mode === "menu") {
        return "▶";
      }
      if (state.mode === "shop") {
        return "↵";
      }
      return "✓";
    }
    return "•";
  }

  function ensureMobileButtonText(button) {
    let iconNode = button.querySelector(".mobile-control-icon");
    let labelNode = button.querySelector(".mobile-control-label");
    let shortcutNode = button.querySelector(".mobile-control-shortcut");

    if (!labelNode) {
      const initialLabel = button.textContent ? button.textContent.trim() : "";
      button.textContent = "";
      iconNode = document.createElement("span");
      iconNode.className = "mobile-control-icon";
      iconNode.textContent = "•";
      iconNode.setAttribute("aria-hidden", "true");
      button.appendChild(iconNode);
      labelNode = document.createElement("span");
      labelNode.className = "mobile-control-label";
      labelNode.textContent = initialLabel;
      button.appendChild(labelNode);
    }

    if (!iconNode) {
      iconNode = document.createElement("span");
      iconNode.className = "mobile-control-icon";
      iconNode.textContent = "•";
      iconNode.setAttribute("aria-hidden", "true");
      button.prepend(iconNode);
    }

    if (!shortcutNode) {
      shortcutNode = document.createElement("span");
      shortcutNode.className = "mobile-control-shortcut";
      shortcutNode.setAttribute("aria-hidden", "true");
      button.appendChild(shortcutNode);
    }

    return { iconNode, labelNode, shortcutNode };
  }

  function setMobileButton(button, label, enabled, visible = true) {
    if (!button) {
      return;
    }
    button.style.display = visible ? "inline-flex" : "none";
    button.disabled = !enabled;
    const { iconNode, labelNode, shortcutNode } = ensureMobileButtonText(button);
    if (labelNode.textContent !== label) {
      labelNode.textContent = label;
    }
    const icon = iconForAction(button.dataset.mobileAction || "", label);
    if (iconNode.textContent !== icon) {
      iconNode.textContent = icon;
    }
    iconNode.hidden = !icon;
    const shortcut = shortcutHintForAction(button.dataset.mobileAction || "");
    if (shortcutNode.textContent !== shortcut) {
      shortcutNode.textContent = shortcut;
    }
    shortcutNode.hidden = !shortcut;
    button.setAttribute("aria-label", label);
  }

  function updateMobileControls() {
    if (!mobileControls || !mobileButtons) {
      state.mobileActive = false;
      state.compactControls = false;
      state.mobilePortrait = false;
      document.body.classList.remove("mobile-ui-active");
      document.body.classList.remove("mobile-portrait-ui");
      document.body.classList.remove("compact-controls");
      document.body.classList.remove("menu-screen");
      return;
    }

    state.mobileActive = true;
    state.compactControls = shouldUseMobileControls();
    const viewportWidth = Math.floor(
      window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || WIDTH
    );
    const viewportHeight = Math.floor(
      window.visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || HEIGHT
    );
    state.mobilePortrait = state.compactControls && viewportHeight > viewportWidth;
    mobileControls.classList.toggle("active", state.mobileActive);
    document.body.classList.toggle("mobile-ui-active", state.mobileActive);
    document.body.classList.toggle("mobile-portrait-ui", state.mobilePortrait);
    document.body.classList.toggle("compact-controls", state.compactControls);
    document.body.classList.toggle("menu-screen", state.mode === "menu");
    mobileControls.classList.remove("reward-claim-only");

    Object.values(mobileButtons).forEach((button) => {
      if (!button) {
        return;
      }
      button.style.gridColumn = "auto";
      button.style.width = "auto";
      button.style.justifySelf = "stretch";
    });

    setMobileButton(mobileButtons.left, "Left", false, true);
    setMobileButton(mobileButtons.hit, "Hit", false, true);
    setMobileButton(mobileButtons.stand, "Stand", false, true);
    setMobileButton(mobileButtons.double, "Double", false, true);
    setMobileButton(mobileButtons.right, "Right", false, true);
    setMobileButton(mobileButtons.confirm, "Confirm", false, true);

    if (state.mode === "menu") {
      setMobileButton(mobileButtons.left, "Resume", hasSavedRun(), true);
      setMobileButton(mobileButtons.confirm, "New Run", true, true);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      setMobileButton(mobileButtons.double, "Double", false, false);
      setMobileButton(mobileButtons.right, "Right", false, false);
      return;
    }

    if (state.mode === "playing") {
      const canAct = canPlayerAct();
      const canDouble =
        canAct &&
        state.encounter &&
        state.encounter.playerHand.length === 2 &&
        !state.encounter.doubleDown &&
        !state.encounter.splitUsed;
      const canSplit = canSplitCurrentHand();
      setMobileButton(mobileButtons.hit, "Hit", canAct, true);
      setMobileButton(mobileButtons.stand, "Stand", canAct, true);
      setMobileButton(mobileButtons.double, "Double", canDouble, true);
      setMobileButton(mobileButtons.confirm, "Split", canSplit, true);
      setMobileButton(mobileButtons.left, "Left", false, false);
      setMobileButton(mobileButtons.right, "Right", false, false);
      return;
    }

    if (state.mode === "reward") {
      setMobileButton(mobileButtons.left, "Left", false, false);
      setMobileButton(mobileButtons.right, "Right", false, false);
      setMobileButton(mobileButtons.confirm, "Claim", state.rewardOptions.length > 0, true);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      setMobileButton(mobileButtons.double, "Double", false, false);
      mobileControls.classList.add("reward-claim-only");
      return;
    }

    if (state.mode === "shop") {
      const selectedItem = state.shopStock[state.selectionIndex];
      const relicAlreadyBought = state.shopStock.some((entry) => entry.type === "relic" && entry.sold);
      const relicLocked = Boolean(selectedItem && selectedItem.type === "relic" && relicAlreadyBought && !selectedItem.sold);
      const canBuy = Boolean(selectedItem && !selectedItem.sold && !relicLocked);
      setMobileButton(mobileButtons.left, "Prev", false, false);
      setMobileButton(mobileButtons.right, "Next", false, false);
      setMobileButton(mobileButtons.double, "Buy", canBuy, true);
      setMobileButton(mobileButtons.confirm, "Continue", true, true);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      return;
    }

    if (state.mode === "gameover" || state.mode === "victory") {
      setMobileButton(mobileButtons.confirm, "New Run", true, true);
      setMobileButton(mobileButtons.left, "Left", false, false);
      setMobileButton(mobileButtons.right, "Right", false, false);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      setMobileButton(mobileButtons.double, "Double", false, false);
    }
  }

  function handleMobileAction(action) {
    unlockAudio();
    if (action === "left") {
      if (state.mode === "menu") {
        if (hasSavedRun() && resumeSavedRun()) {
          saveRunSnapshot();
        }
      } else if (state.mode === "reward") {
        moveSelection(-1, state.rewardOptions.length);
      } else if (state.mode === "shop") {
        moveSelection(-1, state.shopStock.length);
      }
      return;
    }

    if (action === "right") {
      if (state.mode === "reward") {
        moveSelection(1, state.rewardOptions.length);
      } else if (state.mode === "shop") {
        moveSelection(1, state.shopStock.length);
      }
      return;
    }

    if (action === "hit" && state.mode === "playing") {
      hitAction();
      return;
    }

    if (action === "stand" && state.mode === "playing") {
      standAction();
      return;
    }

    if (action === "double") {
      if (state.mode === "playing") {
        doubleAction();
      } else if (state.mode === "shop") {
        buyShopItem();
      }
      return;
    }

    if (action === "confirm") {
      if (state.mode === "menu") {
        startRun();
      } else if (state.mode === "playing") {
        splitAction();
      } else if (state.mode === "reward") {
        claimReward();
      } else if (state.mode === "shop") {
        leaveShop();
      } else if (state.mode === "gameover" || state.mode === "victory") {
        startRun();
      }
    }
  }

  function canvasPointToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const y = ((clientY - rect.top) / rect.height) * HEIGHT;
    return { x, y };
  }

  function pointInRect(px, py, rect) {
    return (
      !!rect &&
      Number.isFinite(px) &&
      Number.isFinite(py) &&
      px >= rect.x &&
      px <= rect.x + rect.w &&
      py >= rect.y &&
      py <= rect.y + rect.h
    );
  }

  function pointInCircle(px, py, circle) {
    if (!circle || !Number.isFinite(px) || !Number.isFinite(py)) {
      return false;
    }
    const dx = px - circle.x;
    const dy = py - circle.y;
    return dx * dx + dy * dy <= circle.r * circle.r;
  }

  function handleRewardPointerTap(worldX, worldY) {
    if (state.mode !== "reward" || !state.rewardUi || !state.rewardOptions.length) {
      return false;
    }

    if (state.rewardUi.leftArrow && pointInCircle(worldX, worldY, state.rewardUi.leftArrow)) {
      moveSelection(-1, state.rewardOptions.length);
      state.rewardDragOffset = rewardCarouselLayout().spacing * 0.24;
      return true;
    }

    if (state.rewardUi.rightArrow && pointInCircle(worldX, worldY, state.rewardUi.rightArrow)) {
      moveSelection(1, state.rewardOptions.length);
      state.rewardDragOffset = -rewardCarouselLayout().spacing * 0.24;
      return true;
    }

    const cards = [...state.rewardUi.cards].sort((a, b) => Number(b.selected) - Number(a.selected));
    for (const card of cards) {
      if (!pointInRect(worldX, worldY, card)) {
        continue;
      }
      if (!card.selected) {
        const shift = carouselDelta(card.index, state.selectionIndex, state.rewardOptions.length);
        moveSelection(shift, state.rewardOptions.length);
        state.rewardDragOffset = -Math.sign(shift || 0) * rewardCarouselLayout().spacing * 0.18;
      }
      return true;
    }

    return false;
  }

  function handleShopPointerTap(worldX, worldY) {
    if (state.mode !== "shop" || !state.shopUi || !state.shopStock.length) {
      return false;
    }

    if (state.shopUi.leftArrow && pointInCircle(worldX, worldY, state.shopUi.leftArrow)) {
      moveSelection(-1, state.shopStock.length);
      state.shopDragOffset = rewardCarouselLayout().spacing * 0.24;
      return true;
    }

    if (state.shopUi.rightArrow && pointInCircle(worldX, worldY, state.shopUi.rightArrow)) {
      moveSelection(1, state.shopStock.length);
      state.shopDragOffset = -rewardCarouselLayout().spacing * 0.24;
      return true;
    }

    const cards = [...state.shopUi.cards].sort((a, b) => Number(b.selected) - Number(a.selected));
    for (const card of cards) {
      if (!pointInRect(worldX, worldY, card)) {
        continue;
      }
      if (!card.selected) {
        const shift = carouselDelta(card.index, state.selectionIndex, state.shopStock.length);
        moveSelection(shift, state.shopStock.length);
        state.shopDragOffset = -Math.sign(shift || 0) * rewardCarouselLayout().spacing * 0.18;
      }
      return true;
    }

    return false;
  }

  function onCanvasPointerDown(event) {
    unlockAudio();
    const carouselMode = state.mode === "reward" || state.mode === "shop" ? state.mode : null;
    if (!carouselMode) {
      state.rewardTouch = null;
      state.shopTouch = null;
      return;
    }
    const point = canvasPointToWorld(event.clientX, event.clientY);
    if (!point) {
      if (carouselMode === "reward") {
        state.rewardTouch = null;
      } else {
        state.shopTouch = null;
      }
      return;
    }

    const startOffset = carouselMode === "reward" ? state.rewardDragOffset || 0 : state.shopDragOffset || 0;
    const swipeEnabled = state.compactControls && event.pointerType !== "mouse";
    const touchState = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startOffset,
      dragX: startOffset,
      moved: false,
      swipeEnabled,
    };
    if (carouselMode === "reward") {
      state.rewardTouch = touchState;
      state.shopTouch = null;
    } else {
      state.shopTouch = touchState;
      state.rewardTouch = null;
    }

    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  }

  function onCanvasPointerMove(event) {
    const carouselMode = state.mode === "reward" || state.mode === "shop" ? state.mode : null;
    const touch = carouselMode === "reward" ? state.rewardTouch : carouselMode === "shop" ? state.shopTouch : null;
    if (!touch || touch.pointerId !== event.pointerId) {
      return;
    }
    const point = canvasPointToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const dx = point.x - touch.startX;
    const dy = point.y - touch.startY;
    if (touch.swipeEnabled) {
      const layout = rewardCarouselLayout();
      const maxDrag = layout.spacing * 1.35;
      const dragged = touch.startOffset + dx;
      touch.dragX = Math.max(-maxDrag, Math.min(maxDrag, dragged));
      event.preventDefault();
    }
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      touch.moved = true;
    }
  }

  function onCanvasPointerUp(event) {
    const carouselMode = state.mode === "reward" || state.mode === "shop" ? state.mode : null;
    const touch = carouselMode === "reward" ? state.rewardTouch : carouselMode === "shop" ? state.shopTouch : null;
    if (!touch || touch.pointerId !== event.pointerId) {
      return;
    }
    if (carouselMode === "reward") {
      state.rewardTouch = null;
    } else {
      state.shopTouch = null;
    }

    const point = canvasPointToWorld(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const dx = Number.isFinite(touch.dragX) ? touch.dragX : touch.startOffset + (point.x - touch.startX);
    const dy = point.y - touch.startY;
    const itemCount = carouselMode === "reward" ? state.rewardOptions.length : state.shopStock.length;
    const horizontalSwipe = touch.swipeEnabled && itemCount > 1 && Math.abs(dx) > Math.abs(dy) * 1.05;

    if (horizontalSwipe) {
      const spacing = rewardCarouselLayout().spacing;
      const shift = Math.round(-dx / Math.max(1, spacing));
      if (shift !== 0) {
        moveSelection(shift, itemCount);
      }
      if (carouselMode === "reward") {
        state.rewardDragOffset = dx + shift * spacing;
      } else {
        state.shopDragOffset = dx + shift * spacing;
      }
    } else {
      if (carouselMode === "reward") {
        state.rewardDragOffset = 0;
      } else {
        state.shopDragOffset = 0;
      }
    }

    const moved = touch.moved || Math.abs(dx) > 14;
    if (!moved) {
      if (carouselMode === "reward") {
        handleRewardPointerTap(point.x, point.y);
      } else {
        handleShopPointerTap(point.x, point.y);
      }
    }

    if (canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore release errors.
      }
    }
  }

  function onCanvasPointerCancel(event) {
    if (state.rewardTouch && state.rewardTouch.pointerId === event.pointerId) {
      state.rewardTouch = null;
      state.rewardDragOffset = 0;
    }
    if (state.shopTouch && state.shopTouch.pointerId === event.pointerId) {
      state.shopTouch = null;
      state.shopDragOffset = 0;
    }
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement && canvas.requestFullscreen) {
      await canvas.requestFullscreen();
      return;
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }

  function normalizeKey(raw) {
    if (raw === "Enter") {
      return "enter";
    }
    if (raw === " ") {
      return "space";
    }
    if (raw === "ArrowLeft") {
      return "left";
    }
    if (raw === "ArrowRight") {
      return "right";
    }
    if (raw === "ArrowUp") {
      return "up";
    }
    if (raw === "ArrowDown") {
      return "down";
    }
    if (raw.length === 1) {
      const low = raw.toLowerCase();
      if (low === "a" || low === "b" || low === "s" || low === "r" || low === "m") {
        return low;
      }
    }
    return null;
  }

  function onKeyDown(event) {
    if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      toggleFullscreen().catch(() => {});
      return;
    }
    if (event.key === "Escape" && document.fullscreenElement) {
      event.preventDefault();
      document.exitFullscreen().catch(() => {});
      return;
    }

    const key = normalizeKey(event.key);
    if (!key) {
      return;
    }

    event.preventDefault();
    unlockAudio();

    if (key === "m") {
      toggleAudio();
      return;
    }

    if (state.mode === "menu") {
      if (key === "enter" || key === "space") {
        startRun();
      } else if (key === "r") {
        if (resumeSavedRun()) {
          saveRunSnapshot();
        }
      }
      return;
    }

    if (state.mode === "playing") {
      if (key === "a") {
        hitAction();
      } else if (key === "b") {
        standAction();
      } else if (key === "s") {
        splitAction();
      } else if (key === "space") {
        doubleAction();
      }
      return;
    }

    if (state.mode === "reward") {
      if (key === "left") {
        moveSelection(-1, state.rewardOptions.length);
      } else if (key === "right") {
        moveSelection(1, state.rewardOptions.length);
      } else if (key === "enter" || key === "space") {
        claimReward();
      }
      return;
    }

    if (state.mode === "shop") {
      if (key === "left") {
        moveSelection(-1, state.shopStock.length);
      } else if (key === "right") {
        moveSelection(1, state.shopStock.length);
      } else if (key === "space") {
        buyShopItem();
      } else if (key === "enter") {
        leaveShop();
      }
      return;
    }

    if ((state.mode === "gameover" || state.mode === "victory") && (key === "enter" || key === "space")) {
      startRun();
    }
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

    if (state.mode !== "reward") {
      state.rewardUi = null;
      state.rewardTouch = null;
      state.rewardDragOffset = 0;
    } else if (!state.rewardTouch) {
      state.rewardDragOffset *= Math.max(0, 1 - dt * 10);
      if (Math.abs(state.rewardDragOffset) < 0.45) {
        state.rewardDragOffset = 0;
      }
    }

    if (state.mode !== "shop") {
      state.shopUi = null;
      state.shopTouch = null;
      state.shopDragOffset = 0;
    } else if (!state.shopTouch) {
      state.shopDragOffset *= Math.max(0, 1 - dt * 10);
      if (Math.abs(state.shopDragOffset) < 0.45) {
        state.shopDragOffset = 0;
      }
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

    if (state.mode === "playing" && state.encounter && state.encounter.phase === "resolve") {
      state.encounter.resolveTimer -= dt;
      if (state.encounter.resolveTimer <= 0) {
        state.encounter.handIndex += 1;
        if (!beginQueuedSplitHand(state.encounter)) {
          startHand();
        }
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function setFont(size, weight = 600, useDisplay = false) {
    const viewportWidth = Math.floor(
      window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || WIDTH
    );
    let mobileScale = 1;
    if (state.compactControls) {
      if (state.viewport?.portraitZoomed) {
        mobileScale = 0.82;
      } else if (viewportWidth <= 700) {
        mobileScale = 0.94;
      }
    }
    const tunedSize = Math.max(10, Math.round(size * mobileScale));
    ctx.font = `${weight} ${tunedSize}px ${useDisplay ? FONT_DISPLAY : FONT_UI}`;
  }

  function drawHealthBar(x, y, w, h, ratio, fillColor, label) {
    roundRect(x, y, w, h, 10);
    ctx.fillStyle = "rgba(9, 20, 32, 0.93)";
    ctx.fill();

    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.save();
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 18;
    roundRect(x + 2, y + 2, (w - 4) * clamped, h - 4, 8);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();

    const sheen = ctx.createLinearGradient(x, y, x, y + h);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.24)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    roundRect(x + 3, y + 3, w - 6, Math.max(4, h * 0.36), 6);
    ctx.fillStyle = sheen;
    ctx.fill();

    ctx.fillStyle = "#dce7f5";
    setFont(15, 600, false);
    ctx.textAlign = "left";
    ctx.fillText(label, x + 8, y + h - 8);
  }

  function drawBackground() {
    const pulse = Math.sin(state.worldTime * 0.32) * 0.5 + 0.5;
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, "#10233a");
    bg.addColorStop(0.52, "#081c30");
    bg.addColorStop(1, "#050c16");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const radial = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.56, 20, WIDTH * 0.5, HEIGHT * 0.56, HEIGHT * 0.58);
    radial.addColorStop(0, `rgba(56, 127, 180, ${0.2 + pulse * 0.12})`);
    radial.addColorStop(1, "rgba(3, 9, 14, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 6; i += 1) {
      const beamX = ((state.worldTime * 42 + i * 242) % (WIDTH + 380)) - 190;
      const beam = ctx.createLinearGradient(beamX, 0, beamX + 260, HEIGHT);
      beam.addColorStop(0, "rgba(120, 182, 220, 0)");
      beam.addColorStop(0.5, "rgba(120, 182, 220, 0.06)");
      beam.addColorStop(1, "rgba(120, 182, 220, 0)");
      ctx.fillStyle = beam;
      ctx.fillRect(beamX, 0, 260, HEIGHT);
    }

    ctx.strokeStyle = "rgba(120, 178, 214, 0.06)";
    ctx.lineWidth = 1;
    for (let y = 130; y < HEIGHT - 40; y += 56) {
      ctx.beginPath();
      ctx.moveTo(32, y + Math.sin(state.worldTime + y * 0.01) * 2.2);
      ctx.lineTo(WIDTH - 32, y);
      ctx.stroke();
    }

    for (const orb of AMBIENT_ORBS) {
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(183, 224, 255, ${orb.alpha})`;
      ctx.fill();
    }

    const vignette = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.5, HEIGHT * 0.15, WIDTH * 0.5, HEIGHT * 0.5, HEIGHT * 0.78);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(103, 168, 224, 0.12)";
    ctx.lineWidth = 2;
    roundRect(36, 86, WIDTH - 72, HEIGHT - 144, 24);
    ctx.stroke();

    ctx.strokeStyle = "rgba(166, 215, 245, 0.16)";
    ctx.lineWidth = 1;
    roundRect(40, 90, WIDTH - 80, HEIGHT - 152, 22);
    ctx.stroke();
  }

  function drawCard(x, y, card, hidden) {
    ctx.save();
    ctx.shadowColor = hidden ? "rgba(22, 55, 88, 0.38)" : "rgba(0, 0, 0, 0.38)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    roundRect(x, y, CARD_W, CARD_H, 12);

    if (hidden) {
      const hiddenGrad = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
      hiddenGrad.addColorStop(0, "#173456");
      hiddenGrad.addColorStop(1, "#0c1f36");
      ctx.fillStyle = hiddenGrad;
      ctx.fill();

      ctx.strokeStyle = "rgba(182, 220, 255, 0.5)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      for (let i = 0; i < 4; i += 1) {
        const px = x + 14 + i * 17;
        ctx.fillStyle = "rgba(205, 231, 255, 0.29)";
        ctx.fillRect(px, y + 14, 8, CARD_H - 28);
      }
      ctx.restore();
      return;
    }

    const cardGrad = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H);
    cardGrad.addColorStop(0, "#f8fdff");
    cardGrad.addColorStop(1, "#d6ebff");
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(69, 92, 120, 0.5)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    roundRect(x + 4, y + 4, CARD_W - 8, 20, 8);
    const shine = ctx.createLinearGradient(x, y + 4, x, y + 24);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shine;
    ctx.fill();

    const redSuit = card.suit === "H" || card.suit === "D";
    ctx.fillStyle = redSuit ? "#cf455a" : "#1f3550";
    setFont(25, 700, true);
    ctx.textAlign = "center";
    ctx.fillText(card.rank, x + CARD_W * 0.5, y + 48);

    setFont(22, 700, false);
    ctx.fillText(SUIT_SYMBOL[card.suit] || card.suit, x + CARD_W * 0.5, y + 82);
  }

  function visibleDealerTotal(encounter) {
    if (!encounter.hideDealerHole || encounter.phase !== "player") {
      return handTotal(encounter.dealerHand).total;
    }
    if (encounter.dealerHand.length === 0) {
      return 0;
    }
    return rankValue(encounter.dealerHand[0].rank);
  }

  function drawHand(hand, type, hideSecond) {
    const total = hand.length;
    for (let i = 0; i < total; i += 1) {
      const pos = handCardPosition(type, i, total);
      const animated = animatedCardPosition(hand[i], pos.x, pos.y);
      ctx.save();
      ctx.globalAlpha = animated.alpha;
      drawCard(animated.x, animated.y, hand[i], hideSecond && i === 1);
      ctx.restore();
    }
  }

  function drawEncounter() {
    if (!state.encounter || !state.run) {
      return;
    }

    const encounter = state.encounter;
    const enemy = encounter.enemy;
    const portraitShift = state.viewport?.portraitZoomed ? 44 : 0;

    ctx.textAlign = "center";
    ctx.fillStyle = enemy.color;
    setFont(53, 700, true);
    ctx.globalAlpha = 0.16;
    ctx.fillText(enemy.name, WIDTH * 0.5, 136 + portraitShift);
    ctx.globalAlpha = 1;
    setFont(36, 700, true);
    ctx.fillText(enemy.name, WIDTH * 0.5, 132 + portraitShift);

    ctx.fillStyle = "#cbe6ff";
    setFont(17, 600, false);
    ctx.fillText(`${enemy.type.toUpperCase()} ENCOUNTER`, WIDTH * 0.5, 156 + portraitShift);

    drawHand(encounter.dealerHand, "dealer", encounter.hideDealerHole && state.mode === "playing" && encounter.phase === "player");
    drawHand(encounter.playerHand, "player", false);

    const playerTotal = encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total;
    const dealerTotal = visibleDealerTotal(encounter);

    ctx.fillStyle = "#d7e7f8";
    setFont(22, 700, false);
    ctx.fillText(
      `Dealer: ${dealerTotal}${encounter.hideDealerHole && encounter.phase === "player" ? "+?" : ""}`,
      WIDTH * 0.5,
      342 + portraitShift
    );
    ctx.fillText(`You: ${playerTotal}`, WIDTH * 0.5, (state.viewport?.portraitZoomed ? 598 : 610) + portraitShift);

    if (encounter.splitUsed) {
      const splitIndex = encounter.splitQueue.length > 0 ? 1 : 2;
      ctx.fillStyle = "#a8c6df";
      setFont(15, 600, false);
      ctx.fillText(`Split hand ${splitIndex}/2`, WIDTH * 0.5, (state.viewport?.portraitZoomed ? 620 : 634) + portraitShift);
    }

  }

  function hudMetrics() {
    const cropWorldX = state.viewport?.cropWorldX || 0;
    const left = 42 + cropWorldX;
    const right = WIDTH - 42 - cropWorldX;
    const span = Math.max(220, right - left);
    const barW = Math.max(130, Math.min(340, Math.floor((span - 34) * 0.5)));
    return {
      left,
      right,
      span,
      barW,
      leftBarX: left,
      rightBarX: right - barW,
      portrait: Boolean(state.viewport?.portraitZoomed),
      logMaxWidth: Math.max(190, Math.min(560, Math.floor(span * 0.8))),
      passiveMaxWidth: Math.max(180, Math.min(580, Math.floor(span * 0.84))),
    };
  }

  function drawHud() {
    if (!state.run) {
      return;
    }

    const run = state.run;
    const enemy = state.encounter ? state.encounter.enemy : null;
    const hud = hudMetrics();

    if (hud.portrait) {
      drawHealthBar(
        hud.left,
        22,
        hud.span,
        26,
        run.player.maxHp > 0 ? run.player.hp / run.player.maxHp : 0,
        "#6fd5a8",
        `HP ${run.player.hp}/${run.player.maxHp}`
      );

      if (enemy) {
        drawHealthBar(
          hud.left,
          54,
          hud.span,
          22,
          enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0,
          "#ef8a73",
          `Enemy ${enemy.hp}/${enemy.maxHp}`
        );
      }

      ctx.textAlign = "left";
      ctx.fillStyle = "#dfedf9";
      setFont(20, 700, true);
      ctx.fillText(`Floor ${run.floor}/${run.maxFloor}  Room ${run.room}/${run.roomsPerFloor}`, hud.left + 2, 100);

      ctx.fillStyle = "#f4d88d";
      setFont(18, 700, false);
      ctx.fillText(`Chips: ${run.player.gold}`, hud.left + 2, 124);

      ctx.fillStyle = "#b7ddff";
      setFont(16, 700, false);
      ctx.fillText(`Streak: ${run.player.streak}  |  Guards: ${run.player.bustGuardsLeft}`, hud.left + 132, 124);
    } else {
      drawHealthBar(
        hud.leftBarX,
        24,
        hud.barW,
        30,
        run.player.maxHp > 0 ? run.player.hp / run.player.maxHp : 0,
        "#6fd5a8",
        `HP ${run.player.hp}/${run.player.maxHp}`
      );

      if (enemy) {
        drawHealthBar(
          hud.rightBarX,
          24,
          hud.barW,
          30,
          enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0,
          "#ef8a73",
          `Enemy HP ${enemy.hp}/${enemy.maxHp}`
        );
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#dfedf9";
      setFont(26, 700, true);
      ctx.fillText(`Floor ${run.floor}/${run.maxFloor}  Room ${run.room}/${run.roomsPerFloor}`, WIDTH * 0.5, 44);

      ctx.textAlign = "left";
      ctx.fillStyle = "#f4d88d";
      setFont(19, 700, false);
      ctx.save();
      ctx.shadowColor = "rgba(245, 207, 126, 0.28)";
      ctx.shadowBlur = 12;
      ctx.fillText(`Chips: ${run.player.gold}`, hud.left + 2, 72);
      ctx.restore();

      ctx.fillStyle = "#b7ddff";
      setFont(17, 700, false);
      ctx.fillText(`Streak: ${run.player.streak}`, hud.left + 166, 72);
      ctx.fillText(`Bust Guards: ${run.player.bustGuardsLeft}`, hud.left + 280, 72);
    }

    const passiveLine = passiveSummary(run);
    if (passiveLine) {
      ctx.fillStyle = "#9ec4e2";
      setFont(14, 600, false);
      const passiveText = fitText(`Passives: ${passiveLine}`, hud.passiveMaxWidth);
      ctx.fillText(passiveText, hud.left + 2, hud.portrait ? 142 : 94);
    }

    const relicEntries = Object.entries(run.player.relics).slice(0, 5);
    if (relicEntries.length > 0) {
      if (hud.portrait) {
        const relicTotal = Object.values(run.player.relics).reduce((sum, value) => sum + nonNegInt(value, 0), 0);
        ctx.textAlign = "left";
        ctx.fillStyle = "#9fc2de";
        setFont(14, 600, false);
        ctx.fillText(`Relics: ${relicTotal}`, hud.left + 2, 164);
      } else {
        ctx.textAlign = "right";
        ctx.fillStyle = "#9fc2de";
        setFont(14, 600, false);
        const lines = relicEntries.map(([id, count]) => {
          const relic = RELIC_BY_ID.get(id);
          return `${relic ? relic.name : id} x${count}`;
        });
        lines.forEach((line, idx) => {
          ctx.fillText(line, hud.right - 2, 92 + idx * 16);
        });
      }
    }

  }

  function carouselDelta(index, selected, length) {
    let delta = index - selected;
    const half = length * 0.5;
    if (delta > half) {
      delta -= length;
    } else if (delta < -half) {
      delta += length;
    }
    return delta;
  }

  function rewardCarouselLayout() {
    const compact = state.compactControls;
    const portrait = Boolean(state.viewport?.portraitZoomed);
    const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
    const visibleW = Math.max(portrait ? 320 : 760, WIDTH - cropX * 2);
    const panelW = portrait
      ? Math.max(336, Math.min(468, visibleW - 16))
      : Math.max(700, Math.min(compact ? 1080 : 980, visibleW - (compact ? 22 : 46)));
    const panelH = portrait ? 454 : compact ? 524 : 500;
    const panelX = WIDTH * 0.5 - panelW * 0.5;
    const panelY = portrait ? 114 : compact ? 106 : 116;
    const viewportPad = portrait ? 14 : compact ? 30 : 44;
    const viewportX = panelX + viewportPad;
    const viewportY = panelY + (portrait ? 132 : 160);
    const viewportW = panelW - viewportPad * 2;
    const viewportH = portrait ? 218 : compact ? 258 : 248;
    const mainW = portrait
      ? Math.round(Math.min(318, viewportW * 0.9))
      : Math.round(Math.min(compact ? 358 : 372, viewportW * 0.64));
    const mainH = portrait ? 198 : compact ? 240 : 248;
    const spacing = portrait
      ? Math.round(Math.min(206, viewportW * 0.56))
      : Math.round(Math.min(compact ? 244 : 270, viewportW * (compact ? 0.35 : 0.37)));
    const arrowRadius = portrait ? 20 : compact ? 34 : 30;
    const centerX = WIDTH * 0.5;
    const centerY = viewportY + viewportH * 0.5;
    const leftArrowX = portrait ? viewportX + 16 : centerX - (viewportW * 0.5 + (compact ? 38 : 44));
    const rightArrowX = portrait ? viewportX + viewportW - 16 : centerX + (viewportW * 0.5 + (compact ? 38 : 44));
    return {
      panelX,
      panelY,
      panelW,
      panelH,
      viewportX,
      viewportY,
      viewportW,
      viewportH,
      centerX,
      centerY,
      mainW,
      mainH,
      spacing,
      sideScale: portrait ? 0.72 : compact ? 0.82 : 0.84,
      farScale: portrait ? 0.58 : compact ? 0.67 : 0.69,
      arrowRadius,
      leftArrowX,
      rightArrowX,
      arrowY: centerY,
      indicatorY: panelY + panelH - (portrait ? 24 : 34),
    };
  }

  function buildCarouselCards(items, selected, dragSteps, layout) {
    return items
      .map((payload, idx) => {
        const delta = carouselDelta(idx, selected, items.length) + dragSteps;
        const abs = Math.abs(delta);
        if (abs > 2) {
          return null;
        }
        const sideT = Math.max(0, Math.min(1, abs));
        const farT = Math.max(0, Math.min(1, abs - 1));
        const scale = abs <= 1 ? lerp(1, layout.sideScale, sideT) : lerp(layout.sideScale, layout.farScale, farT);
        const w = Math.floor(layout.mainW * scale);
        const h = Math.floor(layout.mainH * scale);
        const x = Math.floor(layout.centerX + delta * layout.spacing - w * 0.5);
        const yShift = abs <= 1 ? lerp(0, 26, sideT) : lerp(26, 38, farT);
        const y = Math.floor(layout.centerY - h * 0.5 + yShift);
        return {
          idx,
          payload,
          delta,
          selected: idx === selected,
          x,
          y,
          w,
          h,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  function drawRewardCarouselArrow(x, y, radius, symbol, enabled) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = enabled ? "rgba(18, 40, 58, 0.92)" : "rgba(18, 40, 58, 0.52)";
    ctx.fill();
    ctx.strokeStyle = enabled ? "rgba(196, 226, 246, 0.5)" : "rgba(130, 151, 170, 0.24)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (enabled) {
      const pulse = 0.28 + Math.sin(state.worldTime * 6.2) * 0.08;
      ctx.beginPath();
      ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(138, 193, 231, ${pulse})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = enabled ? "#e8f5ff" : "rgba(171, 194, 216, 0.65)";
    setFont(28, 700, false);
    ctx.fillText(symbol, x, y + 10);
    ctx.restore();
  }

  function drawRewardScreen() {
    if (state.mode !== "reward" || !state.rewardOptions.length) {
      state.rewardUi = null;
      return;
    }

    const layout = rewardCarouselLayout();
    const total = state.rewardOptions.length;
    const selected = state.selectionIndex;
    const dragPx =
      state.mode === "reward" &&
      state.rewardTouch &&
      state.rewardTouch.swipeEnabled &&
      Number.isFinite(state.rewardTouch.dragX)
        ? state.rewardTouch.dragX
        : state.rewardDragOffset || 0;
    const dragSteps = dragPx / layout.spacing;

    ctx.fillStyle = "rgba(5, 10, 16, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    roundRect(layout.panelX, layout.panelY, layout.panelW, layout.panelH, 26);
    const panelFill = ctx.createLinearGradient(layout.panelX, layout.panelY, layout.panelX, layout.panelY + layout.panelH);
    panelFill.addColorStop(0, "rgba(18, 33, 48, 0.97)");
    panelFill.addColorStop(1, "rgba(11, 24, 36, 0.95)");
    ctx.fillStyle = panelFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 206, 234, 0.34)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.textAlign = "center";
    const portrait = Boolean(state.viewport?.portraitZoomed);
    ctx.fillStyle = "#f6e6a6";
    setFont(portrait ? 34 : 40, 700, true);
    ctx.fillText("Relic Draft", WIDTH * 0.5, layout.panelY + 48);

    ctx.fillStyle = "#97bddb";
    setFont(portrait ? 14 : 15, 600, false);
    ctx.fillText("Relics are passive and activate immediately.", WIDTH * 0.5, layout.panelY + 90);

    roundRect(layout.viewportX, layout.viewportY, layout.viewportW, layout.viewportH, 20);
    ctx.fillStyle = "rgba(8, 18, 29, 0.76)";
    ctx.fill();
    ctx.strokeStyle = "rgba(138, 182, 213, 0.25)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.save();
    roundRect(layout.viewportX, layout.viewportY, layout.viewportW, layout.viewportH, 20);
    ctx.clip();

    const renderCards = buildCarouselCards(state.rewardOptions, selected, dragSteps, layout);

    renderCards.forEach((card) => {
      const relic = card.payload;
      const radius = Math.max(12, Math.floor(18 * (card.w / layout.mainW)));
      ctx.save();
      if (card.selected) {
        ctx.shadowColor = "rgba(6, 12, 19, 0.84)";
        ctx.shadowBlur = state.compactControls ? 38 : 34;
        ctx.shadowOffsetY = 10;
      }
      roundRect(card.x, card.y, card.w, card.h, radius);
      ctx.fillStyle = card.selected ? "rgba(24, 43, 62, 0.95)" : "rgba(17, 30, 44, 0.92)";
      ctx.fill();

      ctx.strokeStyle = card.selected ? relic.color : "rgba(145, 186, 220, 0.35)";
      ctx.lineWidth = card.selected ? 3 : 1.2;
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (card.selected) {
        const shimmerX = card.x - 70 + ((state.worldTime * 280) % (card.w + 140));
        const shimmer = ctx.createLinearGradient(shimmerX, card.y, shimmerX + 110, card.y + card.h);
        shimmer.addColorStop(0, "rgba(255,255,255,0)");
        shimmer.addColorStop(0.5, "rgba(255,255,255,0.14)");
        shimmer.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shimmer;
        roundRect(card.x + 3, card.y + 3, card.w - 6, card.h - 6, Math.max(10, radius - 2));
        ctx.fill();
      }

      ctx.fillStyle = relic.color;
      setFont(card.selected ? (portrait ? 28 : 33) : portrait ? 20 : 24, 700, true);
      ctx.fillText(relic.name, card.x + card.w * 0.5, card.y + (card.selected ? 60 : 48));

      ctx.fillStyle = "#d0e4f5";
      if (card.selected) {
        setFont(portrait ? 16 : 18, 600, false);
        wrapText(passiveDescription(relic.description), card.x + 24, card.y + (portrait ? 106 : 120), card.w - 48, portrait ? 20 : 24, "center");
      } else {
        setFont(portrait ? 13 : 15, 600, false);
        ctx.fillText("Tap to select", card.x + card.w * 0.5, card.y + card.h - 34);
      }

      ctx.restore();
    });

    const edgeFadeW = Math.min(120, layout.viewportW * 0.16);
    const edgeFadeAlpha = state.compactControls ? 0.44 : 0.56;
    const leftFade = ctx.createLinearGradient(layout.viewportX, 0, layout.viewportX + edgeFadeW, 0);
    leftFade.addColorStop(0, `rgba(8, 18, 29, ${edgeFadeAlpha})`);
    leftFade.addColorStop(1, "rgba(8, 18, 29, 0)");
    ctx.fillStyle = leftFade;
    ctx.fillRect(layout.viewportX, layout.viewportY, edgeFadeW, layout.viewportH);

    const rightFade = ctx.createLinearGradient(layout.viewportX + layout.viewportW - edgeFadeW, 0, layout.viewportX + layout.viewportW, 0);
    rightFade.addColorStop(0, "rgba(8, 18, 29, 0)");
    rightFade.addColorStop(1, `rgba(8, 18, 29, ${edgeFadeAlpha})`);
    ctx.fillStyle = rightFade;
    ctx.fillRect(layout.viewportX + layout.viewportW - edgeFadeW, layout.viewportY, edgeFadeW, layout.viewportH);
    ctx.restore();

    const canScroll = state.rewardOptions.length > 1;
    drawRewardCarouselArrow(layout.leftArrowX, layout.arrowY, layout.arrowRadius, "◀", canScroll);
    drawRewardCarouselArrow(layout.rightArrowX, layout.arrowY, layout.arrowRadius, "▶", canScroll);

    const indicatorY = layout.indicatorY;
    const dotGap = 22;
    const startDotX = layout.centerX - (Math.max(0, total - 1) * dotGap) * 0.5;
    for (let i = 0; i < total; i += 1) {
      const selectedDot = i === selected;
      const radius = selectedDot ? 6 : 4;
      ctx.beginPath();
      ctx.arc(startDotX + i * dotGap, indicatorY, radius, 0, Math.PI * 2);
      ctx.fillStyle = selectedDot ? "#f2cf91" : "rgba(156, 188, 215, 0.46)";
      ctx.fill();
    }

    state.rewardUi = {
      cards: renderCards.map((card) => ({
        index: card.idx,
        selected: card.selected,
        x: card.x,
        y: card.y,
        w: card.w,
        h: card.h,
      })),
      leftArrow: canScroll
        ? { x: layout.leftArrowX, y: layout.arrowY, r: layout.arrowRadius }
        : null,
      rightArrow: canScroll
        ? { x: layout.rightArrowX, y: layout.arrowY, r: layout.arrowRadius }
        : null,
    };
  }

  function shopItemName(item) {
    if (item.type === "relic") {
      return item.relic.name;
    }
    return item.name;
  }

  function shopItemDescription(item) {
    if (item.type === "relic") {
      return passiveDescription(item.relic.description);
    }
    return item.description;
  }

  function drawShopScreen() {
    if (state.mode !== "shop" || !state.shopStock.length) {
      state.shopUi = null;
      return;
    }

    const layout = rewardCarouselLayout();
    const total = state.shopStock.length;
    const selected = state.selectionIndex;
    const dragPx =
      state.mode === "shop" &&
      state.shopTouch &&
      state.shopTouch.swipeEnabled &&
      Number.isFinite(state.shopTouch.dragX)
        ? state.shopTouch.dragX
        : state.shopDragOffset || 0;
    const dragSteps = dragPx / layout.spacing;

    ctx.fillStyle = "rgba(5, 10, 16, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    roundRect(layout.panelX, layout.panelY, layout.panelW, layout.panelH, 26);
    const panelFill = ctx.createLinearGradient(layout.panelX, layout.panelY, layout.panelX, layout.panelY + layout.panelH);
    panelFill.addColorStop(0, "rgba(18, 33, 48, 0.97)");
    panelFill.addColorStop(1, "rgba(11, 24, 36, 0.95)");
    ctx.fillStyle = panelFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 206, 234, 0.34)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.textAlign = "center";
    const portrait = Boolean(state.viewport?.portraitZoomed);
    ctx.fillStyle = "#f2c587";
    setFont(portrait ? 34 : 40, 700, true);
    ctx.fillText("Black Market", WIDTH * 0.5, layout.panelY + 48);

    ctx.fillStyle = "#97bddb";
    setFont(portrait ? 14 : 15, 600, false);
    ctx.fillText("Buy once to activate immediately.", WIDTH * 0.5, layout.panelY + 90);

    roundRect(layout.viewportX, layout.viewportY, layout.viewportW, layout.viewportH, 20);
    ctx.fillStyle = "rgba(8, 18, 29, 0.76)";
    ctx.fill();
    ctx.strokeStyle = "rgba(138, 182, 213, 0.25)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.save();
    roundRect(layout.viewportX, layout.viewportY, layout.viewportW, layout.viewportH, 20);
    ctx.clip();

    const renderCards = buildCarouselCards(state.shopStock, selected, dragSteps, layout);
    renderCards.forEach((card) => {
      const item = card.payload;
      const radius = Math.max(12, Math.floor(18 * (card.w / layout.mainW)));
      ctx.save();
      if (card.selected) {
        ctx.shadowColor = "rgba(6, 12, 19, 0.84)";
        ctx.shadowBlur = state.compactControls ? 38 : 34;
        ctx.shadowOffsetY = 10;
      }
      roundRect(card.x, card.y, card.w, card.h, radius);
      ctx.fillStyle = item.sold ? "rgba(34, 36, 40, 0.92)" : card.selected ? "rgba(35, 51, 60, 0.95)" : "rgba(20, 31, 38, 0.9)";
      ctx.fill();

      ctx.strokeStyle = item.sold ? "rgba(112, 120, 132, 0.35)" : card.selected ? "#ffd08f" : "rgba(152, 186, 208, 0.35)";
      ctx.lineWidth = card.selected ? 3 : 1.2;
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (card.selected && !item.sold) {
        const pulse = 0.4 + Math.sin(state.worldTime * 5.5) * 0.14;
        ctx.strokeStyle = `rgba(248, 211, 131, ${pulse})`;
        ctx.lineWidth = 1.2;
        roundRect(card.x + 6, card.y + 6, card.w - 12, card.h - 12, Math.max(10, radius - 4));
        ctx.stroke();
      }

      ctx.fillStyle = item.sold ? "#8f9aa7" : "#f4e1aa";
      setFont(card.selected ? (portrait ? 28 : 33) : portrait ? 20 : 24, 700, true);
      ctx.fillText(shopItemName(item), card.x + card.w * 0.5, card.y + (card.selected ? 60 : 48));

      ctx.fillStyle = item.sold ? "#78818d" : "#d4e6f4";
      if (card.selected) {
        setFont(portrait ? 16 : 18, 600, false);
        wrapText(shopItemDescription(item), card.x + 24, card.y + (portrait ? 106 : 118), card.w - 48, portrait ? 20 : 24, "center");
      } else {
        setFont(portrait ? 13 : 15, 600, false);
        ctx.fillText(item.sold ? "Sold out" : "Tap to select", card.x + card.w * 0.5, card.y + card.h - 62);
      }

      ctx.fillStyle = item.sold ? "#9ca5af" : "#ffd58f";
      setFont(card.selected ? (portrait ? 22 : 24) : portrait ? 18 : 20, 700, false);
      ctx.fillText(item.sold ? "SOLD" : `${item.cost} chips`, card.x + card.w * 0.5, card.y + card.h - 28);

      ctx.restore();
    });

    const edgeFadeW = Math.min(120, layout.viewportW * 0.16);
    const edgeFadeAlpha = state.compactControls ? 0.44 : 0.56;
    const leftFade = ctx.createLinearGradient(layout.viewportX, 0, layout.viewportX + edgeFadeW, 0);
    leftFade.addColorStop(0, `rgba(8, 18, 29, ${edgeFadeAlpha})`);
    leftFade.addColorStop(1, "rgba(8, 18, 29, 0)");
    ctx.fillStyle = leftFade;
    ctx.fillRect(layout.viewportX, layout.viewportY, edgeFadeW, layout.viewportH);

    const rightFade = ctx.createLinearGradient(layout.viewportX + layout.viewportW - edgeFadeW, 0, layout.viewportX + layout.viewportW, 0);
    rightFade.addColorStop(0, "rgba(8, 18, 29, 0)");
    rightFade.addColorStop(1, `rgba(8, 18, 29, ${edgeFadeAlpha})`);
    ctx.fillStyle = rightFade;
    ctx.fillRect(layout.viewportX + layout.viewportW - edgeFadeW, layout.viewportY, edgeFadeW, layout.viewportH);
    ctx.restore();

    const canScroll = state.shopStock.length > 1;
    drawRewardCarouselArrow(layout.leftArrowX, layout.arrowY, layout.arrowRadius, "◀", canScroll);
    drawRewardCarouselArrow(layout.rightArrowX, layout.arrowY, layout.arrowRadius, "▶", canScroll);

    const indicatorY = layout.indicatorY;
    const dotGap = 22;
    const startDotX = layout.centerX - (Math.max(0, total - 1) * dotGap) * 0.5;
    for (let i = 0; i < total; i += 1) {
      const selectedDot = i === selected;
      const radius = selectedDot ? 6 : 4;
      ctx.beginPath();
      ctx.arc(startDotX + i * dotGap, indicatorY, radius, 0, Math.PI * 2);
      ctx.fillStyle = selectedDot ? "#f2cf91" : "rgba(156, 188, 215, 0.46)";
      ctx.fill();
    }

    state.shopUi = {
      cards: renderCards.map((card) => ({
        index: card.idx,
        selected: card.selected,
        x: card.x,
        y: card.y,
        w: card.w,
        h: card.h,
      })),
      leftArrow: canScroll
        ? { x: layout.leftArrowX, y: layout.arrowY, r: layout.arrowRadius }
        : null,
      rightArrow: canScroll
        ? { x: layout.rightArrowX, y: layout.arrowY, r: layout.arrowRadius }
        : null,
    };
  }

  function drawEndOverlay(title, subtitle, prompt) {
    ctx.fillStyle = "rgba(5, 10, 16, 0.78)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    roundRect(WIDTH * 0.5 - 390, 160, 780, 400, 24);
    ctx.fillStyle = "rgba(14, 28, 42, 0.95)";
    ctx.fill();

    ctx.strokeStyle = "rgba(178, 216, 245, 0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#f4e3b7";
    setFont(56, 700, true);
    ctx.fillText(title, WIDTH * 0.5, 248);

    ctx.fillStyle = "#c0d9ec";
    setFont(22, 600, false);
    ctx.fillText(subtitle, WIDTH * 0.5, 292);

    if (state.run) {
      const run = state.run;
      const stats = [
        `Floor reached: ${run.floor}/${run.maxFloor}`,
        `Enemies defeated: ${run.enemiesDefeated}`,
        `Hands played: ${run.totalHands}`,
        `Total damage dealt: ${run.player.totalDamageDealt}`,
        `Total damage taken: ${run.player.totalDamageTaken}`,
        `Chips banked: ${run.player.gold}`,
      ];

      ctx.fillStyle = "#dbe9f7";
      setFont(20, 600, false);
      stats.forEach((line, idx) => {
        ctx.fillText(line, WIDTH * 0.5, 344 + idx * 34);
      });
    }

    ctx.fillStyle = "#f8d37b";
    setFont(23, 700, false);
    ctx.fillText(prompt, WIDTH * 0.5, 530);
  }

  function drawImageCover(image, x, y, w, h, focusX = 0.5, focusY = 0.34) {
    const imageW = Number(image?.naturalWidth);
    const imageH = Number(image?.naturalHeight);
    if (!Number.isFinite(imageW) || !Number.isFinite(imageH) || imageW <= 0 || imageH <= 0) {
      return false;
    }

    const destAspect = w / h;
    const sourceAspect = imageW / imageH;
    let srcW = imageW;
    let srcH = imageH;
    if (sourceAspect > destAspect) {
      srcW = imageH * destAspect;
    } else {
      srcH = imageW / destAspect;
    }

    const maxX = Math.max(0, imageW - srcW);
    const maxY = Math.max(0, imageH - srcH);
    const srcX = clampNumber(maxX * focusX, 0, maxX, maxX * 0.5);
    const srcY = clampNumber(maxY * focusY, 0, maxY, maxY * 0.5);
    ctx.drawImage(image, srcX, srcY, srcW, srcH, x, y, w, h);
    return true;
  }

  function drawMenu() {
    const resumeReady = hasSavedRun();
    const compact = state.compactControls;
    if (compact) {
      const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
      const leftBound = cropX + 10;
      const rightBound = WIDTH - cropX - 10;
      const visibleW = Math.max(260, rightBound - leftBound);
      const centerX = (leftBound + rightBound) * 0.5;
      const panelW = Math.min(430, visibleW);
      const panelX = centerX - panelW * 0.5;
      const panelY = 18;

      const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bg.addColorStop(0, "#081420");
      bg.addColorStop(1, "#040b12");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const artDrawn = drawImageCover(menuArtImage, 0, 0, WIDTH, HEIGHT, 0.5, 0.28);
      const darken = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      darken.addColorStop(0, artDrawn ? "rgba(5, 10, 18, 0.38)" : "rgba(5, 10, 18, 0.2)");
      darken.addColorStop(0.55, "rgba(5, 10, 18, 0.7)");
      darken.addColorStop(1, "rgba(5, 10, 18, 0.9)");
      ctx.fillStyle = darken;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const panelPad = 20;
      const subtitle = "Roguelike deck duels where each hand hits like combat.";
      const profileLine = state.profile
        ? `Lifetime: ${state.profile.totals.runsStarted} runs | ${state.profile.totals.runsWon} wins | ${state.profile.totals.enemiesDefeated} enemies`
        : "";
      const prompt = resumeReady ? "Tap New Run or Resume below." : "Tap New Run below to begin.";

      setFont(18, 600, false);
      const subtitleLines = wrappedLines(subtitle, panelW - panelPad * 2);
      setFont(23, 700, false);
      const promptLines = wrappedLines(prompt, panelW - panelPad * 2);
      const panelH = Math.max(208, 100 + subtitleLines.length * 18 + promptLines.length * 22 + (profileLine ? 26 : 0));
      roundRect(panelX, panelY, panelW, panelH, 20);
      const panelFill = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
      panelFill.addColorStop(0, "rgba(11, 28, 43, 0.82)");
      panelFill.addColorStop(1, "rgba(7, 19, 30, 0.9)");
      ctx.fillStyle = panelFill;
      ctx.fill();
      ctx.strokeStyle = "rgba(178, 216, 245, 0.32)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#f3d193";
      setFont(34, 700, true);
      ctx.fillText(fitText("BLACKJACK ABYSS", panelW - 26), centerX, panelY + 52);

      ctx.fillStyle = "#d7e6f4";
      setFont(18, 600, false);
      let y = panelY + 84;
      wrapText(subtitle, panelX + panelPad, y, panelW - panelPad * 2, 18, "center");
      y += subtitleLines.length * 18 + 8;

      if (profileLine) {
        ctx.fillStyle = "#a6c8e2";
        setFont(14, 600, false);
        ctx.fillText(fitText(profileLine, panelW - panelPad * 2), centerX, y);
        y += 24;
      }

      ctx.fillStyle = "#f2cf91";
      setFont(23, 700, false);
      wrapText(prompt, panelX + panelPad, y, panelW - panelPad * 2, 22, "center");
      return;
    }

    const sideMargin = Math.max(88, Math.min(220, WIDTH * 0.17));
    const art = compact
      ? { x: 0, y: 0, w: WIDTH, h: HEIGHT, radius: 0 }
      : { x: sideMargin, y: 0, w: WIDTH - sideMargin * 2, h: HEIGHT, radius: 24 };

    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, "#081420");
    bg.addColorStop(1, "#040b12");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    let artDrawn = false;
    ctx.save();
    if (art.radius > 0) {
      roundRect(art.x, art.y, art.w, art.h, art.radius);
      ctx.clip();
    }
    artDrawn = drawImageCover(menuArtImage, art.x, art.y, art.w, art.h, 0.5, compact ? 0.3 : 0.34);
    ctx.restore();

    if (!artDrawn) {
      const glow = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.36, 24, WIDTH * 0.5, HEIGHT * 0.36, HEIGHT * 0.62);
      glow.addColorStop(0, "rgba(247, 184, 109, 0.28)");
      glow.addColorStop(1, "rgba(247, 184, 109, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } else if (art.radius > 0) {
      ctx.strokeStyle = "rgba(190, 223, 246, 0.4)";
      ctx.lineWidth = 1.6;
      roundRect(art.x, art.y, art.w, art.h, art.radius);
      ctx.stroke();
    }

    ctx.save();
    if (art.radius > 0) {
      roundRect(art.x, art.y, art.w, art.h, art.radius);
      ctx.clip();
    }
    const fadeTop = art.y + art.h * (compact ? 0.44 : 0.4);
    const shadowFade = ctx.createLinearGradient(0, fadeTop, 0, art.y + art.h);
    shadowFade.addColorStop(0, "rgba(4, 9, 15, 0)");
    shadowFade.addColorStop(1, "rgba(4, 9, 15, 0.88)");
    ctx.fillStyle = shadowFade;
    ctx.fillRect(art.x, fadeTop, art.w, art.h - (fadeTop - art.y));
    ctx.restore();

    const panelW = Math.max(340, Math.min(compact ? WIDTH - 34 : 860, art.w - (compact ? 24 : 86)));
    const panelPad = compact ? 22 : 30;
    const subtitle = "Roguelike deck duels where each hand hits like combat.";
    const prompt = resumeReady ? "Tap New Run below, or Resume to continue your save." : "Tap New Run below to begin your descent.";
    const subtitleLineH = compact ? 24 : 28;
    const promptLineH = compact ? 22 : 26;

    setFont(compact ? 18 : 22, 600, false);
    const subtitleLines = wrappedLines(subtitle, panelW - panelPad * 2);
    setFont(compact ? 18 : 22, 700, false);
    const promptLines = wrappedLines(prompt, panelW - panelPad * 2);

    const profileLine = state.profile
      ? `Lifetime: ${state.profile.totals.runsStarted} runs | ${state.profile.totals.runsWon} wins | ${state.profile.totals.enemiesDefeated} enemies`
      : "";
    const panelH = Math.max(
      compact ? 196 : 208,
      108 + subtitleLines.length * subtitleLineH + promptLines.length * promptLineH + (profileLine ? (compact ? 28 : 32) : 0)
    );
    const panelX = WIDTH * 0.5 - panelW * 0.5;
    const safeBottom = compact ? 152 : 86;
    const panelY = Math.max(HEIGHT * 0.5, HEIGHT - safeBottom - panelH);

    roundRect(panelX, panelY, panelW, panelH, compact ? 20 : 22);
    const panelFill = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelFill.addColorStop(0, "rgba(13, 27, 41, 0.78)");
    panelFill.addColorStop(1, "rgba(8, 18, 29, 0.9)");
    ctx.fillStyle = panelFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(178, 216, 245, 0.33)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#f3d193";
    setFont(compact ? 45 : 72, 700, true);
    ctx.fillText("BLACKJACK ABYSS", WIDTH * 0.5, panelY + (compact ? 58 : 72));

    let cursorY = panelY + (compact ? 94 : 122);
    ctx.fillStyle = "#d7e6f4";
    setFont(compact ? 18 : 22, 600, false);
    wrapText(subtitle, panelX + panelPad, cursorY, panelW - panelPad * 2, subtitleLineH, "center");
    cursorY += subtitleLines.length * subtitleLineH + 10;

    if (profileLine) {
      ctx.fillStyle = "#a6c8e2";
      setFont(compact ? 14 : 17, 600, false);
      wrapText(profileLine, panelX + panelPad, cursorY, panelW - panelPad * 2, compact ? 20 : 22, "center");
      cursorY += compact ? 24 : 28;
    }

    ctx.fillStyle = "#f2cf91";
    setFont(compact ? 18 : 22, 700, false);
    wrapText(prompt, panelX + panelPad, cursorY, panelW - panelPad * 2, promptLineH, "center");
  }

  function wrapText(text, x, y, maxWidth, lineHeight, align) {
    const words = text.split(" ");
    let line = "";
    let drawY = y;
    ctx.textAlign = align === "center" ? "center" : "left";

    for (let i = 0; i < words.length; i += 1) {
      const candidate = line.length === 0 ? words[i] : `${line} ${words[i]}`;
      const measure = ctx.measureText(candidate).width;
      if (measure > maxWidth && line.length > 0) {
        ctx.fillText(line, align === "center" ? x + maxWidth * 0.5 : x, drawY);
        line = words[i];
        drawY += lineHeight;
      } else {
        line = candidate;
      }
    }

    if (line.length > 0) {
      ctx.fillText(line, align === "center" ? x + maxWidth * 0.5 : x, drawY);
    }
  }

  function wrappedLines(text, maxWidth) {
    const source = typeof text === "string" ? text : "";
    if (!source) {
      return [""];
    }
    const words = source.split(" ");
    const lines = [];
    let line = "";
    for (let i = 0; i < words.length; i += 1) {
      const candidate = line.length === 0 ? words[i] : `${line} ${words[i]}`;
      if (line.length > 0 && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = words[i];
      } else {
        line = candidate;
      }
    }
    if (line.length > 0) {
      lines.push(line);
    }
    return lines;
  }

  function fitText(text, maxWidth) {
    if (!text || ctx.measureText(text).width <= maxWidth) {
      return text || "";
    }
    let out = text;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}…`;
  }

  function announcementAnchor() {
    const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
    const leftBound = 24 + cropX;
    const rightBound = WIDTH - 24 - cropX;
    const centerX = (leftBound + rightBound) * 0.5;

    if (state.encounter) {
      const dealerBottom = handCardPosition("dealer", 0, 1).y + CARD_H;
      const playerTop = handCardPosition("player", 0, 1).y;
      const gapCenter = dealerBottom + (playerTop - dealerBottom) * 0.5;
      const topPad = state.viewport?.portraitZoomed ? 170 : 140;
      const bottomPad = state.viewport?.portraitZoomed ? HEIGHT - 170 : HEIGHT - 120;
      return {
        centerX,
        centerY: clampNumber(gapCenter, topPad, bottomPad, gapCenter),
      };
    }

    return {
      centerX,
      centerY: state.viewport?.portraitZoomed ? 220 : 150,
    };
  }

  function drawEffects() {
    for (const burst of state.cardBursts) {
      const t = burst.life / burst.maxLife;
      const radius = 10 + (1 - t) * 34;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `${burst.color}${Math.floor(255 * t)
        .toString(16)
        .padStart(2, "0")}`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const spark of state.sparkParticles) {
      const alpha = Math.max(0, Math.min(1, spark.life / spark.maxLife));
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size * (0.45 + alpha), 0, Math.PI * 2);
      ctx.fillStyle = applyAlpha(spark.color, alpha * 0.9);
      ctx.fill();
    }

    ctx.textAlign = "center";
    setFont(26, 700, true);
    for (const f of state.floatingTexts) {
      const alpha = Math.max(0, Math.min(1, f.life / f.maxLife));
      ctx.fillStyle = applyAlpha(f.color, alpha);
      ctx.fillText(f.text, f.x, f.y);
    }

    if (state.announcementTimer > 0 && state.announcement) {
      const duration = Math.max(0.25, state.announcementDuration || state.announcementTimer || 1.4);
      const progress = Math.max(0, Math.min(1, 1 - state.announcementTimer / duration));
      const intro = Math.max(0, Math.min(1, progress / 0.24));
      const settle = Math.max(0, Math.min(1, (progress - 0.24) / 0.18));
      const fade = progress > 0.74 ? 1 - (progress - 0.74) / 0.26 : 1;
      const scale = progress < 0.24 ? 0.68 + easeOutBack(intro) * 0.54 : 1.12 - settle * 0.14;
      const alpha = Math.max(0, Math.min(1, (0.2 + intro * 0.8) * fade));
      const anchor = announcementAnchor();
      const centerX = anchor.centerX;
      const centerY = anchor.centerY;
      const compactToast =
        state.compactControls &&
        (state.mode === "playing" || state.mode === "reward" || state.mode === "shop");

      if (compactToast) {
        const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
        const visibleW = Math.max(260, WIDTH - cropX * 2);
        const maxW = Math.max(210, Math.min(450, visibleW - 24));
        setFont(24, 700, true);
        const lines = wrappedLines(state.announcement, maxW - 36).slice(0, 2);
        const lineHeight = 24;
        const panelW = Math.max(220, Math.min(maxW, Math.max(...lines.map((line) => ctx.measureText(line).width)) + 44));
        const panelH = Math.max(48, 20 + lines.length * lineHeight);
        const toastY = state.viewport?.portraitZoomed ? 186 : 136;
        ctx.save();
        ctx.globalAlpha = alpha;
        roundRect(centerX - panelW * 0.5, toastY - panelH * 0.5, panelW, panelH, 13);
        const panel = ctx.createLinearGradient(0, toastY - panelH * 0.5, 0, toastY + panelH * 0.5);
        panel.addColorStop(0, "rgba(25, 44, 62, 0.96)");
        panel.addColorStop(1, "rgba(14, 27, 40, 0.94)");
        ctx.fillStyle = panel;
        ctx.fill();
        ctx.strokeStyle = "rgba(242, 210, 132, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 241, 198, 0.95)";
        ctx.textAlign = "center";
        setFont(24, 700, true);
        lines.forEach((line, idx) => {
          const y = toastY - ((lines.length - 1) * lineHeight) * 0.5 + idx * lineHeight + 8;
          ctx.fillText(line, centerX, y);
        });
        ctx.restore();
        return;
      }

      const ringExpand = easeOutCubic(Math.min(1, progress / 0.45));
      const ringRadius = 72 + ringExpand * 210;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(248, 214, 132, ${0.34 * (1 - Math.min(1, progress / 0.65))})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI * 2 * i) / 10 + state.worldTime * 0.35;
        const inner = 40 + ringExpand * 26;
        const outer = inner + 16 + ringExpand * 26;
        const x1 = centerX + Math.cos(angle) * inner;
        const y1 = centerY + Math.sin(angle) * inner;
        const x2 = centerX + Math.cos(angle) * outer;
        const y2 = centerY + Math.sin(angle) * outer;
        ctx.strokeStyle = `rgba(244, 205, 118, ${0.18 * fade})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      setFont(30, 700, true);
      const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
      const visibleW = Math.max(420, WIDTH - cropX * 2);
      const messageMaxW = Math.max(260, Math.min(720, visibleW - 110));
      const lines = wrappedLines(state.announcement, messageMaxW - 80);
      const lineHeight = 30;
      const messageWidth = Math.max(280, Math.min(messageMaxW, Math.max(...lines.map((line) => ctx.measureText(line).width)) + 84));
      const panelH = Math.max(62, 30 + lines.length * lineHeight);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      roundRect(-messageWidth * 0.5, -panelH * 0.5, messageWidth, panelH, 15);
      const panel = ctx.createLinearGradient(0, -panelH * 0.5, 0, panelH * 0.5);
      panel.addColorStop(0, "rgba(25, 44, 62, 0.98)");
      panel.addColorStop(1, "rgba(14, 27, 40, 0.95)");
      ctx.fillStyle = panel;
      ctx.fill();
      ctx.strokeStyle = "rgba(242, 210, 132, 0.82)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 241, 198, 0.95)";
      ctx.textAlign = "center";
      setFont(28, 700, true);
      lines.forEach((line, idx) => {
        const y = -((lines.length - 1) * lineHeight) * 0.5 + idx * lineHeight + 10;
        ctx.fillText(line, 0, y);
      });
      ctx.restore();
    }
  }

  function drawFlashOverlays() {
    for (const flash of state.flashOverlays) {
      const alpha = Math.max(0, Math.min(1, flash.life / flash.maxLife));
      const eased = alpha * alpha;
      ctx.fillStyle = applyAlpha(flash.color, flash.intensity * eased);
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  function applyAlpha(hexOrRgb, alpha) {
    if (hexOrRgb.startsWith("#") && hexOrRgb.length === 7) {
      const r = Number.parseInt(hexOrRgb.slice(1, 3), 16);
      const g = Number.parseInt(hexOrRgb.slice(3, 5), 16);
      const b = Number.parseInt(hexOrRgb.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(236, 245, 255, ${alpha})`;
  }

  function render() {
    updateMobileControls();
    const shake = currentShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawBackground();

    if (state.mode === "menu") {
      drawMenu();
      drawEffects();
      ctx.restore();
      drawFlashOverlays();
      return;
    }

    drawHud();

    if (state.encounter) {
      drawEncounter();
    }

    if (state.mode === "reward") {
      drawRewardScreen();
    } else if (state.mode === "shop") {
      drawShopScreen();
    } else if (state.mode === "gameover") {
      drawEndOverlay("Run Lost", "The House keeps your soul this time.", "Press Enter to run it back");
    } else if (state.mode === "victory") {
      drawEndOverlay("House Broken", "You shattered the final dealer.", "Press Enter for another run");
    }

    drawEffects();
    ctx.restore();
    drawFlashOverlays();
  }

  function availableActions() {
    if (state.mode === "menu") {
      return hasSavedRun() ? ["enter(start)", "space(start)", "r(resume)"] : ["enter(start)", "space(start)"];
    }
    if (state.mode === "playing") {
      const canDouble = !!(
        state.encounter &&
        state.encounter.phase === "player" &&
        state.encounter.playerHand.length === 2 &&
        !state.encounter.doubleDown &&
        !state.encounter.splitUsed
      );
      const canSplit = canSplitCurrentHand();
      const actions = ["a(hit)", "b(stand)"];
      if (canSplit) {
        actions.push("s(split)");
      }
      if (canDouble) {
        actions.push("space(double)");
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
      return ["enter(restart)", "space(restart)"];
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
            doubleDown: encounter.doubleDown,
            splitQueueHands: Array.isArray(encounter.splitQueue) ? encounter.splitQueue.length : 0,
            splitUsed: Boolean(encounter.splitUsed),
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
      banner: state.announcement,
      hasSavedRun: hasSavedRun(),
      mobileControls: state.mobileActive,
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
    updateMobileControls();
    const viewportWidth = Math.floor(
      window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || WIDTH
    );
    const viewportHeight = Math.floor(
      window.visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || HEIGHT
    );
    const menuScreen = state.mode === "menu";
    const reservedHeight =
      !menuScreen && state.mobileActive && mobileControls ? mobileControls.offsetHeight + (state.compactControls ? 8 : 12) : 0;
    const availableHeight = Math.max(menuScreen ? viewportHeight : 140, viewportHeight - reservedHeight - (state.compactControls ? 6 : 0));
    const availableWidth = Math.max(280, viewportWidth);
    const portraitZoomed = state.mobilePortrait;

    if (portraitZoomed) {
      const shellW = availableWidth;
      const shellH = availableHeight;
      const scale = shellH / HEIGHT;
      const canvasW = Math.max(shellW, Math.floor(WIDTH * scale));
      const canvasH = Math.max(140, Math.floor(HEIGHT * scale));
      const left = Math.floor((shellW - canvasW) * 0.5);
      const cropDisplayX = Math.max(0, canvasW - shellW) * 0.5;
      const cropWorldX = scale > 0 ? cropDisplayX / scale : 0;

      gameShell.style.width = `${shellW}px`;
      gameShell.style.height = `${shellH}px`;
      canvas.style.width = `${canvasW}px`;
      canvas.style.height = `${canvasH}px`;
      canvas.style.left = `${left}px`;
      canvas.style.top = "0px";

      state.viewport = {
        width: shellW,
        height: shellH,
        scale,
        cropWorldX,
        portraitZoomed: true,
      };
      return;
    }

    const scale = Math.min(availableWidth / WIDTH, availableHeight / HEIGHT);
    const displayW = Math.max(280, Math.floor(WIDTH * scale));
    const displayH = Math.max(140, Math.floor(HEIGHT * scale));

    gameShell.style.width = `${displayW}px`;
    gameShell.style.height = `${displayH}px`;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    canvas.style.left = "0px";
    canvas.style.top = "0px";

    state.viewport = {
      width: displayW,
      height: displayH,
      scale,
      cropWorldX: 0,
      portraitZoomed: false,
    };
  }

  let lastFrame = performance.now();
  function gameLoop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  if (mobileButtons) {
    Object.entries(mobileButtons).forEach(([action, button]) => {
      if (!button) {
        return;
      }
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        handleMobileAction(action);
      });
    });
  }

  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  canvas.addEventListener("pointerup", onCanvasPointerUp);
  canvas.addEventListener("pointercancel", onCanvasPointerCancel);

  state.profile = loadProfile();
  state.savedRunSnapshot = loadSavedRunSnapshot();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  document.addEventListener("fullscreenchange", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      saveRunSnapshot();
      saveProfile();
      if (state.audio.context && state.audio.context.state === "running") {
        state.audio.context.suspend().catch(() => {});
      }
      return;
    }
    if (state.audio.enabled && state.audio.started && state.audio.context && state.audio.context.state === "suspended") {
      state.audio.context.resume().catch(() => {});
    }
  });
  window.addEventListener("beforeunload", () => {
    saveRunSnapshot();
    saveProfile();
  });

  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceTime;

  resizeCanvas();
  render();
  requestAnimationFrame(gameLoop);
})();
