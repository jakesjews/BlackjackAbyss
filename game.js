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
  const STORAGE_KEYS = {
    profile: "blackjack-abyss.profile.v1",
    run: "blackjack-abyss.run.v1",
  };
  const MAX_RUN_HISTORY = 24;

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
      hideDealerHole: Boolean(encounterLike.hideDealerHole),
      phase: ["player", "dealer", "resolve", "done"].includes(encounterLike.phase) ? encounterLike.phase : "player",
      resultText: typeof encounterLike.resultText === "string" ? encounterLike.resultText : "",
      resolveTimer: clampNumber(encounterLike.resolveTimer, 0, 10, 0),
      handIndex: Math.max(1, nonNegInt(encounterLike.handIndex, 1)),
      doubleDown: Boolean(encounterLike.doubleDown),
      bustGuardTriggered: Boolean(encounterLike.bustGuardTriggered),
      critTriggered: Boolean(encounterLike.critTriggered),
      lastPlayerAction: ["hit", "stand", "double", "none"].includes(encounterLike.lastPlayerAction)
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
    state.announcement = "Run resumed.";
    state.announcementTimer = 1.8;
    state.floatingTexts = [];
    state.cardBursts = [];
    state.sparkParticles = [];
    state.flashOverlays = [];
    state.screenShakeTime = 0;
    state.screenShakeDuration = 0;
    state.screenShakePower = 0;
    state.autosaveTimer = 0;
    state.savedRunSnapshot = snapshot;
    updateProfileBest(run);
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
    const portraitOffset = state.viewport?.portraitZoomed ? 72 : 0;
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
    }
  }

  function beginEncounter() {
    if (!state.run) {
      return;
    }

    state.mode = "playing";
    state.encounter = createEncounter(state.run);
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
    addLog(`Encounter ${state.run.floor}-${state.run.room}: ${enemy.name}`);
    state.announcement = `${enemy.name} enters the table.`;
    state.announcementTimer = 1.9;

    startHand();
    saveRunSnapshot();
  }

  function startRun() {
    if (state.profile) {
      state.profile.totals.runsStarted += 1;
      saveProfile();
    }
    state.autosaveTimer = 0;
    state.run = createRun();
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
    state.announcement = "Deal the first hand.";
    state.announcementTimer = 2.2;
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
    state.encounter.lastPlayerAction = "stand";
    resolveDealerThenShowdown(false);
  }

  function doubleAction() {
    if (!canPlayerAct()) {
      return;
    }

    const encounter = state.encounter;
    if (encounter.doubleDown || encounter.playerHand.length !== 2) {
      return;
    }

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

    encounter.resultText = text;
    run.totalHands += 1;
    addLog(text);
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
    addLog(`${enemy.name} defeated. +${payout} chips.`);

    encounter.phase = "done";

    if (enemy.type === "boss") {
      if (run.floor >= run.maxFloor) {
        finalizeRun("victory");
        state.mode = "victory";
        state.announcement = "The House collapses.";
        state.announcementTimer = 2.8;
        return;
      }

      run.floor += 1;
      run.room = 1;
      const heal = 8;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + heal);
      state.mode = "reward";
      state.selectionIndex = 0;
      state.rewardOptions = generateRewardOptions(3, true);
      state.announcement = `Floor cleared. Restored ${heal} HP.`;
      state.announcementTimer = 2.4;
      saveRunSnapshot();
      return;
    }

    run.room += 1;

    if (run.room % 2 === 0) {
      state.mode = "reward";
      state.selectionIndex = 0;
      state.rewardOptions = generateRewardOptions(3, false);
      state.announcement = "Relic draft unlocked.";
      state.announcementTimer = 2;
    } else {
      state.mode = "shop";
      state.selectionIndex = 0;
      state.shopStock = generateShopStock(3);
      state.announcement = "Black market table unlocked.";
      state.announcementTimer = 2;
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
      return;
    }

    if (run.player.gold < item.cost) {
      addLog("Not enough chips.");
      state.announcement = "Need more chips.";
      state.announcementTimer = 1.2;
      saveRunSnapshot();
      return;
    }

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
    beginEncounter();
  }

  function moveSelection(delta, length) {
    if (!length) {
      return;
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
    const viewportWidth = Math.floor(
      window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || WIDTH
    );
    return coarsePointer || "ontouchstart" in window || viewportWidth <= 980;
  }

  function setMobileButton(button, label, enabled, visible = true) {
    if (!button) {
      return;
    }
    button.style.display = visible ? "inline-flex" : "none";
    button.disabled = !enabled;
    if (label) {
      button.textContent = label;
    }
  }

  function updateMobileControls() {
    if (!mobileControls || !mobileButtons) {
      state.mobileActive = false;
      state.mobilePortrait = false;
      document.body.classList.remove("mobile-ui-active");
      document.body.classList.remove("mobile-portrait-ui");
      return;
    }

    state.mobileActive = shouldUseMobileControls();
    const viewportWidth = Math.floor(
      window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || WIDTH
    );
    const viewportHeight = Math.floor(
      window.visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || HEIGHT
    );
    state.mobilePortrait = state.mobileActive && viewportHeight > viewportWidth;
    mobileControls.classList.toggle("active", state.mobileActive);
    document.body.classList.toggle("mobile-ui-active", state.mobileActive);
    document.body.classList.toggle("mobile-portrait-ui", state.mobilePortrait);

    if (!state.mobileActive) {
      return;
    }

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
      const canDouble = canAct && state.encounter && state.encounter.playerHand.length === 2 && !state.encounter.doubleDown;
      setMobileButton(mobileButtons.hit, "Hit", canAct, true);
      setMobileButton(mobileButtons.stand, "Stand", canAct, true);
      setMobileButton(mobileButtons.double, "Double", canDouble, true);
      setMobileButton(mobileButtons.left, "Left", false, false);
      setMobileButton(mobileButtons.right, "Right", false, false);
      setMobileButton(mobileButtons.confirm, "Confirm", false, false);
      return;
    }

    if (state.mode === "reward") {
      setMobileButton(mobileButtons.left, "Prev", state.rewardOptions.length > 1, true);
      setMobileButton(mobileButtons.right, "Next", state.rewardOptions.length > 1, true);
      setMobileButton(mobileButtons.confirm, "Claim", state.rewardOptions.length > 0, true);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      setMobileButton(mobileButtons.double, "Double", false, false);
      return;
    }

    if (state.mode === "shop") {
      setMobileButton(mobileButtons.left, "Prev", state.shopStock.length > 1, true);
      setMobileButton(mobileButtons.right, "Next", state.shopStock.length > 1, true);
      setMobileButton(mobileButtons.double, "Buy", state.shopStock.length > 0, true);
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
      } else if (state.mode === "reward") {
        claimReward();
      } else if (state.mode === "shop") {
        leaveShop();
      } else if (state.mode === "gameover" || state.mode === "victory") {
        startRun();
      }
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
      if (low === "a" || low === "b" || low === "r") {
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
      state.announcementTimer -= dt;
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
        startHand();
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
    let mobileBoost = 1;
    if (state.mobileActive && viewportWidth <= 700) {
      mobileBoost = state.viewport?.portraitZoomed ? 1.08 : 1.18;
    }
    const tunedSize = Math.round(size * mobileBoost);
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
    const portraitShift = state.viewport?.portraitZoomed ? 72 : 0;

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
    ctx.fillText(`You: ${playerTotal}`, WIDTH * 0.5, 610 + portraitShift);

    if (encounter.resultText) {
      roundRect(WIDTH * 0.5 - 390, 622, 780, 35, 11);
      ctx.fillStyle = "rgba(13, 26, 39, 0.72)";
      ctx.fill();
      ctx.fillStyle = "#f8d37b";
      setFont(19, 700, false);
      ctx.fillText(encounter.resultText, WIDTH * 0.5, 646 + (state.viewport?.portraitZoomed ? 30 : 0));
    }

    if (state.mode === "playing") {
      if (state.mobileActive) {
        ctx.textAlign = "center";
        setFont(14, 600, false);
        ctx.fillStyle = "#9cb9d4";
        ctx.fillText(
          "Tap buttons below. Left / Right picks items.",
          WIDTH * 0.5,
          state.viewport?.portraitZoomed ? 674 : 698
        );
      } else {
        setFont(17, 700, false);
        const canDoubleNow = canPlayerAct() && encounter.playerHand.length === 2 && !encounter.doubleDown;
        const actionBits = [
          { text: "A: Hit", color: "#acc5de" },
          { text: "  |  ", color: "rgba(157, 186, 213, 0.62)" },
          { text: "B: Stand", color: "#acc5de" },
          { text: "  |  ", color: "rgba(157, 186, 213, 0.62)" },
          {
            text: "Space: Double Down",
            color: canDoubleNow ? "#acc5de" : "rgba(142, 163, 183, 0.4)",
          },
        ];
        ctx.textAlign = "left";
        const widths = actionBits.map((bit) => ctx.measureText(bit.text).width);
        let drawX = WIDTH * 0.5 - widths.reduce((sum, width) => sum + width, 0) * 0.5;
        actionBits.forEach((bit, idx) => {
          ctx.fillStyle = bit.color;
          ctx.fillText(bit.text, drawX, 672);
          drawX += widths[idx];
        });
        setFont(15, 600, false);
        ctx.fillStyle = "#9cb9d4";
        ctx.textAlign = "center";
        ctx.fillText("Left / Right: Pick relics and shop items", WIDTH * 0.5, 698);
      }
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
      ctx.fillText(passiveText, hud.left + 2, hud.portrait ? 144 : 94);
    }

    const relicEntries = Object.entries(run.player.relics).slice(0, 5);
    if (relicEntries.length > 0) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#9fc2de";
      setFont(14, 600, false);
      if (hud.portrait) {
        const relicTotal = Object.values(run.player.relics).reduce((sum, value) => sum + nonNegInt(value, 0), 0);
        ctx.fillText(`Relics: ${relicTotal}`, hud.right - 2, 144);
      } else {
        const lines = relicEntries.map(([id, count]) => {
          const relic = RELIC_BY_ID.get(id);
          return `${relic ? relic.name : id} x${count}`;
        });
        lines.forEach((line, idx) => {
          ctx.fillText(line, hud.right - 2, 92 + idx * 16);
        });
      }
    }

    if (run.log.length > 0) {
      ctx.textAlign = "left";
      setFont(15, 500, false);
      run.log.slice(0, 3).forEach((entry, idx) => {
        ctx.fillStyle = idx === 0 ? "#e3f0ff" : "rgba(227, 240, 255, 0.65)";
        const clipped = fitText(entry.message, hud.logMaxWidth);
        ctx.fillText(clipped, hud.left + 2, HEIGHT - 92 + idx * 18);
      });
    }
  }

  function drawRewardScreen() {
    if (state.mode !== "reward" || !state.rewardOptions.length) {
      return;
    }

    ctx.fillStyle = "rgba(5, 10, 16, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f6e6a6";
    setFont(40, 700, true);
    ctx.fillText("Relic Draft", WIDTH * 0.5, 124);

    ctx.fillStyle = "#bdd6ec";
    setFont(18, 600, false);
    ctx.fillText(
      state.mobileActive ? "Use Left / Right and Claim on the control bar" : "Arrow keys to select, Enter or Space to claim",
      WIDTH * 0.5,
      156
    );
    ctx.fillStyle = "#97bddb";
    setFont(15, 600, false);
    ctx.fillText("All relics are passive and auto-apply.", WIDTH * 0.5, 178);

    const cardWidth = 322;
    const cardHeight = 238;
    const gap = 28;
    const totalW = state.rewardOptions.length * cardWidth + (state.rewardOptions.length - 1) * gap;
    let x = WIDTH * 0.5 - totalW * 0.5;

    state.rewardOptions.forEach((relic, idx) => {
      const y = 210;
      const selected = idx === state.selectionIndex;

      roundRect(x, y, cardWidth, cardHeight, 18);
      ctx.fillStyle = selected ? "rgba(24, 43, 62, 0.95)" : "rgba(17, 30, 44, 0.9)";
      ctx.fill();

      ctx.strokeStyle = selected ? relic.color : "rgba(145, 186, 220, 0.35)";
      ctx.lineWidth = selected ? 3 : 1.2;
      ctx.stroke();

      if (selected) {
        const shimmerX = x - 60 + ((state.worldTime * 260) % (cardWidth + 120));
        const shimmer = ctx.createLinearGradient(shimmerX, y, shimmerX + 90, y + cardHeight);
        shimmer.addColorStop(0, "rgba(255,255,255,0)");
        shimmer.addColorStop(0.5, "rgba(255,255,255,0.12)");
        shimmer.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shimmer;
        roundRect(x + 3, y + 3, cardWidth - 6, cardHeight - 6, 16);
        ctx.fill();
      }

      ctx.fillStyle = relic.color;
      setFont(30, 700, true);
      ctx.fillText(relic.name, x + cardWidth * 0.5, y + 56);

      ctx.fillStyle = "#d0e4f5";
      setFont(18, 600, false);
      wrapText(passiveDescription(relic.description), x + 30, y + 108, cardWidth - 60, 24, "center");

      x += cardWidth + gap;
    });
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
      return;
    }

    ctx.fillStyle = "rgba(6, 11, 17, 0.75)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f2c587";
    setFont(40, 700, true);
    ctx.fillText("Black Market", WIDTH * 0.5, 122);

    ctx.fillStyle = "#c4d9ec";
    setFont(18, 600, false);
    ctx.fillText(
      state.mobileActive ? "Use Left / Right, Buy, and Continue on control bar" : "Arrow keys to select, Space to buy, Enter to continue",
      WIDTH * 0.5,
      154
    );
    ctx.fillStyle = "#97bddb";
    setFont(15, 600, false);
    ctx.fillText("Relics are passive. Buy once to activate immediately.", WIDTH * 0.5, 176);

    const cardWidth = 322;
    const cardHeight = 248;
    const gap = 28;
    const totalW = state.shopStock.length * cardWidth + (state.shopStock.length - 1) * gap;
    let x = WIDTH * 0.5 - totalW * 0.5;

    state.shopStock.forEach((item, idx) => {
      const y = 206;
      const selected = idx === state.selectionIndex;

      roundRect(x, y, cardWidth, cardHeight, 18);
      ctx.fillStyle = item.sold ? "rgba(34, 36, 40, 0.82)" : selected ? "rgba(35, 51, 60, 0.95)" : "rgba(20, 31, 38, 0.9)";
      ctx.fill();

      ctx.strokeStyle = item.sold ? "rgba(112, 120, 132, 0.35)" : selected ? "#ffd08f" : "rgba(152, 186, 208, 0.35)";
      ctx.lineWidth = selected ? 3 : 1.2;
      ctx.stroke();

      if (selected && !item.sold) {
        const pulse = 0.4 + Math.sin(state.worldTime * 5.5) * 0.14;
        ctx.strokeStyle = `rgba(248, 211, 131, ${pulse})`;
        ctx.lineWidth = 1.2;
        roundRect(x + 6, y + 6, cardWidth - 12, cardHeight - 12, 14);
        ctx.stroke();
      }

      ctx.fillStyle = item.sold ? "#8f9aa7" : "#f4e1aa";
      setFont(30, 700, true);
      ctx.fillText(shopItemName(item), x + cardWidth * 0.5, y + 54);

      ctx.fillStyle = item.sold ? "#78818d" : "#d4e6f4";
      setFont(18, 600, false);
      wrapText(shopItemDescription(item), x + 30, y + 104, cardWidth - 60, 24, "center");

      ctx.fillStyle = item.sold ? "#9ca5af" : "#ffd58f";
      setFont(23, 700, false);
      ctx.fillText(item.sold ? "SOLD" : `${item.cost} chips`, x + cardWidth * 0.5, y + cardHeight - 42);

      x += cardWidth + gap;
    });
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

  function drawMenu() {
    ctx.textAlign = "center";
    const resumeReady = hasSavedRun();

    const glow = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.4, 30, WIDTH * 0.5, HEIGHT * 0.4, 320);
    glow.addColorStop(0, "rgba(247, 184, 109, 0.28)");
    glow.addColorStop(1, "rgba(247, 184, 109, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#f3d193";
    setFont(72, 700, true);
    ctx.fillText("BLACKJACK ABYSS", WIDTH * 0.5, 212);

    ctx.fillStyle = "#cae0f2";
    setFont(24, 600, false);
    ctx.fillText("Roguelike deck duels where each hand hits like combat.", WIDTH * 0.5, 262);

    if (state.profile) {
      const t = state.profile.totals;
      ctx.fillStyle = "#9fc3dc";
      setFont(17, 600, false);
      ctx.fillText(`Lifetime: ${t.runsStarted} runs | ${t.runsWon} wins | ${t.enemiesDefeated} enemies`, WIDTH * 0.5, 292);
    }

    roundRect(WIDTH * 0.5 - 400, 316, 800, 268, 20);
    ctx.fillStyle = "rgba(18, 33, 48, 0.9)";
    ctx.fill();

    ctx.strokeStyle = "rgba(172, 206, 229, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const controls = state.mobileActive
      ? [
          "Tap New Run (or Resume) on the control bar below",
          "Hit / Stand / Double buttons appear in combat",
          "Left / Right buttons pick relics and shop cards",
          "Relics are passive and activate instantly",
        ]
      : [
          "Enter: Start new run / confirm",
          resumeReady ? "R: Resume saved run" : "R: Resume saved run (none found)",
          "A: Hit card",
          "B: Stand hand",
          "Space: Double down (one-card commit)",
          "Left / Right: Pick relics and shop items",
          "Relics are passive: effects are always active once collected",
          "F: Toggle fullscreen, Esc: leave fullscreen",
        ];

    ctx.fillStyle = "#e2f0ff";
    setFont(20, 600, false);
    controls.forEach((line, idx) => {
      ctx.fillText(line, WIDTH * 0.5, 362 + idx * (state.mobileActive ? 36 : 30));
    });

    const pulse = 0.5 + Math.sin(state.worldTime * 4.6) * 0.5;
    ctx.fillStyle = `rgba(248, 212, 125, ${0.5 + pulse * 0.5})`;
    setFont(28, 700, true);
    ctx.fillText(resumeReady ? "Press Enter for a new run, or R to resume" : "Press Enter to begin", WIDTH * 0.5, 642);
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
      const alpha = Math.max(0, Math.min(1, state.announcementTimer / 1.2));
      const bannerY = state.viewport?.portraitZoomed ? 158 : 90;
      roundRect(WIDTH * 0.5 - 250, bannerY, 500, 36, 12);
      ctx.fillStyle = `rgba(9, 17, 27, ${0.65 * alpha})`;
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(244, 222, 170, ${0.88 * alpha})`;
      setFont(19, 600, false);
      ctx.fillText(state.announcement, WIDTH * 0.5, bannerY + 24);
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
        !state.encounter.doubleDown
      );
      return canDouble ? ["a(hit)", "b(stand)", "space(double)"] : ["a(hit)", "b(stand)"];
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
    const reservedHeight = state.mobileActive && mobileControls ? mobileControls.offsetHeight + 12 : 0;
    const availableHeight = Math.max(220, viewportHeight - reservedHeight);
    const availableWidth = Math.max(320, viewportWidth);
    const portraitZoomed = state.mobilePortrait && state.mode !== "menu";

    if (portraitZoomed) {
      const shellW = availableWidth;
      const shellH = availableHeight;
      const scale = shellH / HEIGHT;
      const canvasW = Math.max(shellW, Math.floor(WIDTH * scale));
      const canvasH = Math.max(220, Math.floor(HEIGHT * scale));
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
    const displayW = Math.max(320, Math.floor(WIDTH * scale));
    const displayH = Math.max(180, Math.floor(HEIGHT * scale));

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

  state.profile = loadProfile();
  state.savedRunSnapshot = loadSavedRunSnapshot();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  document.addEventListener("fullscreenchange", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      saveRunSnapshot();
      saveProfile();
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
