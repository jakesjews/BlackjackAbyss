export const RELIC_RARITY_META = {
  common: { label: "Common", shopMarkup: 0, glow: "#8ab3da" },
  uncommon: { label: "Uncommon", shopMarkup: 3, glow: "#71d8b4" },
  rare: { label: "Rare", shopMarkup: 8, glow: "#f2c46f" },
  legendary: { label: "Legendary", shopMarkup: 14, glow: "#ff967c" },
};

export const RELIC_RARITY_ORDER = ["common", "uncommon", "rare", "legendary"];

export const RELICS = [
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

export const BOSS_RELIC = {
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

export const RELIC_BY_ID = new Map([...RELICS, BOSS_RELIC].map((r) => [r.id, r]));
