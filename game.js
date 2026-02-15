(() => {
  "use strict";

  const gameShell = document.getElementById("game-shell");
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const menuHome = document.getElementById("menu-home");
  const menuNewRun = document.getElementById("menu-new-run");
  const menuResume = document.getElementById("menu-resume");
  const menuAchievements = document.getElementById("menu-achievements");
  const mobileControls = document.getElementById("mobile-controls");
  const topRightActions = document.getElementById("top-right-actions");
  const achievementsToggle = document.getElementById("achievements-toggle");
  const logsToggle = document.getElementById("logs-toggle");
  const logsModal = document.getElementById("logs-modal");
  const logsClose = document.getElementById("logs-close");
  const logsFeed = document.getElementById("logs-feed");
  const collectionModal = document.getElementById("collection-modal");
  const collectionClose = document.getElementById("collection-close");
  const collectionStats = document.getElementById("collection-stats");
  const collectionList = document.getElementById("collection-list");
  const passiveModal = document.getElementById("passive-modal");
  const passiveModalClose = document.getElementById("passive-modal-close");
  const passiveModalStats = document.getElementById("passive-modal-stats");
  const passiveModalList = document.getElementById("passive-modal-list");
  const passiveRail = document.getElementById("passive-rail");
  const passiveTooltip = document.getElementById("passive-tooltip");
  if (passiveRail && gameShell && passiveRail.parentElement !== gameShell) {
    gameShell.appendChild(passiveRail);
  }
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
  const MENU_FRAME_DISPLAY_WIDTH = 464;
  const MENU_FRAME_DISPLAY_HEIGHT = 698;
  const MENU_DESKTOP_SCALE_BOOST = 1.25;
  const MENU_SCALE_CLASSES = ["menu-ui-scale-sm", "menu-ui-scale-md", "menu-ui-scale-lg", "menu-ui-scale-xl"];
  const MAX_SPLIT_HANDS = 4;
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
  const MENU_ART_SOURCES = ["public/images/splash_art.png", "/images/splash_art.png"];
  const GRUNT_SOURCES = [
    "public/audio/soundbites/grunt.wav",
    "/audio/soundbites/grunt.wav",
    "public/audio/soundbites/grunt.ogg",
    "/audio/soundbites/grunt.ogg",
  ];
  const menuArtImage = new window.Image();
  menuArtImage.decoding = "async";
  const chipIconImage = new window.Image();
  chipIconImage.decoding = "async";
  chipIconImage.src = "public/images/icons/chips.png";
  async function resolveMenuArtSource() {
    for (const src of MENU_ART_SOURCES) {
      try {
        const response = await window.fetch(src, { method: "HEAD", cache: "no-store" });
        if (response.ok) {
          menuArtImage.src = src;
          return;
        }
      } catch {
        // Ignore probe failures and continue trying fallbacks.
      }
    }
    menuArtImage.src = MENU_ART_SOURCES[0];
  }
  resolveMenuArtSource();
  const ENEMY_AVATAR_SOURCE_ROOTS = ["public/images/avatars", "/images/avatars"];
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

  function enemyAvatarImage(enemy) {
    if (!enemy) {
      return null;
    }
    const key =
      enemy.avatarKey ||
      ENEMY_AVATAR_BY_NAME[enemy.name] ||
      sanitizeEnemyAvatarKey(enemy.name);
    if (!key) {
      return null;
    }
    const entry = ensureEnemyAvatarLoaded(key);
    return entry && entry.status === "ready" ? entry.image : null;
  }

  function enemyAvatarIntensity(enemy, run = state.run) {
    const typeBase =
      enemy?.type === "boss" ? 1.02 : enemy?.type === "elite" ? 0.68 : 0.36;
    const floorProgress = run
      ? (Math.max(1, run.floor) - 1) / Math.max(1, (run.maxFloor || 3) - 1)
      : 0;
    const roomProgress = run
      ? (Math.max(1, run.room) - 1) / Math.max(1, (run.roomsPerFloor || 5) - 1)
      : 0;
    return clampNumber(
      typeBase + floorProgress * 0.25 + roomProgress * 0.1,
      0.3,
      1.3,
      typeBase
    );
  }
  const passiveThumbCache = new Map();
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
  const ACTION_ICON_BASE = "public/images/icons";
  const ACTION_ICON_FILES = Object.freeze({
    achievements: `${ACTION_ICON_BASE}/achievements.png`,
    chips: `${ACTION_ICON_BASE}/chips.png`,
    deal: `${ACTION_ICON_BASE}/deal.png`,
    double: `${ACTION_ICON_BASE}/double.png`,
    hit: `${ACTION_ICON_BASE}/hit.png`,
    newRun: `${ACTION_ICON_BASE}/new-run.png`,
    resume: `${ACTION_ICON_BASE}/resume.png`,
    split: `${ACTION_ICON_BASE}/split.png`,
    stand: `${ACTION_ICON_BASE}/stand.png`,
  });

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
      splitWinDamage: 0,
      doubleLossBlock: 0,
      blackjackHeal: 0,
      eliteDamage: 0,
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
        blackjacks: 0,
        doublesWon: 0,
        splitsUsed: 0,
        pushes: 0,
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

  const RELIC_RARITY_META = {
    common: { label: "Common", shopMarkup: 0, glow: "#8ab3da" },
    uncommon: { label: "Uncommon", shopMarkup: 3, glow: "#71d8b4" },
    rare: { label: "Rare", shopMarkup: 8, glow: "#f2c46f" },
    legendary: { label: "Legendary", shopMarkup: 14, glow: "#ff967c" },
  };
  const RELIC_RARITY_ORDER = ["common", "uncommon", "rare", "legendary"];

  const RELICS = [
    {
      id: "razor-chip",
      name: "Razor Chip",
      rarity: "common",
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
      rarity: "common",
      description: "Reduce incoming damage by 2.",
      color: "#7fb6ff",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.block += 2;
      },
    },
    {
      id: "lucky-opener",
      name: "Lucky Opener",
      rarity: "common",
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
      rarity: "common",
      description: "+25% chips from enemy payouts.",
      color: "#f2a85d",
      shopCost: 18,
      apply: (run) => {
        run.player.stats.goldMultiplier += 0.25;
      },
    },
    {
      id: "dealer-tell",
      name: "Dealer Tell",
      rarity: "common",
      description: "+2 damage when you Stand and win.",
      color: "#84b7ff",
      shopCost: 16,
      apply: (run) => {
        run.player.stats.standWinDamage += 2;
      },
    },
    {
      id: "counterweight",
      name: "Counterweight",
      rarity: "common",
      description: "Busting takes 2 less damage.",
      color: "#8eb2d3",
      shopCost: 16,
      apply: (run) => {
        run.player.stats.bustBlock += 2;
      },
    },
    {
      id: "first-spark",
      name: "First Spark",
      rarity: "common",
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
      rarity: "common",
      description: "Gain +2 chips whenever you win a hand.",
      color: "#f6c66b",
      shopCost: 16,
      apply: (run) => {
        run.player.stats.chipsOnWinHand += 2;
      },
    },
    {
      id: "push-protocol",
      name: "Push Protocol",
      rarity: "common",
      description: "Pushes grant +3 chips.",
      color: "#9ec6dd",
      shopCost: 14,
      apply: (run) => {
        run.player.stats.chipsOnPush += 3;
      },
    },
    {
      id: "chipped-edge",
      name: "Chipped Edge",
      rarity: "common",
      description: "+1 outgoing damage and +1 chips on win.",
      color: "#f79972",
      shopCost: 14,
      apply: (run) => {
        run.player.stats.flatDamage += 1;
        run.player.stats.chipsOnWinHand += 1;
      },
    },
    {
      id: "bunker-chip",
      name: "Bunker Chip",
      rarity: "common",
      description: "+1 block and +1 bust block.",
      color: "#7aa7cf",
      shopCost: 14,
      apply: (run) => {
        run.player.stats.block += 1;
        run.player.stats.bustBlock += 1;
      },
    },
    {
      id: "mercy-thread",
      name: "Mercy Thread",
      rarity: "common",
      unlock: { key: "runsStarted", min: 2, label: "Start 2 runs" },
      description: "Heal 1 HP when winning a hand.",
      color: "#8ce4bd",
      shopCost: 14,
      apply: (run) => {
        run.player.stats.healOnWinHand += 1;
      },
    },
    {
      id: "calm-breath",
      name: "Calm Breath",
      rarity: "common",
      unlock: { key: "handsPlayed", min: 20, label: "Play 20 hands" },
      description: "Heal 1 HP at the start of each encounter.",
      color: "#7fdcc1",
      shopCost: 15,
      apply: (run) => {
        run.player.stats.healOnEncounterStart += 1;
      },
    },
    {
      id: "split-primer",
      name: "Split Primer",
      rarity: "common",
      unlock: { key: "splitsUsed", min: 1, label: "Use Split once" },
      description: "+2 damage when a split hand wins.",
      color: "#9fd8ef",
      shopCost: 15,
      apply: (run) => {
        run.player.stats.splitWinDamage += 2;
      },
    },
    {
      id: "double-fuse",
      name: "Double Fuse",
      rarity: "common",
      unlock: { key: "doublesWon", min: 2, label: "Win 2 doubled hands" },
      description: "+1 damage on successful Double Down hands.",
      color: "#f6be7c",
      shopCost: 15,
      apply: (run) => {
        run.player.stats.doubleWinDamage += 1;
      },
    },
    {
      id: "stake-lantern",
      name: "Stake Lantern",
      rarity: "common",
      description: "+18% chips from enemy payouts.",
      color: "#e0b97f",
      shopCost: 14,
      apply: (run) => {
        run.player.stats.goldMultiplier += 0.18;
      },
    },
    {
      id: "steady-stance",
      name: "Steady Stance",
      rarity: "common",
      description: "+1 block and +1 Stand win damage.",
      color: "#8fb6d9",
      shopCost: 15,
      apply: (run) => {
        run.player.stats.block += 1;
        run.player.stats.standWinDamage += 1;
      },
    },
    {
      id: "side-bet-ledger",
      name: "Side Bet Ledger",
      rarity: "common",
      unlock: { key: "pushes", min: 4, label: "Reach 4 pushes" },
      description: "Pushes grant +2 chips and +1 win-hand damage.",
      color: "#a9cadf",
      shopCost: 15,
      apply: (run) => {
        run.player.stats.chipsOnPush += 2;
        run.player.stats.flatDamage += 1;
      },
    },
    {
      id: "clean-cut",
      name: "Clean Cut",
      rarity: "common",
      unlock: { key: "handsPlayed", min: 28, label: "Play 28 hands" },
      description: "+1 outgoing damage and +1 double-win damage.",
      color: "#ef8d77",
      shopCost: 15,
      apply: (run) => {
        run.player.stats.flatDamage += 1;
        run.player.stats.doubleWinDamage += 1;
      },
    },
    {
      id: "blood-prism",
      name: "Blood Prism",
      rarity: "uncommon",
      unlock: { key: "handsPlayed", min: 35, label: "Play 35 hands" },
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
      rarity: "uncommon",
      unlock: { key: "enemiesDefeated", min: 8, label: "Defeat 8 enemies" },
      description: "+12% crit chance for outgoing damage.",
      color: "#f5ca67",
      shopCost: 22,
      apply: (run) => {
        run.player.stats.critChance += 0.12;
      },
    },
    {
      id: "soul-leech",
      name: "Soul Leech",
      rarity: "uncommon",
      unlock: { key: "handsPlayed", min: 45, label: "Play 45 hands" },
      description: "Heal 2 HP when winning a hand.",
      color: "#bf8cff",
      shopCost: 24,
      apply: (run) => {
        run.player.stats.healOnWinHand += 2;
      },
    },
    {
      id: "all-in-marker",
      name: "All-In Marker",
      rarity: "uncommon",
      unlock: { key: "doublesWon", min: 5, label: "Win 5 doubled hands" },
      description: "+2 damage on successful Double Down hands.",
      color: "#ffb470",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.doubleWinDamage += 2;
      },
    },
    {
      id: "life-thread",
      name: "Life Thread",
      rarity: "uncommon",
      unlock: { key: "runsStarted", min: 3, label: "Start 3 runs" },
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
      rarity: "uncommon",
      unlock: { key: "blackjacks", min: 6, label: "Hit 6 blackjacks" },
      description: "+1 Lucky Opener card and +4% crit chance.",
      color: "#bce58b",
      shopCost: 21,
      apply: (run) => {
        run.player.stats.luckyStart += 1;
        run.player.stats.critChance += 0.04;
      },
    },
    {
      id: "dealer-tax-stamp",
      name: "Dealer Tax Stamp",
      rarity: "uncommon",
      unlock: { key: "enemiesDefeated", min: 12, label: "Defeat 12 enemies" },
      description: "Dealer busts take +4 extra damage.",
      color: "#ff8d72",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.dealerBustBonusDamage += 4;
      },
    },
    {
      id: "pocket-anvil",
      name: "Pocket Anvil",
      rarity: "uncommon",
      unlock: { key: "chipsEarned", min: 500, label: "Earn 500 chips total" },
      description: "+5 max HP, heal 5, and +1 damage.",
      color: "#9ab2c5",
      shopCost: 25,
      apply: (run) => {
        run.player.maxHp += 5;
        run.player.hp = Math.min(run.player.maxHp, run.player.hp + 5);
        run.player.stats.flatDamage += 1;
      },
    },
    {
      id: "iron-oath",
      name: "Iron Oath",
      rarity: "uncommon",
      unlock: { key: "bestFloor", min: 2, label: "Reach floor 2" },
      description: "+1 bust guard each encounter and +1 block.",
      color: "#82c4d8",
      shopCost: 23,
      apply: (run) => {
        run.player.stats.bustGuardPerEncounter += 1;
        run.player.stats.block += 1;
      },
    },
    {
      id: "stitch-engine",
      name: "Stitch Engine",
      rarity: "uncommon",
      unlock: { key: "damageTaken", min: 220, label: "Take 220 total damage" },
      description: "Heal 3 HP at the start of each encounter.",
      color: "#74d0b4",
      shopCost: 22,
      apply: (run) => {
        run.player.stats.healOnEncounterStart += 3;
      },
    },
    {
      id: "blackjack-ointment",
      name: "Blackjack Ointment",
      rarity: "uncommon",
      unlock: { key: "blackjacks", min: 10, label: "Hit 10 blackjacks" },
      description: "Blackjacks heal 2 HP and deal +2 damage.",
      color: "#ffd386",
      shopCost: 23,
      apply: (run) => {
        run.player.stats.blackjackHeal += 2;
        run.player.stats.blackjackBonusDamage += 2;
      },
    },
    {
      id: "market-lantern",
      name: "Market Lantern",
      rarity: "uncommon",
      unlock: { key: "chipsEarned", min: 800, label: "Earn 800 chips total" },
      description: "+22% chips from payouts and +1 chips on win.",
      color: "#e8bf78",
      shopCost: 22,
      apply: (run) => {
        run.player.stats.goldMultiplier += 0.22;
        run.player.stats.chipsOnWinHand += 1;
      },
    },
    {
      id: "risk-hedge",
      name: "Risk Hedge",
      rarity: "uncommon",
      unlock: { key: "doublesWon", min: 8, label: "Win 8 doubled hands" },
      description: "Failed doubles take 3 less damage.",
      color: "#98b7db",
      shopCost: 21,
      apply: (run) => {
        run.player.stats.doubleLossBlock += 3;
      },
    },
    {
      id: "bruise-battery",
      name: "Bruise Battery",
      rarity: "uncommon",
      unlock: { key: "damageTaken", min: 260, label: "Take 260 total damage" },
      description: "+2 low-HP damage and +1 flat damage.",
      color: "#d88b86",
      shopCost: 23,
      apply: (run) => {
        run.player.stats.lowHpDamage += 2;
        run.player.stats.flatDamage += 1;
      },
    },
    {
      id: "push-siphon",
      name: "Push Siphon",
      rarity: "uncommon",
      unlock: { key: "pushes", min: 8, label: "Reach 8 pushes" },
      description: "Pushes grant +5 chips.",
      color: "#9dc7e8",
      shopCost: 19,
      apply: (run) => {
        run.player.stats.chipsOnPush += 5;
      },
    },
    {
      id: "ghost-shoe",
      name: "Ghost Shoe",
      rarity: "uncommon",
      unlock: { key: "handsPlayed", min: 55, label: "Play 55 hands" },
      description: "+1 Lucky Opener card and +1 bust block.",
      color: "#9ed9f3",
      shopCost: 21,
      apply: (run) => {
        run.player.stats.luckyStart += 1;
        run.player.stats.bustBlock += 1;
      },
    },
    {
      id: "leech-tax",
      name: "Leech Tax",
      rarity: "uncommon",
      unlock: { key: "damageTaken", min: 180, label: "Take 180 total damage" },
      description: "Heal +2 on hand wins, but payouts are 15% lower.",
      color: "#9ad89f",
      shopCost: 20,
      apply: (run) => {
        run.player.stats.healOnWinHand += 2;
        run.player.stats.goldMultiplier -= 0.15;
      },
    },
    {
      id: "fuse-link",
      name: "Fuse Link",
      rarity: "uncommon",
      unlock: { key: "splitsUsed", min: 6, label: "Use Split 6 times" },
      description: "+2 split-win damage and +1 chips on hand wins.",
      color: "#84c8ea",
      shopCost: 21,
      apply: (run) => {
        run.player.stats.splitWinDamage += 2;
        run.player.stats.chipsOnWinHand += 1;
      },
    },
    {
      id: "insurance-sigil",
      name: "Insurance Sigil",
      rarity: "rare",
      unlock: { key: "enemiesDefeated", min: 24, label: "Defeat 24 enemies" },
      description: "Gain +2 bust guards each encounter.",
      color: "#71e2ca",
      shopCost: 24,
      apply: (run) => {
        run.player.stats.bustGuardPerEncounter += 2;
      },
    },
    {
      id: "vitality-coil",
      name: "Vitality Coil",
      rarity: "rare",
      unlock: { key: "bestFloor", min: 2, label: "Reach floor 2" },
      description: "+8 max HP and heal 8.",
      color: "#55ddb6",
      shopCost: 28,
      apply: (run) => {
        run.player.maxHp += 8;
        run.player.hp = Math.min(run.player.maxHp, run.player.hp + 8);
      },
    },
    {
      id: "royal-wedge",
      name: "Royal Wedge",
      rarity: "rare",
      unlock: { key: "blackjacks", min: 18, label: "Hit 18 blackjacks" },
      description: "Blackjacks deal +4 extra damage.",
      color: "#ffd995",
      shopCost: 24,
      apply: (run) => {
        run.player.stats.blackjackBonusDamage += 4;
      },
    },
    {
      id: "safety-net",
      name: "Safety Net",
      rarity: "rare",
      unlock: { key: "runsWon", min: 1, label: "Win 1 run" },
      description: "+1 bust guard each encounter and +1 block.",
      color: "#7fd7d7",
      shopCost: 24,
      apply: (run) => {
        run.player.stats.bustGuardPerEncounter += 1;
        run.player.stats.block += 1;
      },
    },
    {
      id: "croupier-bane",
      name: "Croupier Bane",
      rarity: "rare",
      unlock: { key: "enemiesDefeated", min: 28, label: "Defeat 28 enemies" },
      description: "Dealer busts deal +4 damage and all wins gain +1 damage.",
      color: "#ff9c7e",
      shopCost: 25,
      apply: (run) => {
        run.player.stats.dealerBustBonusDamage += 4;
        run.player.stats.flatDamage += 1;
      },
    },
    {
      id: "fortress-heart",
      name: "Fortress Heart",
      rarity: "rare",
      unlock: { key: "damageTaken", min: 420, label: "Take 420 total damage" },
      description: "+12 max HP, heal 6, and +2 block.",
      color: "#9bb7cf",
      shopCost: 30,
      apply: (run) => {
        run.player.maxHp += 12;
        run.player.hp = Math.min(run.player.maxHp, run.player.hp + 6);
        run.player.stats.block += 2;
      },
    },
    {
      id: "redline-core",
      name: "Redline Core",
      rarity: "rare",
      unlock: { key: "doublesWon", min: 12, label: "Win 12 doubled hands" },
      description: "+3 double-win damage, +1 damage, and +2 double-loss block.",
      color: "#ffae74",
      shopCost: 27,
      apply: (run) => {
        run.player.stats.doubleWinDamage += 3;
        run.player.stats.flatDamage += 1;
        run.player.stats.doubleLossBlock += 2;
      },
    },
    {
      id: "mirror-plate",
      name: "Mirror Plate",
      rarity: "rare",
      unlock: { key: "relicsCollected", min: 22, label: "Collect 22 relic copies" },
      description: "+3 block and +1 heal on winning a hand.",
      color: "#9ec8ef",
      shopCost: 27,
      apply: (run) => {
        run.player.stats.block += 3;
        run.player.stats.healOnWinHand += 1;
      },
    },
    {
      id: "boss-hunter",
      name: "Boss Hunter",
      rarity: "rare",
      unlock: { key: "bestFloor", min: 3, label: "Reach floor 3" },
      description: "+3 damage versus elite and boss enemies.",
      color: "#f0c47b",
      shopCost: 25,
      apply: (run) => {
        run.player.stats.eliteDamage += 3;
      },
    },
    {
      id: "glass-dice",
      name: "Glass Dice",
      rarity: "rare",
      unlock: { key: "runsStarted", min: 8, label: "Start 8 runs" },
      description: "+5 outgoing damage, but lose 2 block.",
      color: "#ff9988",
      shopCost: 26,
      apply: (run) => {
        run.player.stats.flatDamage += 5;
        run.player.stats.block -= 2;
      },
    },
    {
      id: "martyr-token",
      name: "Martyr Token",
      rarity: "rare",
      unlock: { key: "damageTaken", min: 520, label: "Take 520 total damage" },
      description: "+2 block, +2 low-HP damage, and +1 bust guard each encounter.",
      color: "#ffb182",
      shopCost: 28,
      apply: (run) => {
        run.player.stats.block += 2;
        run.player.stats.lowHpDamage += 2;
        run.player.stats.bustGuardPerEncounter += 1;
      },
    },
    {
      id: "dealer-cage",
      name: "Dealer Cage",
      rarity: "rare",
      unlock: { key: "enemiesDefeated", min: 36, label: "Defeat 36 enemies" },
      description: "+3 dealer-bust damage and +2 stand-win damage.",
      color: "#f8bc7f",
      shopCost: 26,
      apply: (run) => {
        run.player.stats.dealerBustBonusDamage += 3;
        run.player.stats.standWinDamage += 2;
      },
    },
    {
      id: "stacked-vault",
      name: "Stacked Vault",
      rarity: "rare",
      unlock: { key: "chipsEarned", min: 1600, label: "Earn 1600 chips total" },
      description: "+40% chips from enemy payouts and +2 chips on win.",
      color: "#f0c27e",
      shopCost: 29,
      apply: (run) => {
        run.player.stats.goldMultiplier += 0.4;
        run.player.stats.chipsOnWinHand += 2;
      },
    },
    {
      id: "abyss-contract",
      name: "Abyss Contract",
      rarity: "legendary",
      unlock: { key: "runsWon", min: 3, label: "Win 3 runs" },
      description: "+2 damage, +1 block, +8% crit, and +2 first-hand damage.",
      color: "#ff8e79",
      shopCost: 38,
      apply: (run) => {
        run.player.stats.flatDamage += 2;
        run.player.stats.block += 1;
        run.player.stats.critChance += 0.08;
        run.player.stats.firstHandDamage += 2;
      },
    },
    {
      id: "gambler-royale",
      name: "Gambler Royale",
      rarity: "legendary",
      unlock: { key: "blackjacks", min: 30, label: "Hit 30 blackjacks" },
      description: "+4 blackjack damage, +3 double-win damage, and +1 split-win damage.",
      color: "#f9b671",
      shopCost: 40,
      apply: (run) => {
        run.player.stats.blackjackBonusDamage += 4;
        run.player.stats.doubleWinDamage += 3;
        run.player.stats.splitWinDamage += 1;
      },
    },
    {
      id: "time-bank",
      name: "Time Bank",
      rarity: "legendary",
      unlock: { key: "enemiesDefeated", min: 90, label: "Defeat 90 enemies" },
      description: "+1 bust guard each encounter, +3 heal at encounter start, and +3 chips on push.",
      color: "#89f1d0",
      shopCost: 37,
      apply: (run) => {
        run.player.stats.bustGuardPerEncounter += 1;
        run.player.stats.healOnEncounterStart += 3;
        run.player.stats.chipsOnPush += 3;
      },
    },
    {
      id: "null-wallet",
      name: "Null Wallet",
      rarity: "legendary",
      unlock: { key: "chipsEarned", min: 5000, label: "Earn 5000 chips total" },
      description: "+55% payout chips, +3 chips on win, and +2 chips on push.",
      color: "#ffcc89",
      shopCost: 42,
      apply: (run) => {
        run.player.stats.goldMultiplier += 0.55;
        run.player.stats.chipsOnWinHand += 3;
        run.player.stats.chipsOnPush += 2;
      },
    },
    {
      id: "house-edge-breaker",
      name: "House Edge Breaker",
      rarity: "legendary",
      unlock: { key: "runsWon", min: 4, label: "Win 4 runs" },
      description: "+3 elite/boss damage, +1 damage, and +2 block.",
      color: "#ff9d84",
      shopCost: 39,
      apply: (run) => {
        run.player.stats.eliteDamage += 3;
        run.player.stats.flatDamage += 1;
        run.player.stats.block += 2;
      },
    },
    {
      id: "kings-insurance",
      name: "King's Insurance",
      rarity: "legendary",
      unlock: { key: "runsWon", min: 5, label: "Win 5 runs" },
      description: "+2 bust guards each encounter and +3 double-loss block.",
      color: "#79d9db",
      shopCost: 40,
      apply: (run) => {
        run.player.stats.bustGuardPerEncounter += 2;
        run.player.stats.doubleLossBlock += 3;
      },
    },
    {
      id: "void-credit",
      name: "Void Credit",
      rarity: "legendary",
      unlock: { key: "chipsEarned", min: 6500, label: "Earn 6500 chips total" },
      description: "+2 damage, +35% chips from payouts, and +2 chips on pushes.",
      color: "#ffb384",
      shopCost: 41,
      apply: (run) => {
        run.player.stats.flatDamage += 2;
        run.player.stats.goldMultiplier += 0.35;
        run.player.stats.chipsOnPush += 2;
      },
    },
  ];

  const BOSS_RELIC = {
    id: "crown-of-odds",
    name: "Crown of Odds",
    rarity: "legendary",
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

  function normalizeRelicRarity(rarity) {
    if (typeof rarity === "string" && RELIC_RARITY_META[rarity]) {
      return rarity;
    }
    return "common";
  }

  function relicRarityMeta(relic) {
    const rarity = normalizeRelicRarity(relic?.rarity);
    return RELIC_RARITY_META[rarity];
  }

  function profileCollectionCount(profile) {
    if (!profile || typeof profile.relicCollection !== "object" || !profile.relicCollection) {
      return 0;
    }
    let total = 0;
    for (const value of Object.values(profile.relicCollection)) {
      total += nonNegInt(value, 0);
    }
    return total;
  }

  function profileDistinctCollectionCount(profile) {
    if (!profile || typeof profile.relicCollection !== "object" || !profile.relicCollection) {
      return 0;
    }
    let total = 0;
    for (const value of Object.values(profile.relicCollection)) {
      if (nonNegInt(value, 0) > 0) {
        total += 1;
      }
    }
    return total;
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
  const ENEMY_AVATAR_BY_NAME = {
    "Pit Croupier": "pit-croupier",
    "Tin Dealer": "tin-dealer",
    "Shiv Shark": "shiv-shark",
    "Brick Smiler": "brick-smiler",
    "Card Warden": "card-warden",
    "Ash Gambler": "ash-gambler",
    "Velvet Reaper": "velvet-reaper",
    "Latch Queen": "latch-queen",
    "Bone Accountant": "bone-accountant",
    "Stack Baron": "stack-baron",
    "The House": "the-house",
    "Abyss Banker": "abyss-banker",
    "Null Dealer": "null-dealer",
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
    handTackles: [],
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
      gruntElement: null,
      gruntSourceIndex: 0,
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
    collectionUi: null,
    collectionPage: 0,
    pendingTransition: null,
    menuSparks: [],
    handMessageAnchor: null,
    combatLayout: null,
    logsFeedSignature: "",
    collectionDomSignature: "",
    passiveRailSignature: "",
    passiveModalSignature: "",
    passiveTooltipTimer: 0,
    worldTime: 0,
    menuArtRect: null,
    viewport: {
      width: WIDTH,
      height: HEIGHT,
      scale: 1,
      cropWorldX: 0,
      portraitZoomed: false,
    },
    menuDesktopScale: 1,
    uiMobileSignature: "",
    uiMobileViewportSignature: "",
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
    run.shopPurchaseMade = Boolean(runLike.shopPurchaseMade);
    run.blackjacks = nonNegInt(runLike.blackjacks, 0);
    run.doublesWon = nonNegInt(runLike.doublesWon, 0);
    run.splitsUsed = nonNegInt(runLike.splitsUsed, 0);
    run.pushes = nonNegInt(runLike.pushes, 0);

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
    if (Array.isArray(runLike.eventLog)) {
      run.eventLog = runLike.eventLog
        .slice(0, 240)
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0);
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

    const splitQueue = Array.isArray(encounterLike.splitQueue)
      ? encounterLike.splitQueue
          .map((hand) => sanitizeCardList(hand))
          .filter((hand) => hand.length > 0)
          .slice(0, MAX_SPLIT_HANDS - 1)
      : [];
    const splitHandsTotalDefault = Math.max(1, Math.min(MAX_SPLIT_HANDS, 1 + splitQueue.length));
    const splitHandsTotal = Math.max(
      splitHandsTotalDefault,
      Math.min(MAX_SPLIT_HANDS, nonNegInt(encounterLike.splitHandsTotal, splitHandsTotalDefault))
    );
    const splitHandsResolved = Math.min(
      Math.max(0, nonNegInt(encounterLike.splitHandsResolved, 0)),
      Math.max(0, splitHandsTotal - 1)
    );

    const encounter = {
      enemy,
      shoe: sanitizeCardList(encounterLike.shoe),
      discard: sanitizeCardList(encounterLike.discard),
      playerHand: sanitizeCardList(encounterLike.playerHand),
      dealerHand: sanitizeCardList(encounterLike.dealerHand),
      splitQueue,
      splitUsed: Boolean(encounterLike.splitUsed),
      splitHandsTotal,
      splitHandsResolved,
      dealerResolved: Boolean(encounterLike.dealerResolved),
      hideDealerHole: Boolean(encounterLike.hideDealerHole),
      phase: ["player", "dealer", "resolve", "done"].includes(encounterLike.phase) ? encounterLike.phase : "player",
      resultText: typeof encounterLike.resultText === "string" ? encounterLike.resultText : "",
      resultTone: ["neutral", "win", "loss", "push", "special"].includes(encounterLike.resultTone)
        ? encounterLike.resultTone
        : "neutral",
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
    state.handTackles = [];
    state.flashOverlays = [];
    state.screenShakeTime = 0;
    state.screenShakeDuration = 0;
    state.screenShakePower = 0;
    state.pendingTransition = null;
    state.combatLayout = null;
    state.autosaveTimer = 0;
    if (state.run && Array.isArray(state.run.log)) {
      state.run.log = [];
    }
    state.logsFeedSignature = "";
    state.passiveRailSignature = "";
    hidePassiveTooltip();
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
    totals.blackjacks += run.blackjacks || 0;
    totals.doublesWon += run.doublesWon || 0;
    totals.splitsUsed += run.splitsUsed || 0;
    totals.pushes += run.pushes || 0;
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
      shopPurchaseMade: false,
      blackjacks: 0,
      doublesWon: 0,
      splitsUsed: 0,
      pushes: 0,
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
      eventLog: [],
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
    const name = pickEnemyName(type);
    const avatarKey = ENEMY_AVATAR_BY_NAME[name] || sanitizeEnemyAvatarKey(name);
    ensureEnemyAvatarLoaded(avatarKey);

    const baseHp = 14 + floor * 4 + room * 2;
    const hp =
      type === "boss"
        ? baseHp + 30
        : type === "elite"
          ? baseHp + 12
          : baseHp;

    const attack =
      type === "boss"
        ? 4 + floor + (floor >= 3 ? 1 : 0)
        : type === "elite"
          ? 2 + floor
          : Math.max(1, floor);

    const goldDrop =
      type === "boss"
        ? 34 + floor * 9
        : type === "elite"
          ? 22 + floor * 6
          : 10 + floor * 4 + room * 2;

    return {
      name,
      avatarKey,
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
    if (isLogsModalOpen()) {
      renderLogsFeed();
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

  function logsFeedSignature(run = state.run) {
    const entries = getRunEventLog(run);
    const first = entries[0] || "";
    const last = entries[entries.length - 1] || "";
    return `${entries.length}|${first}|${last}`;
  }

  function renderLogsFeed(force = false) {
    if (!logsFeed) {
      return;
    }
    const signature = logsFeedSignature();
    if (!force && signature === state.logsFeedSignature) {
      return;
    }
    state.logsFeedSignature = signature;
    logsFeed.textContent = "";
    const entries = getRunEventLog();
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "log-empty";
      empty.textContent = "No events yet.";
      logsFeed.appendChild(empty);
      return;
    }
    for (let i = 0; i < entries.length; i += 1) {
      const row = document.createElement("div");
      row.className = "log-row";
      row.textContent = entries[i];
      logsFeed.appendChild(row);
    }
    logsFeed.scrollTop = logsFeed.scrollHeight;
  }

  function isCollectionModalOpen() {
    return Boolean(collectionModal && !collectionModal.hidden);
  }

  function renderCollectionModal(force = false) {
    if (!collectionList || !collectionStats) {
      return;
    }
    const entries = collectionEntries();
    const unlockedCount = entries.filter((entry) => entry.unlocked).length;
    const foundCount = entries.filter((entry) => entry.copies > 0).length;
    const totalCopies = entries.reduce((acc, entry) => acc + entry.copies, 0);
    const signature = entries.map((entry) => `${entry.relic.id}:${entry.unlocked ? 1 : 0}:${entry.copies}`).join("|");
    if (!force && signature === state.collectionDomSignature) {
      return;
    }
    state.collectionDomSignature = signature;

    collectionStats.textContent = `Unlocked ${unlockedCount}/${entries.length} | Found ${foundCount}/${entries.length} | Copies ${totalCopies}`;
    collectionList.textContent = "";

    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = `collection-row${entry.unlocked ? "" : " locked"}`;

      const thumb = document.createElement("div");
      thumb.className = "collection-thumb";
      if (entry.unlocked) {
        const thumbUrl = passiveThumbUrl(entry.relic);
        if (thumbUrl) {
          thumb.style.backgroundImage = `url("${thumbUrl}")`;
        }
      } else {
        thumb.style.opacity = "0.55";
      }

      const meta = document.createElement("div");
      meta.className = "collection-meta";
      const top = document.createElement("div");
      top.className = "row-top";
      const rarity = document.createElement("span");
      rarity.className = "collection-rarity";
      rarity.textContent = entry.rarityLabel.toUpperCase();
      const name = document.createElement("div");
      name.className = "collection-name";
      name.textContent = entry.unlocked ? entry.relic.name : "LOCKED";
      top.appendChild(rarity);
      top.appendChild(name);

      const desc = document.createElement("div");
      desc.className = "collection-desc";
      desc.textContent = entry.unlocked ? passiveDescription(entry.relic.description) : entry.unlockText;
      meta.appendChild(top);
      meta.appendChild(desc);

      const owned = document.createElement("div");
      owned.className = "collection-owned";
      if (entry.copies <= 0) {
        owned.classList.add("none");
      }
      owned.textContent = entry.copies > 0 ? `OWNED ${entry.copies > 99 ? "99+" : entry.copies}` : "NONE";

      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(owned);
      fragment.appendChild(row);
    });
    collectionList.appendChild(fragment);
  }

  function isLogsModalOpen() {
    return Boolean(logsModal && !logsModal.hidden);
  }

  function openLogsModal() {
    if (!logsModal || !state.run) {
      return;
    }
    logsModal.hidden = false;
    renderLogsFeed(true);
  }

  function closeLogsModal() {
    if (!logsModal) {
      return;
    }
    logsModal.hidden = true;
  }

  function toggleLogsModal() {
    if (isLogsModalOpen()) {
      closeLogsModal();
      return;
    }
    openLogsModal();
  }

  function hashSeed(text) {
    const source = typeof text === "string" ? text : "";
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandFactory(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6d2b79f5) >>> 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function passiveThumbUrl(relic) {
    if (!relic || !relic.id) {
      return "";
    }
    if (passiveThumbCache.has(relic.id)) {
      return passiveThumbCache.get(relic.id);
    }
    const offscreen = document.createElement("canvas");
    offscreen.width = 112;
    offscreen.height = 144;
    const pctx = offscreen.getContext("2d");
    if (!pctx) {
      return "";
    }
    const rand = seededRandFactory(hashSeed(relic.id));
    const grad = pctx.createLinearGradient(0, 0, offscreen.width, offscreen.height);
    grad.addColorStop(0, "#0e2234");
    grad.addColorStop(1, "#081420");
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, offscreen.width, offscreen.height);

    const glow = pctx.createRadialGradient(
      offscreen.width * 0.5,
      offscreen.height * (0.2 + rand() * 0.25),
      2,
      offscreen.width * 0.5,
      offscreen.height * 0.5,
      offscreen.height * 0.8
    );
    glow.addColorStop(0, applyAlpha(relic.color || "#9ed6ff", 0.92));
    glow.addColorStop(1, applyAlpha("#07121d", 0));
    pctx.fillStyle = glow;
    pctx.fillRect(0, 0, offscreen.width, offscreen.height);

    for (let i = 0; i < 22; i += 1) {
      const x = rand() * offscreen.width;
      const y = rand() * offscreen.height;
      const w = 18 + rand() * 46;
      const h = 8 + rand() * 24;
      const rot = (rand() - 0.5) * 1.9;
      pctx.save();
      pctx.translate(x, y);
      pctx.rotate(rot);
      pctx.fillStyle = applyAlpha(relic.color || "#9ed6ff", 0.12 + rand() * 0.22);
      pctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      pctx.restore();
    }

    pctx.fillStyle = applyAlpha("#f6e8b8", 0.86);
    pctx.font = '700 32px "Chakra Petch", sans-serif';
    pctx.textAlign = "center";
    pctx.fillText((relic.name || "?").slice(0, 1).toUpperCase(), offscreen.width * 0.5, offscreen.height * 0.6);

    const url = offscreen.toDataURL("image/png");
    passiveThumbCache.set(relic.id, url);
    return url;
  }

  function showPassiveTooltip(relic, count, clientX, clientY) {
    if (!passiveTooltip || !relic) {
      return;
    }
    passiveTooltip.textContent = "";
    const title = document.createElement("strong");
    title.textContent = `${relic.name}${count > 1 ? ` x${count}` : ""}`;
    const body = document.createElement("div");
    body.textContent = passiveDescription(relic.description);
    passiveTooltip.appendChild(title);
    passiveTooltip.appendChild(body);
    passiveTooltip.hidden = false;
    positionPassiveTooltip(clientX, clientY);
  }

  function positionPassiveTooltip(clientX, clientY) {
    if (!passiveTooltip || passiveTooltip.hidden) {
      return;
    }
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 1280;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 720;
    const pad = 10;
    const anchorX = Number.isFinite(clientX) ? clientX : pad;
    const anchorY = Number.isFinite(clientY) ? clientY : pad;
    let left = anchorX + 14;
    let top = anchorY + 14;

    const rect = passiveTooltip.getBoundingClientRect();
    if (left + rect.width + pad > viewportW) {
      left = viewportW - rect.width - pad;
    }
    if (top + rect.height + pad > viewportH) {
      top = viewportH - rect.height - pad;
    }

    passiveTooltip.style.left = `${Math.max(pad, left)}px`;
    passiveTooltip.style.top = `${Math.max(pad, top)}px`;
  }

  function hidePassiveTooltip() {
    if (!passiveTooltip) {
      return;
    }
    passiveTooltip.hidden = true;
    state.passiveTooltipTimer = 0;
  }

  function passiveStacksForRun(run = state.run) {
    if (!run || !run.player || !run.player.relics) {
      return [];
    }
    return Object.entries(run.player.relics || {})
      .map(([id, count]) => ({
        relic: RELIC_BY_ID.get(id),
        count: nonNegInt(count, 0),
      }))
      .filter((entry) => entry.relic && entry.count > 0)
      .sort((a, b) => {
        const countDelta = b.count - a.count;
        if (countDelta !== 0) {
          return countDelta;
        }
        return a.relic.name.localeCompare(b.relic.name);
      });
  }

  function isPassiveModalOpen() {
    return Boolean(passiveModal && !passiveModal.hidden);
  }

  function renderPassiveModal(force = false) {
    if (!passiveModalList || !passiveModalStats) {
      return;
    }
    const stacks = passiveStacksForRun();
    const totalPassives = stacks.reduce((acc, entry) => acc + entry.count, 0);
    const signature = stacks.map((entry) => `${entry.relic.id}:${entry.count}`).join("|");
    if (!force && signature === state.passiveModalSignature) {
      return;
    }
    state.passiveModalSignature = signature;
    passiveModalStats.textContent = `Total passives ${totalPassives} | Unique types ${stacks.length}`;
    passiveModalList.textContent = "";

    if (!stacks.length) {
      const empty = document.createElement("div");
      empty.className = "log-empty";
      empty.textContent = "No passives yet.";
      passiveModalList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    stacks.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "collection-row";

      const thumb = document.createElement("div");
      thumb.className = "collection-thumb";
      const thumbUrl = passiveThumbUrl(entry.relic);
      if (thumbUrl) {
        thumb.style.backgroundImage = `url("${thumbUrl}")`;
      }

      const meta = document.createElement("div");
      meta.className = "collection-meta";
      const top = document.createElement("div");
      top.className = "row-top";
      const rarity = document.createElement("span");
      rarity.className = "collection-rarity";
      rarity.textContent = relicRarityMeta(entry.relic).label.toUpperCase();
      const name = document.createElement("div");
      name.className = "collection-name";
      name.textContent = entry.relic.name;
      top.appendChild(rarity);
      top.appendChild(name);

      const desc = document.createElement("div");
      desc.className = "collection-desc";
      desc.textContent = passiveDescription(entry.relic.description);
      meta.appendChild(top);
      meta.appendChild(desc);

      const owned = document.createElement("div");
      owned.className = "collection-owned";
      owned.textContent = `STACK ${entry.count > 99 ? "99+" : entry.count}`;

      row.appendChild(thumb);
      row.appendChild(meta);
      row.appendChild(owned);
      fragment.appendChild(row);
    });

    passiveModalList.appendChild(fragment);
  }

  function openPassiveModal() {
    if (!passiveModal || !state.run) {
      return;
    }
    hidePassiveTooltip();
    passiveModal.hidden = false;
    renderPassiveModal(true);
  }

  function closePassiveModal() {
    if (!passiveModal) {
      return;
    }
    passiveModal.hidden = true;
  }

  function syncPassiveRail() {
    if (!passiveRail) {
      return;
    }
    if (!state.run || state.mode === "menu" || state.mode === "reward" || state.mode === "shop") {
      passiveRail.textContent = "";
      state.passiveRailSignature = "";
      hidePassiveTooltip();
      return;
    }

    const relicStacks = passiveStacksForRun();

    const signature = relicStacks.map((entry) => `${entry.relic.id}:${entry.count}`).join("|");
    if (signature === state.passiveRailSignature) {
      return;
    }
    state.passiveRailSignature = signature;
    passiveRail.textContent = "";
    hidePassiveTooltip();

    if (!relicStacks.length) {
      return;
    }

    const totalPassives = relicStacks.reduce((acc, entry) => acc + entry.count, 0);
    if (totalPassives >= 9) {
      const summary = document.createElement("button");
      summary.type = "button";
      summary.className = "passive-card passive-stack-summary";
      summary.setAttribute("aria-label", `Open passives (${totalPassives})`);

      const fan = document.createElement("span");
      fan.className = "stack-fan";
      relicStacks.slice(0, 4).forEach((entry, idx) => {
        const card = document.createElement("span");
        card.className = "fan-card";
        const thumbUrl = passiveThumbUrl(entry.relic);
        if (thumbUrl) {
          card.style.backgroundImage = `url("${thumbUrl}")`;
        }
        card.style.left = `${8 + idx * 12}px`;
        card.style.top = `${6 + Math.abs(1.5 - idx) * 2}px`;
        fan.appendChild(card);
      });
      summary.appendChild(fan);

      const stack = document.createElement("span");
      stack.className = "stack";
      stack.textContent = totalPassives > 99 ? "99+" : String(totalPassives);
      summary.appendChild(stack);

      summary.addEventListener("click", (event) => {
        openPassiveModal();
        event.preventDefault();
      });
      passiveRail.appendChild(summary);
      return;
    }

    const fragment = document.createDocumentFragment();
    relicStacks.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "passive-card";
      button.setAttribute("aria-label", `${entry.relic.name} x${entry.count}`);

      const thumb = document.createElement("span");
      thumb.className = "thumb";
      const thumbUrl = passiveThumbUrl(entry.relic);
      if (thumbUrl) {
        thumb.style.backgroundImage = `url("${thumbUrl}")`;
      }
      button.appendChild(thumb);

      const stack = document.createElement("span");
      stack.className = "stack";
      stack.textContent = entry.count > 99 ? "99+" : String(entry.count);
      button.appendChild(stack);

      button.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "touch") {
          return;
        }
        showPassiveTooltip(entry.relic, entry.count, event.clientX, event.clientY);
      });
      button.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") {
          return;
        }
        positionPassiveTooltip(event.clientX, event.clientY);
      });
      button.addEventListener("pointerleave", (event) => {
        if (event.pointerType === "touch") {
          return;
        }
        hidePassiveTooltip();
      });
      button.addEventListener("click", (event) => {
        const rect = button.getBoundingClientRect();
        showPassiveTooltip(entry.relic, entry.count, rect.right, rect.top + rect.height * 0.5);
        state.passiveTooltipTimer = state.compactControls ? 2.6 : 4;
        event.preventDefault();
      });

      fragment.appendChild(button);
    });

    passiveRail.appendChild(fragment);
  }

  function alignTopRightActionsToHudRow() {
    if (!topRightActions || topRightActions.hidden || state.mode === "menu" || state.mode === "collection" || !state.run) {
      if (topRightActions) {
        topRightActions.style.left = "";
        topRightActions.style.right = "";
        topRightActions.style.top = "";
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const row = hudRowMetrics();
    const statsH = row.statsH;
    const scale = Math.max(0.0001, state.viewport?.scale || 1);
    const worldCenterY = row.rowTopY + statsH * 0.5;
    const screenCenterY = rect.top + worldCenterY * scale;
    const actionW = Math.max(42, topRightActions.offsetWidth || 48);
    const actionH = Math.max(42, topRightActions.offsetHeight || 58);
    const rightInset = 8;
    const safePad = 6;
    const targetLeft = rect.right - actionW - rightInset;
    const clampedLeft = clampNumber(targetLeft, safePad, Math.max(safePad, window.innerWidth - actionW - safePad), targetLeft);
    const targetTop = screenCenterY - actionH * 0.5;
    const clampedTop = clampNumber(targetTop, safePad, Math.max(safePad, window.innerHeight - actionH - safePad), targetTop);

    topRightActions.style.left = `${Math.round(clampedLeft)}px`;
    topRightActions.style.right = "auto";
    topRightActions.style.top = `${Math.round(clampedTop)}px`;
  }

  function alignPassiveRailToCombatLayout() {
    if (!passiveRail) {
      return;
    }
    if (
      !state.run ||
      state.mode === "menu" ||
      state.mode === "collection" ||
      state.mode === "reward" ||
      state.mode === "shop" ||
      !state.combatLayout ||
      !state.combatLayout.playerPassiveAnchor
    ) {
      passiveRail.style.left = "";
      passiveRail.style.top = "";
      passiveRail.style.transform = "";
      return;
    }
    const railH = Math.max(0, passiveRail.offsetHeight || 0);
    const anchor = state.combatLayout.playerPassiveAnchor;
    passiveRail.style.left = `${Math.round(anchor.x)}px`;
    passiveRail.style.top = `${Math.round(anchor.yBottom - railH)}px`;
    passiveRail.style.transform = "";
  }

  function syncOverlayUi() {
    const runActive = Boolean(state.run);
    const menuActive = state.mode === "menu";
    const collectionActive = state.mode === "collection";
    if (menuHome) {
      menuHome.hidden = !menuActive;
    }
    if (collectionModal) {
      collectionModal.hidden = !collectionActive;
      if (collectionActive) {
        renderCollectionModal();
      }
    }
    if (menuResume) {
      menuResume.disabled = !hasSavedRun();
    }
    const showAchievements = false;
    const showLogs = runActive && state.mode !== "menu" && state.mode !== "collection";
    if (topRightActions) {
      topRightActions.hidden = !(showAchievements || showLogs);
    }
    if (achievementsToggle) {
      achievementsToggle.hidden = !showAchievements;
    }
    if (logsToggle) {
      logsToggle.hidden = !showLogs;
    }
    if ((!runActive || state.mode === "menu" || state.mode === "collection" || (logsToggle && logsToggle.hidden)) && isLogsModalOpen()) {
      closeLogsModal();
    }
    if ((!runActive || state.mode === "menu" || state.mode === "collection") && isPassiveModalOpen()) {
      closePassiveModal();
    }
    if (!collectionActive) {
      state.collectionDomSignature = "";
    }
    if (isPassiveModalOpen()) {
      renderPassiveModal();
    } else {
      state.passiveModalSignature = "";
    }
    if (isLogsModalOpen()) {
      renderLogsFeed();
    }
    syncPassiveRail();
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

  function playGruntSfx() {
    if (!canPlayAudio()) {
      return;
    }
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

  function triggerHandTackle(winner, amount) {
    if (!state.encounter) {
      return;
    }
    const points = handTackleTargets(winner);
    if (!points) {
      return;
    }
    const layout = state.combatLayout || null;
    const sourceRects = winner === "enemy" ? layout?.dealerCards : layout?.playerCards;
    const sourceHand = winner === "enemy" ? state.encounter.dealerHand : state.encounter.playerHand;
    const count = Math.min(4, sourceHand.length);
    if (count <= 0) {
      return;
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
    });
  }

  function startDefeatTransition(target) {
    if (!state.encounter || state.pendingTransition) {
      return;
    }
    const handType = target === "enemy" ? "dealer" : "player";
    const hand = target === "enemy" ? state.encounter.dealerHand : state.encounter.playerHand;
    const bounds = handBounds(handType, Math.max(1, hand.length));
    const color = target === "enemy" ? "#ffb07a" : "#ff8eaf";
    for (let i = 0; i < 3; i += 1) {
      const xJitter = (Math.random() * 2 - 1) * 24;
      const yJitter = (Math.random() * 2 - 1) * 18;
      spawnSparkBurst(bounds.centerX + xJitter, bounds.centerY + yJitter, color, 24 + i * 12, 210 + i * 70);
    }
    triggerScreenShake(12, 0.46);
    triggerFlash(color, 0.14, 0.28);
    playImpactSfx(16, target === "enemy" ? "enemy" : "player");
    state.pendingTransition = { target, timer: 1.02 };
    state.encounter.phase = "done";
    state.encounter.resolveTimer = 0;
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

  function handLayout(count) {
    const safeCount = Math.max(1, count);
    const cardsPerRow = 6;
    const rows = Math.max(1, Math.ceil(safeCount / cardsPerRow));
    const baseScale = 1 - Math.max(0, safeCount - 4) * 0.06 - (rows - 1) * 0.12;
    const scale = clampNumber(baseScale, 0.54, 1, 1);
    const w = Math.max(52, Math.round(CARD_W * scale));
    const h = Math.max(74, Math.round(CARD_H * scale));
    return {
      cardsPerRow,
      rows,
      w,
      h,
      // Keep hands visually tighter without moving the overall hand anchors.
      spacing: Math.max(Math.round(w * 0.56), 34),
      rowStep: Math.max(Math.round(h * 0.34), 26),
    };
  }

  function handCardPosition(handType, index, count) {
    const metrics = handLayout(count);
    const portraitOffset = state.viewport?.portraitZoomed ? 72 : 0;
    const baseY = handType === "dealer" ? 190 + portraitOffset : 486 + portraitOffset;
    const row = Math.floor(index / metrics.cardsPerRow);
    const rowCount = Math.max(1, Math.ceil(count / metrics.cardsPerRow));
    const rowStartIndex = row * metrics.cardsPerRow;
    const rowItems = Math.min(metrics.cardsPerRow, Math.max(0, count - rowStartIndex));
    const col = index - rowStartIndex;
    const startX = WIDTH * 0.5 - ((rowItems - 1) * metrics.spacing) * 0.5 - metrics.w * 0.5;
    const y = handType === "dealer" ? baseY + row * metrics.rowStep : baseY - row * metrics.rowStep;
    return {
      x: startX + col * metrics.spacing,
      y,
      w: metrics.w,
      h: metrics.h,
      row,
      rows: rowCount,
    };
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
      splitHandsTotal: 1,
      splitHandsResolved: 0,
      dealerResolved: false,
      hideDealerHole: true,
      phase: "player",
      resultText: "",
      resultTone: "neutral",
      resolveTimer: 0,
      nextDealPrompted: false,
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
    setAnnouncement(`${enemy.name} enters the table.`, 1.9);
    addLog(`${enemy.name} enters the table.`);

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
    state.handTackles = [];
    state.flashOverlays = [];
    state.screenShakeTime = 0;
    state.screenShakeDuration = 0;
    state.screenShakePower = 0;
    state.pendingTransition = null;
    state.combatLayout = null;
    state.logsFeedSignature = "";
    state.passiveRailSignature = "";
    hidePassiveTooltip();
    closeLogsModal();
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

  function canAdvanceDeal() {
    return (
      state.mode === "playing" &&
      Boolean(state.encounter) &&
      state.encounter.phase === "resolve" &&
      !state.pendingTransition &&
      state.encounter.resolveTimer <= 0 &&
      state.handTackles.length === 0
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
    if (!canPlayerAct() || !state.encounter) {
      return false;
    }
    const encounter = state.encounter;
    if (encounter.doubleDown || encounter.playerHand.length !== 2) {
      return false;
    }
    if (activeSplitHandCount(encounter) >= MAX_SPLIT_HANDS) {
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
    encounter.hideDealerHole = !encounter.dealerResolved;
    encounter.phase = "player";
    encounter.resultText = "";
    encounter.resultTone = "neutral";
    encounter.resolveTimer = 0;
    encounter.nextDealPrompted = false;
    encounter.doubleDown = false;
    encounter.bustGuardTriggered = false;
    encounter.critTriggered = false;
    encounter.lastPlayerAction = "split";
    dealCard(encounter, "player");

    if (announcementText) {
      setAnnouncement(announcementText, announcementDuration);
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
    addLog("Dealer hand stays locked across split hands.");
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

    if (outgoing > 0) {
      enemy.hp = Math.max(0, enemy.hp - outgoing);
      run.player.totalDamageDealt += outgoing;
      if (encounter.critTriggered) {
        spawnFloatText(`CRIT -${outgoing}`, WIDTH * 0.72, 124, "#ffe4a8", {
          size: 58,
          life: 1.45,
          vy: 9,
          weight: 800,
          jitter: true,
          glow: "#ffb86a",
        });
      } else {
        spawnFloatText(`-${outgoing}`, WIDTH * 0.72, 108, "#ff916e");
      }
      triggerImpactBurst("enemy", outgoing, outcome === "blackjack" ? "#f8d37b" : "#ff916e");
      triggerHandTackle("player", outgoing);
    }

    if (incoming > 0) {
      run.player.hp = Math.max(0, run.player.hp - incoming);
      run.player.totalDamageTaken += incoming;
      run.player.streak = 0;
      spawnFloatText(`-${incoming}`, WIDTH * 0.26, 576, "#ff86aa");
      triggerImpactBurst("player", incoming, "#ff86aa");
      triggerHandTackle("enemy", incoming);
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
    updateProfileBest(run);

    if (run.player.hp <= 0) {
      startDefeatTransition("player");
      setAnnouncement("You were defeated.", 1.2);
      addLog("You were defeated.");
      saveRunSnapshot();
      return;
    }

    if (enemy.hp <= 0) {
      startDefeatTransition("enemy");
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
      run.shopPurchaseMade = false;
      state.selectionIndex = 0;
      state.shopStock = generateShopStock(3);
      setAnnouncement("Black market table unlocked.", 2);
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
      setAnnouncement("Only one purchase per market.", 1.35);
      addLog("Black market allows one purchase only.");
      return;
    }
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
    run.shopPurchaseMade = true;
    saveRunSnapshot();
  }

  function leaveShop() {
    if (state.mode !== "shop") {
      return;
    }
    playUiSfx("confirm");
    addLog("Left black market.");
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

  function collectionEntries(profile = state.profile) {
    const safeProfile = profile || createProfile();
    const relics = [...RELICS, BOSS_RELIC];
    return relics
      .map((relic) => {
        const rarity = normalizeRelicRarity(relic.rarity);
        return {
          relic,
          rarity,
          rarityLabel: RELIC_RARITY_META[rarity].label,
          unlocked: isRelicUnlocked(relic, safeProfile),
          unlockText: relicUnlockLabel(relic, safeProfile),
          copies: nonNegInt(safeProfile.relicCollection?.[relic.id], 0),
        };
      })
      .sort((a, b) => {
        const rarityDelta = RELIC_RARITY_ORDER.indexOf(a.rarity) - RELIC_RARITY_ORDER.indexOf(b.rarity);
        if (rarityDelta !== 0) {
          return rarityDelta;
        }
        return a.relic.name.localeCompare(b.relic.name);
      });
  }

  function collectionPageLayout() {
    const portrait = Boolean(state.viewport?.portraitZoomed);
    if (portrait) {
      return { cols: 2, rows: 3 };
    }
    if (state.compactControls) {
      return { cols: 3, rows: 3 };
    }
    return { cols: 4, rows: 3 };
  }

  function openCollection(page = 0) {
    playUiSfx("confirm");
    state.mode = "collection";
    state.collectionPage = Math.max(0, nonNegInt(page, 0));
    state.collectionUi = null;
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
      if (action === "right") {
        return "A";
      }
      if (action === "confirm") {
        return "Enter";
      }
      return "";
    }

    if (state.mode === "collection") {
      if (action === "left") {
        return "←";
      }
      if (action === "right") {
        return "→";
      }
      if (action === "confirm") {
        return "Enter / Space / A";
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
        return canAdvanceDeal() ? "Enter" : canSplitCurrentHand() ? "S" : "";
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
        return "Enter";
      }
      return "";
    }

    return "";
  }

  function iconForAction(action, label) {
    const lower = (label || "").toLowerCase();
    if (action === "hit") {
      return ACTION_ICON_FILES.hit;
    }
    if (action === "stand") {
      return ACTION_ICON_FILES.stand;
    }
    if (action === "double") {
      if (state.mode === "shop" || lower === "buy") {
        return ACTION_ICON_FILES.chips;
      }
      return ACTION_ICON_FILES.double;
    }
    if (action === "left") {
      if (state.mode === "menu") {
        return lower === "resume" ? ACTION_ICON_FILES.resume : ACTION_ICON_FILES.deal;
      }
      return "";
    }
    if (action === "right") {
      if (state.mode === "menu") {
        return ACTION_ICON_FILES.achievements;
      }
      return "";
    }
    if (action === "confirm") {
      if (state.mode === "menu") {
        return ACTION_ICON_FILES.newRun;
      }
      if (state.mode === "playing") {
        if (lower === "new deal") {
          return ACTION_ICON_FILES.deal;
        }
        if (lower === "split") {
          return ACTION_ICON_FILES.split;
        }
        return ACTION_ICON_FILES.deal;
      }
      if (state.mode === "reward" || lower === "claim") {
        return "";
      }
      if (state.mode === "shop" || lower === "continue") {
        return ACTION_ICON_FILES.deal;
      }
      if (lower === "back") {
        return ACTION_ICON_FILES.achievements;
      }
      return ACTION_ICON_FILES.deal;
    }
    return "";
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
    const rawShortcut = shortcutHintForAction(button.dataset.mobileAction || "");
    const displayLabel = String(label || "").toUpperCase();
    if (labelNode.textContent !== displayLabel) {
      labelNode.textContent = displayLabel;
    }
    const icon = iconForAction(button.dataset.mobileAction || "", label);
    iconNode.style.backgroundImage = icon ? `url("${icon}")` : "";
    iconNode.textContent = "";
    iconNode.hidden = !icon;
    const inlineShortcut = !state.compactControls && rawShortcut ? ` (${rawShortcut})` : "";
    if (shortcutNode.textContent !== inlineShortcut) {
      shortcutNode.textContent = inlineShortcut;
    }
    shortcutNode.hidden = !inlineShortcut;
    button.setAttribute("aria-label", label);
    if (!visible) {
      clearMobileButtonAttention(button);
    }
  }

  function clearMobileButtonAttention(button) {
    if (!button) {
      return;
    }
    button.classList.remove("control-attention-pop");
    delete button.dataset.attentionToken;
  }

  function triggerMobileButtonAttention(button, token) {
    if (!button || !token) {
      return;
    }
    if (button.dataset.attentionToken === token) {
      return;
    }
    clearMobileButtonAttention(button);
    // Restart keyframe animation cleanly when a new token appears.
    void button.offsetWidth;
    button.dataset.attentionToken = token;
    button.classList.add("control-attention-pop");
  }

  function updateMobileControls() {
    if (!mobileControls || !mobileButtons) {
      state.mobileActive = false;
      state.compactControls = false;
      state.mobilePortrait = false;
      state.uiMobileSignature = "";
      state.uiMobileViewportSignature = "";
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

    const canAdvance = state.mode === "playing" ? canAdvanceDeal() : false;
    const canAct = state.mode === "playing" ? canPlayerAct() : false;
    const canDouble =
      state.mode === "playing" &&
      canAct &&
      state.encounter &&
      state.encounter.playerHand.length === 2 &&
      !state.encounter.doubleDown &&
      !state.encounter.splitUsed;
    const canSplit = state.mode === "playing" ? canSplitCurrentHand() : false;
    const viewportSignature = `${viewportWidth}x${viewportHeight}`;
    const mobileSignature = [
      state.mode,
      state.mobileActive ? 1 : 0,
      state.compactControls ? 1 : 0,
      state.mobilePortrait ? 1 : 0,
      state.selectionIndex,
      state.rewardOptions.length,
      state.shopStock.length,
      state.run ? state.run.player.gold : -1,
      state.run && state.run.shopPurchaseMade ? 1 : 0,
      canAdvance ? 1 : 0,
      canAct ? 1 : 0,
      canDouble ? 1 : 0,
      canSplit ? 1 : 0,
      state.encounter ? state.encounter.phase : "",
      state.encounter ? state.encounter.playerHand.length : 0,
      state.encounter && state.encounter.doubleDown ? 1 : 0,
      state.encounter && state.encounter.splitUsed ? 1 : 0,
    ].join("|");
    if (state.uiMobileSignature === mobileSignature && state.uiMobileViewportSignature === viewportSignature) {
      return;
    }
    state.uiMobileSignature = mobileSignature;
    state.uiMobileViewportSignature = viewportSignature;

    const showMobileControls = state.mobileActive && state.mode !== "menu" && state.mode !== "collection";
    mobileControls.classList.toggle("active", showMobileControls);
    document.body.classList.toggle("mobile-ui-active", state.mobileActive);
    document.body.classList.toggle("mobile-portrait-ui", state.mobilePortrait);
    document.body.classList.toggle("compact-controls", state.compactControls);
    document.body.classList.toggle("menu-screen", state.mode === "menu" || state.mode === "collection");
    mobileControls.classList.remove("reward-claim-only");
    mobileControls.classList.remove("single-action-only");

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
      Object.values(mobileButtons).forEach(clearMobileButtonAttention);
      setMobileButton(mobileButtons.left, "Resume", false, false);
      setMobileButton(mobileButtons.confirm, "New Run", false, false);
      setMobileButton(mobileButtons.right, "Collections", false, false);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      setMobileButton(mobileButtons.double, "Double", false, false);
      return;
    }

    if (state.mode === "collection") {
      return;
    }

    if (state.mode === "playing") {
      if (canAdvance) {
        setMobileButton(mobileButtons.confirm, "Deal", true, true);
        setMobileButton(mobileButtons.left, "Left", false, false);
        setMobileButton(mobileButtons.right, "Right", false, false);
        setMobileButton(mobileButtons.hit, "Hit", false, false);
        setMobileButton(mobileButtons.stand, "Stand", false, false);
        setMobileButton(mobileButtons.double, "Double", false, false);
        mobileControls.classList.add("single-action-only");
        if (mobileButtons.confirm) {
          triggerMobileButtonAttention(
            mobileButtons.confirm,
            `newdeal-${state.run?.totalHands || 0}-${state.encounter?.phase || "idle"}`
          );
        }
        return;
      }
      setMobileButton(mobileButtons.hit, "Hit", canAct, true);
      setMobileButton(mobileButtons.stand, "Stand", canAct, true);
      setMobileButton(mobileButtons.double, "Double", canDouble, true);
      setMobileButton(mobileButtons.confirm, "Split", canSplit, canSplit);
      setMobileButton(mobileButtons.left, "Left", false, false);
      setMobileButton(mobileButtons.right, "Right", false, false);
      if (canSplit && mobileButtons.confirm) {
        triggerMobileButtonAttention(
          mobileButtons.confirm,
          `split-${state.run?.totalHands || 0}-${state.encounter?.playerHand?.[0]?.rank || ""}-${state.encounter?.playerHand?.[1]?.rank || ""}`
        );
      } else if (mobileButtons.confirm) {
        clearMobileButtonAttention(mobileButtons.confirm);
      }
      return;
    }

    if (state.mode === "reward") {
      Object.values(mobileButtons).forEach(clearMobileButtonAttention);
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
      Object.values(mobileButtons).forEach(clearMobileButtonAttention);
      const selectedItem = state.shopStock[state.selectionIndex];
      const canBuy = Boolean(selectedItem && !selectedItem.sold && state.run && !state.run.shopPurchaseMade);
      setMobileButton(mobileButtons.left, "Prev", false, false);
      setMobileButton(mobileButtons.right, "Next", false, false);
      setMobileButton(mobileButtons.double, "Buy", canBuy, true);
      setMobileButton(mobileButtons.confirm, "Continue", true, true);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      return;
    }

    if (state.mode === "gameover" || state.mode === "victory") {
      Object.values(mobileButtons).forEach(clearMobileButtonAttention);
      setMobileButton(mobileButtons.confirm, "New Run", true, true);
      setMobileButton(mobileButtons.left, "Left", false, false);
      setMobileButton(mobileButtons.right, "Right", false, false);
      setMobileButton(mobileButtons.hit, "Hit", false, false);
      setMobileButton(mobileButtons.stand, "Stand", false, false);
      setMobileButton(mobileButtons.double, "Double", false, false);
    }
  }

  function handleMobileAction(action) {
    if (isLogsModalOpen() || isPassiveModalOpen()) {
      return;
    }
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
      if (state.mode === "menu") {
        openCollection(0);
      } else if (state.mode === "reward") {
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
      } else if (state.mode === "collection") {
        state.mode = "menu";
      } else if (state.mode === "playing") {
        if (canAdvanceDeal()) {
          advanceToNextDeal();
        } else {
          splitAction();
        }
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
      return true;
    }

    return false;
  }

  function handleShopPointerTap(worldX, worldY) {
    if (state.mode !== "shop" || !state.shopUi || !state.shopStock.length) {
      return false;
    }

    const cardsByButton = [...state.shopUi.cards].sort((a, b) => Number(b.selected) - Number(a.selected));
    for (const card of cardsByButton) {
      if (card.buyButton && pointInRect(worldX, worldY, card.buyButton)) {
        if (card.buyEnabled) {
          buyShopItem(card.index);
        } else {
          playUiSfx("error");
        }
        return true;
      }
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
      return true;
    }

    return false;
  }

  function handleCollectionPointerTap(worldX, worldY) {
    if (state.mode !== "collection" || !state.collectionUi) {
      return false;
    }
    const total = collectionEntries().length;
    const { cols, rows } = collectionPageLayout();
    const perPage = Math.max(1, cols * rows);
    const pages = Math.max(1, Math.ceil(total / perPage));
    if (state.collectionUi.leftArrow && pointInCircle(worldX, worldY, state.collectionUi.leftArrow)) {
      state.collectionPage = Math.max(0, state.collectionPage - 1);
      playUiSfx("select");
      return true;
    }
    if (state.collectionUi.rightArrow && pointInCircle(worldX, worldY, state.collectionUi.rightArrow)) {
      state.collectionPage = Math.min(pages - 1, state.collectionPage + 1);
      playUiSfx("select");
      return true;
    }
    if (state.collectionUi.backButton && pointInRect(worldX, worldY, state.collectionUi.backButton)) {
      state.mode = "menu";
      playUiSfx("confirm");
      return true;
    }
    return false;
  }

  function onCanvasPointerDown(event) {
    if (isLogsModalOpen() || isPassiveModalOpen()) {
      return;
    }
    unlockAudio();
    if (state.mode === "collection") {
      event.preventDefault();
      return;
    }
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

    if (event.key === "Escape" && isLogsModalOpen()) {
      event.preventDefault();
      closeLogsModal();
      return;
    }

    if (event.key === "Escape" && isPassiveModalOpen()) {
      event.preventDefault();
      closePassiveModal();
      return;
    }

    if (event.key === "Escape" && state.mode === "collection") {
      event.preventDefault();
      state.mode = "menu";
      return;
    }

    const key = normalizeKey(event.key);
    if (!key) {
      return;
    }

    event.preventDefault();
    unlockAudio();

    if (isLogsModalOpen() || isPassiveModalOpen()) {
      return;
    }

    if (key === "m") {
      toggleAudio();
      return;
    }

    if (state.mode === "menu") {
      if (key === "enter") {
        startRun();
      } else if (key === "r") {
        if (resumeSavedRun()) {
          saveRunSnapshot();
        }
      } else if (key === "a") {
        openCollection(0);
      }
      return;
    }

    if (state.mode === "collection") {
      if (key === "enter" || key === "space" || key === "a" || key === "r") {
        state.mode = "menu";
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
      } else if (key === "enter" && canAdvanceDeal()) {
        advanceToNextDeal();
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

    if ((state.mode === "gameover" || state.mode === "victory") && key === "enter") {
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

    if (state.mode !== "collection") {
      state.collectionUi = null;
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
      state.pendingTransition.timer -= dt;
      if (state.pendingTransition.timer <= 0) {
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

    const labelX = x + 8;
    const labelY = y + h - 8;
    const fillW = Math.max(0, (w - 4) * clamped);
    setFont(15, 600, false);
    ctx.textAlign = "left";
    // Base text on lighter fill section.
    ctx.fillStyle = "rgba(10, 16, 24, 0.92)";
    ctx.fillText(label, labelX, labelY);
    // Repaint text as white only where it sits over the darker unfilled section.
    const darkStartX = x + 2 + fillW;
    if (darkStartX < x + w) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(darkStartX, y, x + w - darkStartX, h);
      ctx.clip();
      ctx.fillStyle = "rgba(242, 247, 255, 0.98)";
      ctx.fillText(label, labelX, labelY);
      ctx.restore();
    }
  }

  function drawChipAmount(x, y, amountText, opts = {}) {
    const iconSize = Math.max(14, Number(opts.iconSize) || 18);
    const gap = Number.isFinite(opts.gap) ? opts.gap : 6;
    const textColor = opts.textColor || "#ffffff";
    const iconColor = opts.iconColor || "#ffffff";
    const fontSize = Math.max(12, Number(opts.fontSize) || 18);
    const baseline = opts.baseline || "middle";
    const align = opts.align || "left";
    const value = String(amountText || "0");

    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    setFont(fontSize, 700, false);

    const textW = ctx.measureText(value).width;
    const totalW = iconSize + gap + textW;
    let startX = x;
    if (align === "center") {
      startX = x - totalW * 0.5;
    } else if (align === "right") {
      startX = x - totalW;
    }
    const iconY = y - iconSize * 0.5;

    if (chipIconImage.complete && chipIconImage.naturalWidth > 0 && chipIconImage.naturalHeight > 0) {
      ctx.save();
      const oldFilter = ctx.filter;
      // Preserve icon detail while tinting toward primary gold without overlay artifacts.
      if ((iconColor || "").toLowerCase() === "#f2ca86") {
        ctx.filter =
          "brightness(0) saturate(100%) invert(88%) sepia(29%) saturate(1119%) hue-rotate(343deg) brightness(99%) contrast(91%)";
      } else if ((iconColor || "").toLowerCase() === "#ffffff") {
        ctx.filter = "grayscale(1) brightness(0) invert(1)";
      } else {
        ctx.filter = "grayscale(1) brightness(0) invert(1)";
      }
      ctx.drawImage(chipIconImage, startX, iconY, iconSize, iconSize);
      ctx.filter = oldFilter;
      ctx.restore();
    } else {
      ctx.fillStyle = iconColor;
      ctx.beginPath();
      ctx.arc(startX + iconSize * 0.5, iconY + iconSize * 0.5, iconSize * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = textColor;
    ctx.fillText(value, startX + iconSize + gap, y);
    ctx.restore();
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

  function drawCard(x, y, card, hidden, width = CARD_W, height = CARD_H) {
    const cardW = Math.max(40, width);
    const cardH = Math.max(56, height);
    const scale = cardH / CARD_H;
    const radius = Math.max(8, Math.round(12 * scale));
    ctx.save();
    ctx.shadowColor = hidden ? "rgba(22, 55, 88, 0.38)" : "rgba(0, 0, 0, 0.38)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    roundRect(x, y, cardW, cardH, radius);

    if (hidden) {
      const hiddenGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
      hiddenGrad.addColorStop(0, "#173456");
      hiddenGrad.addColorStop(1, "#0c1f36");
      ctx.fillStyle = hiddenGrad;
      ctx.fill();

      ctx.strokeStyle = "rgba(182, 220, 255, 0.5)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      for (let i = 0; i < 4; i += 1) {
        const px = x + 8 * scale + i * (14 * scale);
        ctx.fillStyle = "rgba(205, 231, 255, 0.29)";
        ctx.fillRect(px, y + 10 * scale, 6 * scale, cardH - 20 * scale);
      }
      ctx.restore();
      return;
    }

    const cardGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
    cardGrad.addColorStop(0, "#f8fdff");
    cardGrad.addColorStop(1, "#d6ebff");
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(69, 92, 120, 0.5)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    roundRect(x + 4 * scale, y + 4 * scale, cardW - 8 * scale, 20 * scale, 8 * scale);
    const shine = ctx.createLinearGradient(x, y + 4 * scale, x, y + 24 * scale);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shine;
    ctx.fill();

    const redSuit = card.suit === "H" || card.suit === "D";
    ctx.fillStyle = redSuit ? "#cf455a" : "#1f3550";
    setFont(25 * scale, 700, true);
    ctx.textAlign = "center";
    ctx.fillText(card.rank, x + cardW * 0.5, y + 48 * scale);

    setFont(22 * scale, 700, false);
    ctx.fillText(SUIT_SYMBOL[card.suit] || card.suit, x + cardW * 0.5, y + 82 * scale);
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

  function drawHand(hand, type, hideSecond, yOffset = 0) {
    const total = hand.length;
    const renderedCards = [];
    for (let i = 0; i < total; i += 1) {
      const pos = handCardPosition(type, i, total);
      const animated = animatedCardPosition(hand[i], pos.x, pos.y + yOffset);
      ctx.save();
      ctx.globalAlpha = animated.alpha;
      drawCard(animated.x, animated.y, hand[i], hideSecond && i === 1, pos.w, pos.h);
      ctx.restore();
      renderedCards.push({
        x: animated.x,
        y: animated.y,
        w: pos.w,
        h: pos.h,
        hidden: Boolean(hideSecond && i === 1),
        card: hand[i],
      });
    }
    return renderedCards;
  }

  function handBounds(handType, count, yOffset = 0) {
    const safeCount = Math.max(1, count);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < safeCount; i += 1) {
      const pos = handCardPosition(handType, i, safeCount);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y + yOffset);
      maxX = Math.max(maxX, pos.x + pos.w);
      maxY = Math.max(maxY, pos.y + pos.h + yOffset);
    }
    return {
      x: minX,
      y: minY,
      w: Math.max(1, maxX - minX),
      h: Math.max(1, maxY - minY),
      centerX: (minX + maxX) * 0.5,
      centerY: (minY + maxY) * 0.5,
    };
  }

  function enemyAvatarAccent(enemyType) {
    if (enemyType === "boss") {
      return {
        glow: "rgba(255, 138, 104, 0.7)",
        rim: "rgba(255, 170, 136, 0.72)",
      };
    }
    if (enemyType === "elite") {
      return {
        glow: "rgba(248, 208, 112, 0.66)",
        rim: "rgba(255, 224, 164, 0.7)",
      };
    }
    return {
      glow: "rgba(131, 185, 255, 0.62)",
      rim: "rgba(180, 222, 255, 0.66)",
    };
  }

  function drawEnemyAvatarPanel(enemy, portrait, anchor = null, position = null) {
    if (!enemy) {
      return null;
    }
    const avatar = enemyAvatarImage(enemy);
    if (!avatar) {
      return;
    }

    const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
    const intensity = enemyAvatarIntensity(enemy);
    const accent = enemyAvatarAccent(enemy.type);
    const panelW = portrait ? 68 : 140;
    const panelH = portrait ? 80 : 171;
    const defaultX = portrait ? cropX + 24 : WIDTH - cropX - panelW - 44;
    const defaultY = portrait ? 78 : 94;
    const anchorGap = portrait ? 8 : 14;
    const panelX = position && Number.isFinite(position.x) ? position.x : anchor ? anchor.x - panelW - anchorGap : defaultX;
    const centerAlignedY =
      position && Number.isFinite(position.y) ? position.y : anchor ? anchor.y + anchor.h * 0.5 - panelH * 0.5 : defaultY;
    const minY = portrait ? 72 : 46;
    const maxY = portrait ? 224 : 212;
    const panelY = clampNumber(centerAlignedY, minY, maxY, defaultY);
    const radius = portrait ? 12 : 20;
    const pulse = 0.28 + (Math.sin(state.worldTime * (2.2 + intensity * 0.65)) * 0.5 + 0.5) * 0.26;

    roundRect(panelX, panelY, panelW, panelH, radius);
    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, "rgba(18, 42, 65, 0.95)");
    panelGradient.addColorStop(1, "rgba(11, 25, 40, 0.95)");
    ctx.fillStyle = panelGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(154, 198, 232, 0.38)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const inset = portrait ? 5 : 8;
    const innerX = panelX + inset;
    const innerY = panelY + inset;
    const innerW = panelW - inset * 2;
    const innerH = panelH - inset * 2;

    ctx.save();
    roundRect(innerX, innerY, innerW, innerH, Math.max(10, radius - 4));
    ctx.clip();
    const oldFilter = ctx.filter;
    const sat = Math.round((1.15 + intensity * 0.72) * 100);
    const contrast = Math.round((1.05 + intensity * 0.44) * 100);
    const brightness = Math.round((1.02 + intensity * 0.08) * 100);
    ctx.filter = `saturate(${sat}%) contrast(${contrast}%) brightness(${brightness}%)`;
    const bob = Math.sin(state.worldTime * (1.75 + intensity)) * (portrait ? 1.2 : 2.4);
    const focusY = clampNumber(0.24 - intensity * 0.05, 0.16, 0.28, 0.22);
    drawImageCover(avatar, innerX, innerY + bob, innerW, innerH, 0.5, focusY);
    ctx.filter = oldFilter;
    const gloss = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    gloss.addColorStop(0.52, "rgba(255, 255, 255, 0.02)");
    gloss.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    ctx.fillStyle = gloss;
    ctx.fillRect(innerX, innerY, innerW, innerH);
    ctx.restore();

    ctx.save();
    roundRect(panelX - 2, panelY - 2, panelW + 4, panelH + 4, radius + 2);
    ctx.strokeStyle = accent.rim;
    ctx.lineWidth = 1.6 + intensity * 1.15;
    ctx.shadowColor = accent.glow;
    ctx.shadowBlur = 16 + intensity * 20;
    ctx.globalAlpha = 0.42 + pulse * 0.24;
    ctx.stroke();
    ctx.restore();
    return {
      x: panelX,
      y: panelY,
      w: panelW,
      h: panelH,
      centerX: panelX + panelW * 0.5,
      centerY: panelY + panelH * 0.5,
    };
  }

  function drawPlayerAvatarPanel(portrait, anchor = null, position = null) {
    const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
    const panelW = portrait ? 45 : 93;
    const panelH = portrait ? 53 : 114;
    const defaultX = portrait ? cropX + 24 : cropX + 44;
    const defaultY = portrait ? HEIGHT - panelH - 154 : HEIGHT - panelH - 138;
    const anchorGap = portrait ? 8 : 14;
    const panelX = position && Number.isFinite(position.x) ? position.x : anchor ? anchor.x - panelW - anchorGap : defaultX;
    const centerAlignedY =
      position && Number.isFinite(position.y) ? position.y : anchor ? anchor.y + anchor.h * 0.5 - panelH * 0.5 : defaultY;
    const minY = portrait ? 300 : 360;
    const maxY = HEIGHT - panelH - 18;
    const panelY = clampNumber(centerAlignedY, minY, maxY, defaultY);
    const radius = portrait ? 12 : 20;

    roundRect(panelX, panelY, panelW, panelH, radius);
    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, "rgba(17, 40, 61, 0.95)");
    panelGradient.addColorStop(1, "rgba(10, 23, 36, 0.95)");
    ctx.fillStyle = panelGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(154, 198, 232, 0.34)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const inset = portrait ? 5 : 8;
    const innerX = panelX + inset;
    const innerY = panelY + inset;
    const innerW = panelW - inset * 2;
    const innerH = panelH - inset * 2;

    ctx.save();
    roundRect(innerX, innerY, innerW, innerH, Math.max(10, radius - 4));
    ctx.clip();
    const bg = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
    bg.addColorStop(0, "rgba(18, 38, 56, 0.9)");
    bg.addColorStop(1, "rgba(11, 24, 37, 0.95)");
    ctx.fillStyle = bg;
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // Default silhouette placeholder for the player frame.
    const cx = innerX + innerW * 0.5;
    const headR = Math.max(4, innerW * 0.16);
    const headY = innerY + innerH * 0.34;
    ctx.fillStyle = "rgba(210, 228, 242, 0.7)";
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    const torsoTop = headY + headR * 0.9;
    const torsoW = innerW * 0.58;
    const torsoH = innerH * 0.42;
    roundRect(cx - torsoW * 0.5, torsoTop, torsoW, torsoH, torsoW * 0.22);
    ctx.fillStyle = "rgba(188, 210, 228, 0.62)";
    ctx.fill();

    const gloss = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.1)");
    gloss.addColorStop(0.52, "rgba(255, 255, 255, 0.02)");
    gloss.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = gloss;
    ctx.fillRect(innerX, innerY, innerW, innerH);
    ctx.restore();
    return {
      x: panelX,
      y: panelY,
      w: panelW,
      h: panelH,
      centerX: panelX + panelW * 0.5,
      centerY: panelY + panelH * 0.5,
    };
  }

  function drawEncounter() {
    if (!state.encounter || !state.run) {
      state.handMessageAnchor = null;
      state.combatLayout = null;
      return;
    }

    const encounter = state.encounter;
    const enemy = encounter.enemy;
    const portrait = Boolean(state.viewport?.portraitZoomed);

    const playerTotal = encounter.bustGuardTriggered ? 21 : handTotal(encounter.playerHand).total;
    const dealerTotal = visibleDealerTotal(encounter);
    const dealerCount = Math.max(1, encounter.dealerHand.length);
    const playerCount = Math.max(1, encounter.playerHand.length);
    const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
    const visibleW = WIDTH - cropX * 2;
    const fixedBarW = Math.max(120, Math.round(Math.max(240, Math.min(portrait ? 340 : 360, visibleW - 126)) * 0.5));
    const barH = 24;
    const handLabelGap = 24;
    const handLabelClearance = 14;
    const splitExtra = encounter.splitUsed ? 20 : 0;
    const enemyAvatarW = portrait ? 68 : 140;
    const enemyAvatarH = portrait ? 80 : 171;
    const playerAvatarW = portrait ? 45 : 93;
    const playerAvatarH = portrait ? 53 : 114;
    const groupGap = portrait ? 8 : 12;
    const groupPad = portrait ? 18 : 24;
    const colW = fixedBarW;
    const enemyGroupY = portrait ? 96 : 102;
    const enemyAvatarX = WIDTH - cropX - groupPad - enemyAvatarW;
    const enemyColX = enemyAvatarX - groupGap - colW;
    const playerGroupY = HEIGHT - playerAvatarH - (portrait ? 16 : 20);
    const playerAvatarX = cropX + groupPad;
    const playerColX = playerAvatarX + playerAvatarW + groupGap;
    const groupNameY = portrait ? 17 : 19;
    const groupBarY = portrait ? 24 : 28;
    const enemyTypeGap = portrait ? 15 : 18;
    const enemyBarGap = portrait ? 14 : 16;

    const baseDealerBox = handBounds("dealer", dealerCount, 0);
    const basePlayerBox = handBounds("player", playerCount, 0);
    // Keep dealer hand, center message lane, and player hand as one centered canvas group.
    const reservedMessageH = portrait ? 72 : 84;
    const sectionGap = portrait ? 14 : 18;
    const totalStackH = baseDealerBox.h + sectionGap + reservedMessageH + sectionGap + basePlayerBox.h;
    const topBarHeight = hudRowMetrics().statsH;
    const stackTop = HEIGHT * 0.5 - totalStackH * 0.5 + topBarHeight * 0.5;
    const dealerTargetY = stackTop;
    const playerTargetY = stackTop + baseDealerBox.h + sectionGap + reservedMessageH + sectionGap;
    const dealerYOffset = dealerTargetY - baseDealerBox.y;
    const playerYOffset = playerTargetY - basePlayerBox.y;

    const dealerCards = drawHand(
      encounter.dealerHand,
      "dealer",
      encounter.hideDealerHole && state.mode === "playing" && encounter.phase === "player",
      dealerYOffset
    );
    const playerCards = drawHand(encounter.playerHand, "player", false, playerYOffset);

    const dealerBox = handBounds("dealer", dealerCount, dealerYOffset);
    const playerBox = handBounds("player", playerCount, playerYOffset);
    const leftBound = 24 + cropX;
    const rightBound = WIDTH - 24 - cropX;
    const dealerBottom = dealerBox.y + dealerBox.h;
    const playerTop = playerBox.y;
    const gapCenter = dealerBottom + (playerTop - dealerBottom) * 0.5;
    state.handMessageAnchor = {
      centerX: (leftBound + rightBound) * 0.5,
      centerY: gapCenter,
    };

    const dealerBarX = enemyColX;
    const enemyNameY = enemyGroupY + groupNameY;
    const enemyTypeY = enemyNameY + enemyTypeGap;
    const dealerBarY = enemyTypeY + enemyBarGap;
    const enemyPortrait = drawEnemyAvatarPanel(enemy, portrait, null, {
      x: enemyAvatarX,
      y: enemyGroupY,
    });
    ctx.textAlign = "left";
    ctx.fillStyle = enemy.color;
    setFont(portrait ? 18 : 22, 700, true);
    ctx.fillText(enemy.name, enemyColX, enemyNameY);
    ctx.fillStyle = "#9fc2dc";
    setFont(portrait ? 11 : 13, 600, false);
    ctx.fillText(`${enemy.type.toUpperCase()} ENCOUNTER`, enemyColX, enemyTypeY);
    drawHealthBar(
      dealerBarX,
      dealerBarY,
      fixedBarW,
      barH,
      enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0,
      "#ef8a73",
      `HP ${enemy.hp} / ${enemy.maxHp}`
    );
    ctx.textAlign = "center";
    ctx.fillStyle = "#d7e8f8";
    setFont(17, 700, false);
    const dealerHandLabelY = dealerBox.y - handLabelClearance;
    ctx.fillText(
      `Hand ${dealerTotal}${encounter.hideDealerHole && encounter.phase === "player" ? "+?" : ""}`,
      dealerBox.centerX,
      dealerHandLabelY
    );

    const playerBarX = playerColX;
    const playerBarY = playerGroupY + groupBarY;
    const playerPortrait = drawPlayerAvatarPanel(portrait, null, {
      x: playerAvatarX,
      y: playerGroupY,
    });
    ctx.textAlign = "left";
    ctx.fillStyle = "#cbe6ff";
    setFont(portrait ? 18 : 22, 700, true);
    ctx.fillText("Player", playerColX, playerGroupY + groupNameY);
    drawHealthBar(
      playerBarX,
      playerBarY,
      fixedBarW,
      barH,
      state.run.player.maxHp > 0 ? state.run.player.hp / state.run.player.maxHp : 0,
      "#6fd5a8",
      `HP ${state.run.player.hp} / ${state.run.player.maxHp}`
    );
    ctx.textAlign = "center";
    ctx.fillStyle = "#d7e8f8";
    setFont(17, 700, false);
    const playerLabelY = playerBox.y + playerBox.h + handLabelGap;
    ctx.fillText(`Hand ${playerTotal}`, playerBox.centerX, playerLabelY);
    if (encounter.splitUsed) {
      const splitTotal = Math.max(2, nonNegInt(encounter.splitHandsTotal, activeSplitHandCount(encounter)));
      const splitIndex = Math.min(splitTotal, nonNegInt(encounter.splitHandsResolved, 0) + 1);
      ctx.fillStyle = "#a8c6df";
      setFont(14, 600, false);
      ctx.fillText(`Split hand ${splitIndex}/${splitTotal}`, playerBox.centerX, playerLabelY + 20);
    }
    state.combatLayout = {
      dealerBox: { ...dealerBox },
      playerBox: { ...playerBox },
      dealerBar: { x: dealerBarX, y: dealerBarY, w: fixedBarW, h: barH },
      playerBar: { x: playerBarX, y: playerBarY, w: fixedBarW, h: barH },
      dealerCards: dealerCards.map((card) => ({ ...card })),
      playerCards: playerCards.map((card) => ({ ...card })),
      enemyPortrait: enemyPortrait ? { ...enemyPortrait } : null,
      playerPortrait: playerPortrait ? { ...playerPortrait } : null,
      playerPassiveAnchor:
        playerPortrait
          ? (() => {
              const scale = Math.max(0.0001, state.viewport?.scale || 1);
              const canvasLeft = Number.parseFloat(canvas.style.left) || 0;
              const canvasTop = Number.parseFloat(canvas.style.top) || 0;
              return {
                x: canvasLeft + (playerPortrait.x + playerPortrait.w + 8) * scale,
                yBottom: canvasTop + (playerPortrait.y + playerPortrait.h) * scale,
              };
            })()
          : null,
    };

    if (encounter.phase === "resolve" && encounter.resultText) {
      const tone = encounter.resultTone || "neutral";
      const toneFill =
        tone === "win"
          ? "rgba(22, 52, 40, 0.94)"
          : tone === "loss"
            ? "rgba(58, 32, 34, 0.94)"
            : tone === "special"
              ? "rgba(44, 36, 23, 0.95)"
              : "rgba(23, 42, 59, 0.93)";
      const toneStroke =
        tone === "win"
          ? "rgba(118, 234, 178, 0.78)"
          : tone === "loss"
            ? "rgba(255, 148, 146, 0.76)"
            : tone === "special"
              ? "rgba(246, 214, 135, 0.82)"
              : "rgba(170, 208, 233, 0.65)";
      const toneText = tone === "loss" ? "#ffd7d7" : tone === "win" ? "#d9ffea" : "#fff0c8";
      const centerY = handMessageAnchor(encounter).centerY;
      const widthCap = Math.max(300, Math.min(portrait ? 450 : 560, visibleW - 100));
      setFont(portrait ? 36 : 34, 700, true);
      const lines = wrappedLines(encounter.resultText, widthCap - 56).slice(0, 2);
      const lineHeight = portrait ? 34 : 32;
      const textW = Math.max(...lines.map((line) => ctx.measureText(line).width));
      const panelW = Math.max(280, Math.min(widthCap, textW + 64));
      const panelH = Math.max(56, 24 + lines.length * lineHeight);
      const panelY = clampNumber(centerY - panelH * 0.5, 182, HEIGHT - 214, centerY - panelH * 0.5);
      roundRect(WIDTH * 0.5 - panelW * 0.5, panelY, panelW, panelH, 16);
      ctx.fillStyle = toneFill;
      ctx.fill();
      ctx.strokeStyle = toneStroke;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = toneText;
      setFont(portrait ? 34 : 32, 700, true);
      lines.forEach((line, idx) => {
        const lineY = panelY + panelH * 0.5 - ((lines.length - 1) * lineHeight) * 0.5 + idx * lineHeight + 10;
        ctx.fillText(line, WIDTH * 0.5, lineY);
      });
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

  function hudRowMetrics() {
    const hud = hudMetrics();
    const rowTopY = hud.portrait ? 18 : 16;
    const statsH = hud.portrait ? 52 : 56;
    const actionReserve = 78;
    return {
      hud,
      rowTopY,
      statsH,
      actionReserve,
      rowBottomY: rowTopY + statsH,
    };
  }

  function drawHud() {
    if (!state.run) {
      return;
    }

    const run = state.run;
    const row = hudRowMetrics();
    const hud = row.hud;
    const rowTopY = row.rowTopY;
    const actionReserve = state.mode !== "menu" && state.mode !== "collection" ? 78 : 0;

    const statsW = hud.portrait ? Math.min(266, Math.max(206, Math.floor(hud.span * 0.64))) : 296;
    const statsH = row.statsH;
    const leftGap = hud.portrait ? 8 : 10;
    const leftInfoX = hud.left;
    const statsX = hud.right - statsW - actionReserve;
    const leftInfoW = Math.max(220, statsX - leftInfoX - leftGap);
    const statsY = rowTopY;
    const leftInfoY = rowTopY;
    roundRect(leftInfoX, leftInfoY, leftInfoW, statsH, 14);
    const leftPanel = ctx.createLinearGradient(leftInfoX, leftInfoY, leftInfoX, leftInfoY + statsH);
    leftPanel.addColorStop(0, "rgba(15, 30, 45, 0.9)");
    leftPanel.addColorStop(1, "rgba(10, 20, 31, 0.92)");
    ctx.fillStyle = leftPanel;
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = "#dbeaf7";
    setFont(hud.portrait ? 13 : 15, 700, false);
    ctx.fillText(
      `Floor ${run.floor}/${run.maxFloor}  Room ${run.room}/${run.roomsPerFloor}`,
      leftInfoX + 8,
      leftInfoY + Math.floor(statsH * 0.57)
    );

    roundRect(statsX, statsY, statsW, statsH, 14);
    const panel = ctx.createLinearGradient(statsX, statsY, statsX, statsY + statsH);
    panel.addColorStop(0, "rgba(15, 30, 45, 0.9)");
    panel.addColorStop(1, "rgba(10, 20, 31, 0.92)");
    ctx.fillStyle = panel;
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = "#f4d88d";
    setFont(hud.portrait ? 18 : 21, 700, false);
    const leftPad = hud.portrait ? 8 : 8;
    const rightPad = 8;
    const splitX = statsX + Math.max(hud.portrait ? 78 : 92, Math.floor(statsW * 0.33));
    const chipsAreaW = Math.max(58, splitX - statsX - leftPad - 6);
    const chipsText = fitText(String(run.player.gold), Math.max(42, chipsAreaW - 48));
    drawChipAmount(statsX + leftPad, statsY + Math.floor(statsH * 0.56), chipsText, {
      iconSize: 40,
      gap: 2,
      textColor: "#f6e6a6",
      iconColor: "#f2ca86",
      fontSize: 17,
      baseline: "middle",
      align: "left",
    });

    ctx.fillStyle = "#b7ddff";
    setFont(hud.portrait ? 13 : 15, 700, false);
    const stackX = splitX + rightPad;
    const statLineY = statsY + Math.floor(statsH * 0.57);
    ctx.fillText(`Streak ${run.player.streak}   Guards ${run.player.bustGuardsLeft}`, stackX, statLineY);
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
    const edgeFadeAlpha = state.compactControls ? 0.28 : 0.34;
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
    if (!state.run) {
      state.shopUi = null;
      return;
    }

    const run = state.run;
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

    const pillY = layout.panelY + 104;
    const chipPillW = 210;
    const hpPillW = 190;
    roundRect(layout.centerX - chipPillW - 12, pillY, chipPillW, 34, 12);
    ctx.fillStyle = "rgba(14, 30, 46, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 206, 234, 0.34)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    drawChipAmount(layout.centerX - chipPillW * 0.5 - 12, pillY + 17, String(run.player.gold), {
      iconSize: 40,
      gap: 2,
      textColor: "#f6e6a6",
      iconColor: "#f2ca86",
      fontSize: 17,
      baseline: "top",
      align: "left",
    });

    roundRect(layout.centerX + 12, pillY, hpPillW, 34, 12);
    ctx.fillStyle = "rgba(14, 30, 46, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 206, 234, 0.34)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = "#bff2ce";
    setFont(17, 700, false);
    ctx.fillText(`HP ${run.player.hp}/${run.player.maxHp}`, layout.centerX + hpPillW * 0.5 + 12, pillY + 23);

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
      const purchaseLocked = Boolean(run.shopPurchaseMade);
      const affordable = run.player.gold >= item.cost;
      const buyEnabled = !purchaseLocked && !item.sold && affordable;
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
        setFont(portrait ? 15 : 18, 600, false);
        const descMaxWidth = card.w - (portrait ? 56 : 64);
        const descMaxLines = portrait ? 2 : 3;
        const descLineHeight = portrait ? 18 : 22;
        const descStartY = card.y + (portrait ? 100 : 112);
        const descLines = wrappedLines(shopItemDescription(item), descMaxWidth);
        const clipped = descLines.slice(0, descMaxLines);
        if (descLines.length > descMaxLines && clipped.length > 0) {
          const last = clipped.length - 1;
          clipped[last] = fitText(`${clipped[last]}...`, descMaxWidth);
        }
        clipped.forEach((line, idx) => {
          ctx.fillText(line, card.x + card.w * 0.5, descStartY + idx * descLineHeight);
        });
      } else {
        setFont(portrait ? 13 : 15, 600, false);
        ctx.fillText(item.sold ? "Sold out" : "Tap to select", card.x + card.w * 0.5, card.y + (portrait ? card.h - 68 : card.h - 86));
      }

      ctx.fillStyle = item.sold ? "#9ca5af" : "#ffd58f";
      setFont(card.selected ? (portrait ? 22 : 24) : portrait ? 18 : 20, 700, false);
      ctx.fillText(`${item.cost} chips`, card.x + card.w * 0.5, card.y + card.h - 66);

      const btnW = Math.min(card.w - (portrait ? 24 : 28), card.selected ? (portrait ? 174 : 188) : portrait ? 154 : 164);
      const btnH = card.selected ? (portrait ? 34 : 36) : portrait ? 30 : 32;
      const btnX = card.x + (card.w - btnW) * 0.5;
      const btnY = card.y + card.h - btnH - (portrait ? 14 : 20);
      roundRect(btnX, btnY, btnW, btnH, 11);
      if (item.sold) {
        ctx.fillStyle = "rgba(86, 98, 111, 0.92)";
      } else if (purchaseLocked) {
        ctx.fillStyle = "rgba(64, 74, 88, 0.9)";
      } else if (buyEnabled) {
        ctx.fillStyle = "rgba(28, 78, 112, 0.96)";
      } else {
        ctx.fillStyle = "rgba(73, 55, 42, 0.92)";
      }
      ctx.fill();
      ctx.strokeStyle = buyEnabled ? "rgba(200, 232, 255, 0.44)" : "rgba(170, 190, 208, 0.28)";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      setFont(card.selected ? (portrait ? 16 : 18) : portrait ? 14 : 16, 700, false);
      const buyLabel = item.sold ? "Sold" : purchaseLocked ? "Locked" : buyEnabled ? "⛒ Buy" : "Need Chips";
      ctx.fillText(buyLabel, card.x + card.w * 0.5, btnY + btnH - 11);

      ctx.restore();
    });

    const edgeFadeW = Math.min(120, layout.viewportW * 0.16);
    const edgeFadeAlpha = state.compactControls ? 0.28 : 0.34;
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
        buyEnabled: Boolean(state.run && !state.run.shopPurchaseMade && !card.payload.sold && state.run.player.gold >= card.payload.cost),
        buyButton: {
          x: card.x + (card.w - Math.min(card.w - 28, card.selected ? 188 : 164)) * 0.5,
          y: card.y + card.h - (card.selected ? 36 : 32) - 20,
          w: Math.min(card.w - 28, card.selected ? 188 : 164),
          h: card.selected ? 36 : 32,
        },
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

  function drawImageContain(image, x, y, w, h, alignX = 0.5, alignY = 0.5) {
    const imageW = Number(image?.naturalWidth);
    const imageH = Number(image?.naturalHeight);
    if (!Number.isFinite(imageW) || !Number.isFinite(imageH) || imageW <= 0 || imageH <= 0) {
      return false;
    }

    const scale = Math.min(w / imageW, h / imageH);
    const drawW = imageW * scale;
    const drawH = imageH * scale;
    const dx = x + (w - drawW) * clampNumber(alignX, 0, 1, 0.5);
    const dy = y + (h - drawH) * clampNumber(alignY, 0, 1, 0.5);
    ctx.drawImage(image, dx, dy, drawW, drawH);
    return true;
  }

  function drawMenu() {
    const compact = state.compactControls;
    if (compact) {
      const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      bg.addColorStop(0, "#081420");
      bg.addColorStop(1, "#040b12");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const compactViewportW = Math.floor(
        window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || WIDTH
      );
      const tabletCompact = compactViewportW >= 700;
      // On phone sizes, use a full-canvas backdrop image. On tablet sizes, keep only the framed image.
      if (!tabletCompact) {
        drawImageCover(menuArtImage, 0, 0, WIDTH, HEIGHT, 0.5, 0.48);
      }
      const backdropDarken = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      backdropDarken.addColorStop(0, "rgba(5, 10, 18, 0.08)");
      backdropDarken.addColorStop(0.375, "rgba(5, 10, 18, 0.16)");
      backdropDarken.addColorStop(0.615, "rgba(5, 10, 18, 0.5)");
      backdropDarken.addColorStop(1, "rgba(5, 10, 18, 0.72)");
      ctx.fillStyle = backdropDarken;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const imageW = Number(menuArtImage?.naturalWidth);
      const imageH = Number(menuArtImage?.naturalHeight);
      const imageAspect = Number.isFinite(imageW) && Number.isFinite(imageH) && imageW > 0 && imageH > 0 ? imageW / imageH : 2 / 3;
      const maxW = WIDTH;
      const maxH = HEIGHT;
      let frameW = Math.min(maxW, maxH * imageAspect);
      let frameH = frameW / imageAspect;
      if (frameH > maxH) {
        frameH = maxH;
        frameW = frameH * imageAspect;
      }
      const frameX = Math.floor((WIDTH - frameW) * 0.5);
      const frameY = Math.floor((HEIGHT - frameH) * 0.5);
      const frameRadius = 24;
      state.menuArtRect = { x: frameX, y: frameY, w: frameW, h: frameH, radius: frameRadius };

      ctx.save();
      roundRect(frameX, frameY, frameW, frameH, frameRadius);
      ctx.clip();
      const artDrawn = drawImageContain(menuArtImage, frameX, frameY, frameW, frameH, 0.5, 0.5);
      const frameDarken = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
      frameDarken.addColorStop(0, artDrawn ? "rgba(5, 10, 18, 0.07)" : "rgba(5, 10, 18, 0.04)");
      frameDarken.addColorStop(0.375, "rgba(5, 10, 18, 0.15)");
      frameDarken.addColorStop(0.615, "rgba(5, 10, 18, 0.44)");
      frameDarken.addColorStop(1, "rgba(5, 10, 18, 0.78)");
      ctx.fillStyle = frameDarken;
      ctx.fillRect(frameX, frameY, frameW, frameH);
      ctx.restore();

      ctx.strokeStyle = "rgba(190, 223, 246, 0.34)";
      ctx.lineWidth = 1.5;
      roundRect(frameX, frameY, frameW, frameH, frameRadius);
      ctx.stroke();
      return;
    }

    const art = compact
      ? { x: 0, y: 0, w: WIDTH, h: HEIGHT, radius: 0 }
      : (() => {
          const viewW = Math.max(1, Number(state.viewport?.width) || WIDTH);
          const viewH = Math.max(1, Number(state.viewport?.height) || HEIGHT);
          const scaleX = viewW / WIDTH;
          const scaleY = viewH / HEIGHT;
          const desktopScale = Math.max(0.82, Number(state.menuDesktopScale) || 1);
          const frameDisplayH = MENU_FRAME_DISPLAY_HEIGHT * desktopScale;
          const frameDisplayW = MENU_FRAME_DISPLAY_WIDTH * desktopScale;
          const frameH = frameDisplayH / Math.max(0.001, scaleY);
          const frameW = frameDisplayW / Math.max(0.001, scaleX);
          return {
            x: Math.floor((WIDTH - frameW) * 0.5),
            y: Math.floor((HEIGHT - frameH) * 0.5),
            w: frameW,
            h: frameH,
            radius: 24,
          };
        })();
    state.menuArtRect = { x: art.x, y: art.y, w: art.w, h: art.h, radius: art.radius };

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
    artDrawn = drawImageContain(menuArtImage, art.x, art.y, art.w, art.h, 0.5, 0.5);
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
  }

  function drawMenuParticles() {
    if (state.mode !== "menu") {
      return;
    }

    ctx.save();
    const clip = state.menuArtRect;
    if (clip && Number.isFinite(clip.w) && Number.isFinite(clip.h) && clip.w > 0 && clip.h > 0) {
      if (clip.radius > 0) {
        roundRect(clip.x, clip.y, clip.w, clip.h, clip.radius);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(clip.x, clip.y, clip.w, clip.h);
        ctx.clip();
      }
    }
    for (const mote of MENU_MOTES) {
      const pulse = Math.sin(state.worldTime * mote.twinkle + mote.phase) * 0.5 + 0.5;
      const alpha = mote.alpha * (0.44 + pulse * 0.56);
      const emberRadius = mote.radius * (0.9 + pulse * 0.4);
      const glow = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, emberRadius * 3.8);
      const warmMix = 0.3 + mote.heat * 0.7;
      glow.addColorStop(0, `rgba(255, ${Math.floor(210 + 32 * warmMix)}, ${Math.floor(136 + 36 * warmMix)}, ${Math.min(0.95, alpha * 1.25)})`);
      glow.addColorStop(0.5, `rgba(255, ${Math.floor(128 + 46 * warmMix)}, 76, ${Math.min(0.72, alpha * 0.78)})`);
      glow.addColorStop(1, "rgba(255, 88, 38, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, emberRadius * 2.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(mote.x, mote.y);
      ctx.rotate(state.worldTime * mote.spin + mote.phase);
      ctx.fillStyle = `rgba(255, ${Math.floor(202 + 45 * warmMix)}, ${Math.floor(132 + 38 * warmMix)}, ${Math.min(0.95, alpha)})`;
      ctx.beginPath();
      if (mote.shape === 0) {
        // Ember shard (diamond)
        ctx.moveTo(0, -emberRadius * 1.25);
        ctx.lineTo(emberRadius * 0.92, 0);
        ctx.lineTo(0, emberRadius * 1.25);
        ctx.lineTo(-emberRadius * 0.92, 0);
      } else if (mote.shape === 1) {
        // Triangular ember fleck
        ctx.moveTo(0, -emberRadius * 1.3);
        ctx.lineTo(emberRadius * 1.05, emberRadius * 0.82);
        ctx.lineTo(-emberRadius * 0.92, emberRadius * 0.74);
      } else {
        // Slanted quad ember
        ctx.moveTo(-emberRadius * 0.95, -emberRadius * 0.4);
        ctx.lineTo(emberRadius * 0.72, -emberRadius * 0.92);
        ctx.lineTo(emberRadius * 1.05, emberRadius * 0.42);
        ctx.lineTo(-emberRadius * 0.6, emberRadius * 0.94);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const spark of state.menuSparks) {
      const alpha = Math.max(0, Math.min(1, spark.life / spark.maxLife));
      const trail = ctx.createLinearGradient(spark.x, spark.y, spark.x - spark.vx * 0.1, spark.y - spark.vy * 0.1);
      trail.addColorStop(0, `rgba(255, 236, 186, ${alpha * 0.95})`);
      trail.addColorStop(0.5, `rgba(255, 144, 82, ${alpha * 0.62})`);
      trail.addColorStop(1, "rgba(255, 86, 40, 0)");
      ctx.strokeStyle = trail;
      ctx.lineWidth = spark.size;
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x - spark.vx * 0.1, spark.y - spark.vy * 0.1);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(spark.x, spark.y, Math.max(0.9, spark.size * 0.44), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 244, 204, ${alpha * 0.9})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCollectionScreen() {
    const entries = collectionEntries();
    const { cols, rows } = collectionPageLayout();
    const perPage = Math.max(1, cols * rows);
    const pages = Math.max(1, Math.ceil(entries.length / perPage));
    state.collectionPage = Math.min(Math.max(0, state.collectionPage), pages - 1);
    const start = state.collectionPage * perPage;
    const pageEntries = entries.slice(start, start + perPage);
    const portrait = Boolean(state.viewport?.portraitZoomed);
    const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
    const visibleW = Math.max(portrait ? 320 : 760, WIDTH - cropX * 2);
    const panelW = portrait ? Math.min(472, visibleW - 14) : Math.min(1120, visibleW - 38);
    const panelH = portrait ? 568 : 604;
    const panelX = WIDTH * 0.5 - panelW * 0.5;
    const panelY = portrait ? 84 : 72;

    ctx.fillStyle = "rgba(4, 10, 16, 0.68)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    roundRect(panelX, panelY, panelW, panelH, 24);
    const panelFill = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelFill.addColorStop(0, "rgba(16, 32, 48, 0.97)");
    panelFill.addColorStop(1, "rgba(9, 20, 31, 0.95)");
    ctx.fillStyle = panelFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(166, 208, 236, 0.34)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    const collectedUnique = entries.filter((entry) => entry.copies > 0).length;
    const unlockedCount = entries.filter((entry) => entry.unlocked).length;
    const totalCopies = entries.reduce((acc, entry) => acc + entry.copies, 0);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f3d193";
    setFont(portrait ? 36 : 42, 700, true);
    ctx.fillText("Collections", WIDTH * 0.5, panelY + 50);

    ctx.fillStyle = "#bed8ec";
    setFont(portrait ? 14 : 16, 600, false);
    ctx.fillText(
      `Unlocked ${unlockedCount}/${entries.length}  |  Found ${collectedUnique}/${entries.length}  |  Copies ${totalCopies}`,
      WIDTH * 0.5,
      panelY + 82
    );
    ctx.fillStyle = "#9ac0dc";
    setFont(portrait ? 13 : 14, 600, false);
    ctx.fillText(`Page ${state.collectionPage + 1}/${pages}`, WIDTH * 0.5, panelY + 104);

    const gridPadX = portrait ? 16 : 22;
    const gridPadTop = portrait ? 120 : 124;
    const gridPadBottom = portrait ? 116 : 124;
    const gridX = panelX + gridPadX;
    const gridY = panelY + gridPadTop;
    const gridW = panelW - gridPadX * 2;
    const gridH = panelH - gridPadTop - gridPadBottom;
    const gapX = portrait ? 10 : 14;
    const gapY = portrait ? 10 : 14;
    const cardW = (gridW - gapX * (cols - 1)) / cols;
    const cardH = (gridH - gapY * (rows - 1)) / rows;

    pageEntries.forEach((entry, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = gridX + col * (cardW + gapX);
      const y = gridY + row * (cardH + gapY);
      const rarityMeta = RELIC_RARITY_META[entry.rarity];
      roundRect(x, y, cardW, cardH, 14);
      const fill = ctx.createLinearGradient(x, y, x, y + cardH);
      if (entry.unlocked) {
        fill.addColorStop(0, "rgba(33, 54, 72, 0.95)");
        fill.addColorStop(1, "rgba(20, 35, 49, 0.92)");
      } else {
        fill.addColorStop(0, "rgba(26, 33, 42, 0.94)");
        fill.addColorStop(1, "rgba(16, 22, 31, 0.92)");
      }
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = entry.unlocked ? rarityMeta.glow : "rgba(145, 164, 182, 0.28)";
      ctx.lineWidth = entry.unlocked ? 1.6 : 1.1;
      ctx.stroke();

      ctx.fillStyle = entry.unlocked ? rarityMeta.glow : "#9aa9b8";
      setFont(portrait ? 12 : 13, 700, false);
      ctx.fillText(entry.rarityLabel.toUpperCase(), x + cardW * 0.5, y + 22);

      ctx.fillStyle = entry.unlocked ? "#ecf4ff" : "#b3bfcb";
      setFont(portrait ? 20 : 22, 700, true);
      ctx.fillText(fitText(entry.unlocked ? entry.relic.name : "LOCKED", cardW - 20), x + cardW * 0.5, y + 50);

      ctx.fillStyle = entry.unlocked ? "#d5e6f6" : "#aeb8c4";
      setFont(portrait ? 13 : 14, 600, false);
      const body = entry.unlocked ? passiveDescription(entry.relic.description) : entry.unlockText;
      const bodyWidth = cardW - 22;
      const bodyLines = wrappedLines(body, bodyWidth);
      const lineHeight = portrait ? 15 : 16;
      const bodyTop = y + 76;
      const bodyBottom = y + cardH - 34;
      const maxLinesBySpace = Math.max(1, Math.floor((bodyBottom - bodyTop) / lineHeight));
      const maxLines = Math.min(portrait ? 2 : 3, maxLinesBySpace);
      const clipped = bodyLines.slice(0, maxLines);
      if (bodyLines.length > maxLines && clipped.length > 0) {
        const last = clipped.length - 1;
        clipped[last] = fitText(`${clipped[last]}...`, bodyWidth);
      }
      clipped.forEach((line, lineIndex) => {
        ctx.fillText(line, x + cardW * 0.5, bodyTop + lineIndex * lineHeight);
      });

      ctx.fillStyle = entry.copies > 0 ? "#f4d999" : "#90a9bf";
      setFont(portrait ? 13 : 14, 700, false);
      ctx.fillText(entry.copies > 0 ? `Owned x${entry.copies}` : "Not found yet", x + cardW * 0.5, y + cardH - 14);
    });

    const canPrev = state.collectionPage > 0;
    const canNext = state.collectionPage < pages - 1;
    const arrowY = gridY + gridH * 0.5;
    const arrowR = portrait ? 18 : 22;
    const leftArrowX = panelX + (portrait ? 22 : 30);
    const rightArrowX = panelX + panelW - (portrait ? 22 : 30);
    drawRewardCarouselArrow(leftArrowX, arrowY, arrowR, "◀", canPrev);
    drawRewardCarouselArrow(rightArrowX, arrowY, arrowR, "▶", canNext);

    const backW = portrait ? Math.min(280, panelW - 38) : 278;
    const backH = portrait ? 46 : 48;
    const backX = WIDTH * 0.5 - backW * 0.5;
    const backY = panelY + panelH - (portrait ? 66 : 74);
    roundRect(backX, backY, backW, backH, 12);
    const backFill = ctx.createLinearGradient(backX, backY, backX, backY + backH);
    backFill.addColorStop(0, "rgba(242, 208, 142, 0.98)");
    backFill.addColorStop(1, "rgba(223, 173, 84, 0.96)");
    ctx.fillStyle = backFill;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 245, 216, 0.35)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = "#15263a";
    setFont(portrait ? 20 : 22, 700, true);
    ctx.fillText("Back", backX + backW * 0.5, backY + backH - 14);

    state.collectionUi = {
      leftArrow: canPrev ? { x: leftArrowX, y: arrowY, r: arrowR } : null,
      rightArrow: canNext ? { x: rightArrowX, y: arrowY, r: arrowR } : null,
      backButton: { x: backX, y: backY, w: backW, h: backH },
    };
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

  function handMessageAnchor(encounterLike = state.encounter) {
    if (encounterLike && encounterLike === state.encounter && state.handMessageAnchor) {
      return state.handMessageAnchor;
    }

    const cropX = Math.max(0, state.viewport?.cropWorldX || 0);
    const leftBound = 24 + cropX;
    const rightBound = WIDTH - 24 - cropX;
    const centerX = (leftBound + rightBound) * 0.5;

    if (encounterLike) {
      const dealerCount = Math.max(1, encounterLike.dealerHand.length);
      const playerCount = Math.max(1, encounterLike.playerHand.length);
      const dealerBox = handBounds("dealer", dealerCount);
      const playerBox = handBounds("player", playerCount);
      const dealerBottom = dealerBox.y + dealerBox.h;
      const playerTop = playerBox.y;
      const gapCenter = dealerBottom + (playerTop - dealerBottom) * 0.5;
      return {
        centerX,
        centerY: gapCenter,
      };
    }

    return {
      centerX,
      centerY: state.viewport?.portraitZoomed ? 220 : 150,
    };
  }

  function announcementAnchor() {
    return handMessageAnchor(state.encounter);
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

    for (const tackle of state.handTackles) {
      const progress = Math.max(0, Math.min(1, tackle.elapsed / Math.max(0.01, tackle.duration)));
      const travel = Math.max(0, Math.min(1, progress / Math.max(0.01, tackle.impactAt)));
      const eased = easeOutCubic(travel);
      const centerX = lerp(tackle.fromX, tackle.toX, eased);
      const centerY = lerp(tackle.fromY, tackle.toY, eased) - Math.sin(travel * Math.PI) * 42 * (1 - travel * 0.35);
      const alpha = Math.max(0.14, 1 - Math.max(0, (progress - tackle.impactAt) / Math.max(0.01, 1 - tackle.impactAt)) * 0.92);
      const settle = Math.max(0, Math.min(1, (progress - tackle.impactAt) / Math.max(0.01, 1 - tackle.impactAt)));
      const tilt = (1 - eased) * (tackle.winner === "enemy" ? -0.24 : 0.24);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = applyAlpha(tackle.color, 0.26);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tackle.fromX, tackle.fromY);
      ctx.lineTo(centerX, centerY);
      ctx.stroke();
      ctx.restore();

      const n = tackle.projectiles.length;
      for (let i = 0; i < n; i += 1) {
        const projectile = tackle.projectiles[i];
        const spread = i - (n - 1) * 0.5;
        const targetX = tackle.toX + spread * 14;
        const targetY = tackle.toY + Math.abs(spread) * 2;
        const cardX = lerp(projectile.fromX, targetX, eased);
        const cardY = lerp(projectile.fromY, targetY, eased) - Math.sin(travel * Math.PI) * (28 + Math.abs(spread) * 5) * (1 - travel * 0.42);
        const cardW = projectile.w * (1 - settle * 0.16);
        const cardH = projectile.h * (1 - settle * 0.16);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cardX, cardY);
        ctx.rotate(tilt + spread * 0.08 + Math.sin(progress * 16 + i * 0.9) * 0.018 * (1 - eased));
        drawCard(-cardW * 0.5, -cardH * 0.5, projectile.card, false, cardW, cardH);
        ctx.restore();
      }
    }

    ctx.textAlign = "center";
    for (const f of state.floatingTexts) {
      const alpha = Math.max(0, Math.min(1, f.life / f.maxLife));
      const elapsed = 1 - alpha;
      const jitterX = f.jitter ? Math.sin(elapsed * 19 + f.jitterSeed) * (5 + elapsed * 10) : 0;
      const jitterY = f.jitter ? Math.cos(elapsed * 15 + f.jitterSeed * 0.7) * 2 : 0;
      ctx.save();
      if (f.glow) {
        ctx.shadowColor = applyAlpha(f.glow, Math.min(1, alpha * 0.88));
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = applyAlpha(f.color, alpha);
      setFont(f.size || 26, f.weight || 700, true);
      ctx.fillText(f.text, f.x + jitterX, f.y + jitterY);
      ctx.restore();
    }

    if (state.announcementTimer > 0 && state.announcement) {
      const duration = Math.max(0.25, state.announcementDuration || state.announcementTimer || 1.4);
      const progress = Math.max(0, Math.min(1, 1 - state.announcementTimer / duration));
      const introWindow = 0.11;
      const settleWindow = 0.19;
      const intro = Math.max(0, Math.min(1, progress / introWindow));
      const settle = Math.max(0, Math.min(1, (progress - introWindow) / settleWindow));
      const fade = progress > 0.74 ? 1 - (progress - 0.74) / 0.26 : 1;
      const popScale =
        progress < introWindow
          ? 0.46 + easeOutBack(intro) * 0.88
          : 1.16 - settle * 0.16 + Math.sin(settle * Math.PI) * 0.035 * (1 - settle);
      const slamOffset = progress < introWindow ? (1 - intro) * 26 : Math.max(0, 8 - settle * 24);
      const scale = Math.max(0.86, popScale);
      const alpha = Math.max(0, Math.min(1, (0.34 + intro * 0.66) * fade));
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
        const toastY =
          state.mode === "playing"
            ? centerY
            : state.mode === "reward" || state.mode === "shop"
              ? 64
              : state.viewport?.portraitZoomed
                ? clampNumber(centerY - 36, 236, 338, 264)
                : 136;
        ctx.save();
        ctx.translate(centerX, toastY - slamOffset);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        roundRect(-panelW * 0.5, -panelH * 0.5, panelW, panelH, 13);
        const panel = ctx.createLinearGradient(0, -panelH * 0.5, 0, panelH * 0.5);
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
          const y = -((lines.length - 1) * lineHeight) * 0.5 + idx * lineHeight + 8;
          ctx.fillText(line, 0, y);
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
      ctx.translate(centerX, centerY - slamOffset);
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
    syncOverlayUi();
    const shake = currentShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawBackground();

    if (state.mode === "menu" || state.mode === "collection") {
      drawMenu();
      if (state.mode === "menu") {
        drawMenuParticles();
      }
      alignTopRightActionsToHudRow();
      alignPassiveRailToCombatLayout();
      drawEffects();
      ctx.restore();
      drawFlashOverlays();
      return;
    }

    drawHud();

    if (state.encounter) {
      drawEncounter();
    }
    alignTopRightActionsToHudRow();
    alignPassiveRailToCombatLayout();

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
      return hasSavedRun()
        ? ["enter(start)", "r(resume)", "a(collections)"]
        : ["enter(start)", "a(collections)"];
    }
    if (state.mode === "collection") {
      return ["enter(back)", "space(back)", "a(back)"];
    }
    if (state.mode === "playing") {
      if (canAdvanceDeal()) {
        return ["enter(deal)", "tap(deal)"];
      }
      if (!canPlayerAct()) {
        return ["observe(result)"];
      }
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
    MENU_SCALE_CLASSES.forEach((cls) => document.body.classList.remove(cls));
    if (!menuScreen || !state.compactControls) {
      document.body.style.removeProperty("--menu-mobile-ui-scale");
    }
    if (menuScreen) {
      if (state.compactControls) {
        const baseMenuW = 360;
        const baseMenuH = 380;
        const padX = 20;
        const padY = 18;
        const scaleX = Math.max(0.64, (viewportWidth - padX * 2) / baseMenuW);
        const scaleY = Math.max(0.64, (viewportHeight - padY * 2) / baseMenuH);
        const mobileScale = Math.min(1, scaleX, scaleY);
        document.body.style.setProperty("--menu-mobile-ui-scale", mobileScale.toFixed(4));
      }

      let uiScale = 1;
      let scaleClass = "menu-ui-scale-lg";
      if (state.compactControls) {
        uiScale = 1;
        scaleClass = "menu-ui-scale-md";
      } else if (viewportWidth >= 1820) {
        uiScale = 1.18;
        scaleClass = "menu-ui-scale-xl";
      } else if (viewportWidth >= 1560) {
        uiScale = 1.08;
        scaleClass = "menu-ui-scale-lg";
      } else if (viewportWidth >= 1320) {
        uiScale = 1;
        scaleClass = "menu-ui-scale-md";
      } else {
        uiScale = 0.9;
        scaleClass = "menu-ui-scale-sm";
      }
      if (!state.compactControls) {
        uiScale *= MENU_DESKTOP_SCALE_BOOST;
      }
      document.body.classList.add(scaleClass);
      state.menuDesktopScale = uiScale;

      const menuScale =
        state.compactControls
          ? Math.max(viewportWidth / WIDTH, viewportHeight / HEIGHT)
          : Math.max(viewportWidth / WIDTH, viewportHeight / HEIGHT) * uiScale;
      const canvasDisplayWidth = Math.round(WIDTH * menuScale);
      const canvasDisplayHeight = Math.round(HEIGHT * menuScale);
      const canvasLeft = Math.floor((viewportWidth - canvasDisplayWidth) * 0.5);
      const canvasTop = Math.floor((viewportHeight - canvasDisplayHeight) * 0.5);

      gameShell.style.width = `${viewportWidth}px`;
      gameShell.style.height = `${viewportHeight}px`;
      canvas.style.width = `${canvasDisplayWidth}px`;
      canvas.style.height = `${canvasDisplayHeight}px`;
      canvas.style.left = `${canvasLeft}px`;
      canvas.style.top = `${canvasTop}px`;

      state.viewport = {
        width: canvasDisplayWidth,
        height: canvasDisplayHeight,
        scale: menuScale,
        cropWorldX: 0,
        portraitZoomed: false,
      };
      return;
    }
    state.menuDesktopScale = 1;

    let availableHeight = 0;
    if (!menuScreen && state.mobileActive && mobileControls && mobileControls.classList.contains("active")) {
      const controlsRect = mobileControls.getBoundingClientRect();
      const controlsTop = Math.floor(controlsRect.top);
      // Fill canvas area exactly to the controls container.
      availableHeight = Math.max(120, controlsTop - 2);
    } else {
      const reservedHeight =
        !menuScreen && state.mobileActive && mobileControls ? mobileControls.offsetHeight + (state.compactControls ? 8 : 12) : 0;
      availableHeight = Math.max(
        120,
        viewportHeight - reservedHeight - (state.compactControls ? 6 : 0) - 2
      );
    }
    const availableWidth = Math.max(1, viewportWidth - 2);
    const portraitZoomed = state.mobilePortrait;

    if (state.mobileActive) {
      // On mobile during gameplay, always fill the available height up to controls.
      const shellW = availableWidth;
      const shellH = availableHeight;
      const scale = shellH / HEIGHT;
      const canvasW = Math.max(shellW, Math.floor(WIDTH * scale));
      const canvasH = Math.max(120, Math.floor(HEIGHT * scale));
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
        portraitZoomed,
      };
      return;
    }

    const scale = Math.min(availableWidth / WIDTH, availableHeight / HEIGHT);
    const displayW = Math.max(1, Math.floor(WIDTH * scale));
    const displayH = Math.max(120, Math.floor(HEIGHT * scale));

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

  if (logsToggle) {
    logsToggle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudio();
      toggleLogsModal();
    });
  }

  if (achievementsToggle) {
    achievementsToggle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudio();
      if (state.mode === "menu") {
        openCollection(0);
      }
    });
  }

  if (menuNewRun) {
    menuNewRun.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudio();
      if (state.mode === "menu") {
        startRun();
      }
    });
  }

  if (menuResume) {
    menuResume.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudio();
      if (state.mode === "menu" && hasSavedRun()) {
        if (resumeSavedRun()) {
          saveRunSnapshot();
        }
      }
    });
  }

  if (menuAchievements) {
    menuAchievements.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudio();
      if (state.mode === "menu") {
        openCollection(0);
      }
    });
  }

  if (logsClose) {
    logsClose.addEventListener("click", (event) => {
      event.preventDefault();
      closeLogsModal();
    });
  }

  if (logsModal) {
    logsModal.addEventListener("pointerdown", (event) => {
      if (event.target === logsModal) {
        closeLogsModal();
      }
    });
  }

  if (passiveModalClose) {
    passiveModalClose.addEventListener("click", (event) => {
      event.preventDefault();
      closePassiveModal();
    });
  }

  if (passiveModal) {
    passiveModal.addEventListener("pointerdown", (event) => {
      if (event.target === passiveModal) {
        closePassiveModal();
      }
    });
  }

  if (collectionClose) {
    collectionClose.addEventListener("click", (event) => {
      event.preventDefault();
      unlockAudio();
      playUiSfx("confirm");
      if (state.mode === "collection") {
        state.mode = "menu";
      }
    });
  }

  if (collectionModal) {
    collectionModal.addEventListener("pointerdown", (event) => {
      if (event.target !== collectionModal) {
        return;
      }
      unlockAudio();
      playUiSfx("confirm");
      if (state.mode === "collection") {
        state.mode = "menu";
      }
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (passiveTooltip && !passiveTooltip.hidden && passiveRail && !passiveRail.contains(event.target)) {
      hidePassiveTooltip();
    }
  });

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
