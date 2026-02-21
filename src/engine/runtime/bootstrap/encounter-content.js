export const ENEMY_NAMES = {
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

export const ENEMY_AVATAR_BY_NAME = {
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

const DEALER_DIALOGUE_VERBATIM = Object.freeze([
  "Hey, whats the big deal? OH, it’s me!!",
  "I got 21 problems, but winning this game ain’t one!",
  "Hit me, if you dare!!",
  "Oh you wont be able to stand me!",
  "I dont know jack, but I DO know blackjack!!",
  "If you're gonna beat me, you'll need an ace in the hole!",
  "Now shove this ace up your hole!",
  "I've got nothing up my sleeves. Stop looking at them!",
  "I'm gonna split you in half!",
  "You're the hero? Well, I'm the ante-hero!",
  "I'm kind of a big deal.",
  "I'm gonna club you to death!",
  "You're in trouble, cuz I don't have a heart!",
]);

export const DEALER_DIALOGUE_VERBATIM_SET = new Set(DEALER_DIALOGUE_VERBATIM);

const DEALER_DIALOGUE_EXTRA = Object.freeze([
  "I only deal two things: cards and busts.",
  "Welcome to Blackjack: where hope hits and dies.",
  "I count to 21 better than you count blessings.",
  "You can hit, stand, or panic. I recommend panic.",
  "This shoe has your bust written all over it.",
  "Split the pair, split your destiny.",
  "Double down? Double regret.",
  "I don't fold, I just watch players bust.",
  "If confidence were chips, you'd still be short-stacked.",
  "I came to deal cards and break 20s.",
  "The house edge is my love language.",
  "You bring vibes, I bring dealer math.",
  "Your 16 is cute. My 10 showing is cuter.",
  "Stand on 12. I dare you.",
  "Hit again. I love repeat customers.",
  "You blink, I flip a face card.",
  "This hand has your bust on speed dial.",
  "Insurance? I sell disappointment by the ounce.",
  "Every ace you draw is pre-taxed by fate.",
  "The only thing softer than your total is that excuse.",
]);

export const ENCOUNTER_INTRO_OPENERS = Object.freeze({
  normal: [
    "You walked into my lane, now play this blackjack clean.",
    "I deal fast and punish slow hits.",
    "This table eats busted nerves for breakfast.",
    "Keep your pulse steady if you want out of this shoe alive.",
    ...DEALER_DIALOGUE_VERBATIM,
    ...DEALER_DIALOGUE_EXTRA,
  ],
  elite: [
    "You've reached an elite blackjack table, and the stakes bite back.",
    "I break hopeful runs one busted hand at a time.",
    "One mistake here and your chips turn to smoke.",
    "You've climbed high enough to lose to a cold shoe.",
    "I collect win streaks and cash them as busts.",
    "I don't count cards, I count broken doubles.",
    "Your confidence looks expensive. This hand is cash only.",
    "You brought courage to a hard-17 fight.",
    "I don't bluff. I flip and collect.",
    "Try a hero hit. I need a laugh.",
  ],
  boss: [
    "So you finally reached the heart of blackjack abyss.",
    "Every deal ends in debt when I run the table.",
    "This is where winning runs come to bust.",
    "The house is watching every hit and stand.",
    "I am the reason the odds stay house-favored.",
    "You don't beat me, you hope I bust first.",
    "The last hero stood on 16. Briefly.",
    "When I say all in, I mean all your chips.",
    "I don't fear aces. I bury them in dealer 21s.",
    "This isn't a duel, it's a final table sentence.",
  ],
});

export const ENCOUNTER_INTRO_CLOSERS = Object.freeze({
  normal: [
    "Show me your best hand.",
    "Deal if you dare.",
    "Try not to fold under pressure.",
  ],
  elite: [
    "Bring your best, because I won't blink.",
    "Show me a hand worth remembering.",
    "Survive this round and maybe you belong here.",
    "Step up and prove you're not bluffing.",
  ],
  boss: [
    "Play now and earn your way out.",
    "Show me a hand strong enough to break the house.",
    "No more warmups, this is the final test.",
    "Deal and face the table's true owner.",
  ],
});
