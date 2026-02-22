import { createDeck, shuffle } from "../domain/combat.js";
import { resolveRoomType } from "../domain/progression.js";
import {
  DEALER_DIALOGUE_VERBATIM_SET,
  ENCOUNTER_INTRO_CLOSERS,
  ENCOUNTER_INTRO_OPENERS,
  ENEMY_AVATAR_BY_NAME,
  ENEMY_NAMES,
} from "./encounter-content.js";

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}

function pickRandom(list, fallback, random = Math.random) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }
  const index = Math.floor(Math.max(0, random()) * list.length);
  return list[index] || fallback;
}

export function pickEnemyName(type, enemyNames = ENEMY_NAMES, random = Math.random) {
  const names = enemyNames?.[type];
  if (Array.isArray(names) && names.length > 0) {
    return pickRandom(names, names[0], random);
  }
  const fallbackPool = enemyNames?.normal;
  if (Array.isArray(fallbackPool) && fallbackPool.length > 0) {
    return pickRandom(fallbackPool, fallbackPool[0], random);
  }
  return "Unknown Dealer";
}

export function sanitizeEnemyAvatarKey(name) {
  if (typeof name !== "string") {
    return "";
  }
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createEnemy({
  floor,
  room,
  type,
  sanitizeEnemyAvatarKey: sanitizeEnemyAvatarKeyFn,
  enemyNames = ENEMY_NAMES,
  enemyAvatarByName = ENEMY_AVATAR_BY_NAME,
  random = Math.random,
}) {
  const name = pickEnemyName(type, enemyNames, random);
  const safeSanitize = typeof sanitizeEnemyAvatarKeyFn === "function" ? sanitizeEnemyAvatarKeyFn : sanitizeEnemyAvatarKey;
  const avatarKey = enemyAvatarByName[name] || safeSanitize(name);

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

export function buildEnemyIntroDialogue({
  enemy,
  lastIntroDialogue = "",
  introOpeners = ENCOUNTER_INTRO_OPENERS,
  introClosers = ENCOUNTER_INTRO_CLOSERS,
  verbatimSet = DEALER_DIALOGUE_VERBATIM_SET,
  random = Math.random,
}) {
  const encounterType = enemy?.type === "boss" ? "boss" : enemy?.type === "elite" ? "elite" : "normal";
  const openers = introOpeners[encounterType] || introOpeners.normal;
  const closers = introClosers[encounterType] || introClosers.normal;
  const fallbackOpener = "You made it to my table.";
  const fallbackCloser = "Show me your hand.";

  const composeDialogue = () => {
    const opener = pickRandom(openers, fallbackOpener, random);
    if (verbatimSet.has(opener)) {
      return opener;
    }
    const closer = pickRandom(closers, fallbackCloser, random);
    return `${opener} ${closer}`.replace(/\s+/g, " ").trim();
  };

  let dialogue = composeDialogue();
  if (dialogue === lastIntroDialogue && (openers.length > 1 || closers.length > 1)) {
    for (let i = 0; i < 4 && dialogue === lastIntroDialogue; i += 1) {
      dialogue = composeDialogue();
    }
  }
  return {
    dialogue,
    nextLastIntroDialogue: dialogue,
  };
}

export function createEncounterIntroState({
  enemy,
  introLike = null,
  clampNumberFn = clampNumber,
  buildEnemyIntroDialogueFn,
}) {
  const typedLike = introLike && typeof introLike === "object" ? introLike : {};
  const resolveDialogue =
    typeof buildEnemyIntroDialogueFn === "function"
      ? buildEnemyIntroDialogueFn
      : (nextEnemy) => buildEnemyIntroDialogue({ enemy: nextEnemy }).dialogue;

  const sourceDialogue =
    typeof typedLike.dialogue === "string" && typedLike.dialogue.trim().length > 0
      ? typedLike.dialogue.trim()
      : resolveDialogue(enemy);
  const dialogue = sourceDialogue.replace(/\s+/g, " ").trim();
  const maxChars = dialogue.length;
  let visibleChars = clampNumberFn(typedLike.visibleChars, 0, maxChars, 0);
  let ready = Boolean(typedLike.ready) || visibleChars >= maxChars;
  if (ready) {
    visibleChars = maxChars;
  }
  return {
    active: Boolean(typedLike.active),
    dialogue,
    visibleChars,
    typeTimer: clampNumberFn(typedLike.typeTimer, 0, 4, 0.18),
    ready,
    confirmRect: null,
  };
}

export function createEncounter({
  run,
  createEnemyFn,
  createEncounterIntroStateFn,
  resolveRoomTypeFn = resolveRoomType,
  createDeckFn = createDeck,
  shuffleFn = shuffle,
}) {
  if (!run || typeof createEnemyFn !== "function" || typeof createEncounterIntroStateFn !== "function") {
    return null;
  }
  const type = resolveRoomTypeFn(run.room, run.roomsPerFloor);
  const enemy = createEnemyFn(run.floor, run.room, type);
  return {
    enemy,
    shoe: shuffleFn(createDeckFn(4)),
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
    resolvedHands: 0,
    doubleDown: false,
    bustGuardTriggered: false,
    critTriggered: false,
    lastPlayerAction: "none",
    intro: createEncounterIntroStateFn(enemy, { active: true, visibleChars: 0, ready: false, typeTimer: 0.28 }),
  };
}
