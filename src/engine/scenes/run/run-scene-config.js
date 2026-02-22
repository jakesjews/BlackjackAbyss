export const RUN_PARTICLE_KEY = "__run-particle__";
export const RUN_FIRE_CORE_PARTICLE_KEY = "__run-fire-core-particle__";
export const RUN_FIRE_GLOW_PARTICLE_KEY = "__run-fire-glow-particle__";
export const RUN_CARD_SHADOW_KEY = "__run-card-shadow__";
export const ENEMY_AVATAR_TEXTURE_PREFIX = "__enemy-avatar__";
export const RUN_TOP_BAR_HEIGHT = 74;
export const RUN_BOTTOM_BAR_HEIGHT = 106;
export const RUN_CHIPS_ICON_KEY = "__run-chips-icon__";
export const RUN_CHIPS_ICON_TRIM_KEY = "__run-chips-icon-trim__";
export const RUN_RELIC_ICON_KEY = "__run-relic-icon__";
export const RUN_PLAYER_AVATAR_KEY = "__run-player-avatar__";
export const RUN_CARD_BACKPLATE_KEY = "__run-card-backplate__";
export const RUN_CARD_HEIGHT_SCALE = 1.08;
export const RUN_MOBILE_BUTTON_SCALE = 0.75;
export const RUN_MOBILE_HAND_GROUP_SCALE_BOOST = 1.25;
export const RUN_DEALER_CARD_FLIP_MS = 560;
export const RUN_DEALER_CARD_FLIP_STRETCH = 0.14;
export const RUN_DEALER_CARD_ENTRY_MS = 460;
export const RUN_CARD_DEAL_GAP_MS = 90;
export const RUN_WATERMARK_KEY = "__run-watermark__";
export const RUN_WATERMARK_ALPHA = 0.75;
export const RUN_WATERMARK_RENDER_KEY = `__run-watermark-render-v9-a${Math.round(RUN_WATERMARK_ALPHA * 1000)}__`;
export const RUN_PRIMARY_GOLD = 0xf2cd88;
export const RUN_THEME_BLUE_HUE_MIN = 170;
export const RUN_THEME_BLUE_HUE_MAX = 255;
export const RUN_THEME_BROWN_HUE = 30 / 360;
export const RUN_THEME_SATURATION_FLOOR = 0.18;
export const RUN_THEME_SATURATION_SCALE = 0.74;
export const RUN_MODAL_BASE_DEPTH = 300;
export const RUN_MODAL_LAYER_STEP = 24;
export const RUN_MODAL_CONTENT_OFFSET = 8;
export const RUN_MODAL_CLOSE_OFFSET = 14;
export const RUN_ENEMY_DEFEAT_PULSE_STEPS = 7;
export const RUN_ENEMY_DEFEAT_PULSE_INTERVAL_MS = 78;
export const RUN_ACTION_ICONS = Object.freeze({
  hit: "/images/icons/hit.png",
  stand: "/images/icons/stand.png",
  split: "/images/icons/split.png",
  doubleDown: "/images/icons/double.png",
  deal: "/images/icons/deal.png",
  confirmIntro: "/images/icons/deal.png",
});
export const RUN_ACTION_ICON_KEYS = Object.freeze({
  hit: "__run-action-hit__",
  stand: "__run-action-stand__",
  split: "__run-action-split__",
  doubleDown: "__run-action-double__",
  deal: "__run-action-deal__",
  confirmIntro: "__run-action-confirm__",
});
export const RUN_ACTION_SHORTCUTS = Object.freeze({
  hit: "Z",
  stand: "X",
  split: "S",
  doubleDown: "C",
  deal: "ENTER",
  confirmIntro: "ENTER",
});
export const RUN_SECONDARY_BUTTON_STYLE = Object.freeze({
  idle: Object.freeze({
    top: 0x6d4f33,
    bottom: 0x3f2d1c,
    alpha: 1,
    stroke: 0xffffff,
    strokeAlpha: 0.58,
    strokeWidth: 1.4,
    innerStroke: 0xffffff,
    innerStrokeAlpha: 0.2,
    innerStrokeWidth: 1,
    innerInset: 1.5,
    glossColor: 0xb3936d,
    glossAlpha: 0.08,
    glossHeight: 0.56,
    glossBottomAlpha: 0,
    shadowColor: 0x000000,
    shadowAlpha: 0.3,
    shadowOffsetY: 3,
    text: "#f2f5f9",
    radius: 14,
  }),
  hover: Object.freeze({
    top: 0x7a5b3d,
    bottom: 0x493424,
    alpha: 1,
    stroke: 0xffffff,
    strokeAlpha: 0.72,
    strokeWidth: 1.6,
    innerStroke: 0xffffff,
    innerStrokeAlpha: 0.28,
    innerStrokeWidth: 1,
    innerInset: 1.5,
    glossColor: 0xc1a179,
    glossAlpha: 0.1,
    glossHeight: 0.58,
    glossBottomAlpha: 0,
    shadowColor: 0x000000,
    shadowAlpha: 0.32,
    shadowOffsetY: 3,
    text: "#ffffff",
    radius: 14,
  }),
  pressed: Object.freeze({
    top: 0x5f442c,
    bottom: 0x382717,
    alpha: 1,
    stroke: 0xffffff,
    strokeAlpha: 0.5,
    strokeWidth: 1.3,
    innerStroke: 0xffffff,
    innerStrokeAlpha: 0.16,
    innerStrokeWidth: 1,
    innerInset: 1.5,
    glossColor: 0x9f815d,
    glossAlpha: 0.05,
    glossHeight: 0.44,
    glossBottomAlpha: 0,
    shadowColor: 0x000000,
    shadowAlpha: 0.24,
    shadowOffsetY: 2,
    text: "#f1f5fb",
    radius: 14,
  }),
  disabled: Object.freeze({
    top: 0x6b5a48,
    bottom: 0x4f4337,
    alpha: 0.9,
    stroke: 0xffffff,
    strokeAlpha: 0.32,
    strokeWidth: 1.2,
    innerStroke: 0xffffff,
    innerStrokeAlpha: 0.12,
    innerStrokeWidth: 1,
    innerInset: 1.5,
    glossColor: 0x8f7b64,
    glossAlpha: 0.03,
    glossHeight: 0.48,
    glossBottomAlpha: 0,
    shadowColor: 0x000000,
    shadowAlpha: 0.18,
    shadowOffsetY: 2,
    text: "#dbe2ea",
    radius: 14,
  }),
});
export const SUIT_SYMBOL = Object.freeze({
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
});
export const RUN_TOP_ACTION_ICONS = Object.freeze({
  logs: "/images/icons/log.png",
  home: "/images/icons/home.png",
});
export const RUN_TOP_ACTION_ICON_KEYS = Object.freeze({
  logs: "__run-top-action-logs__",
  home: "__run-top-action-home__",
});
export const RUN_TOP_ACTION_TOOLTIPS = Object.freeze({
  logs: "Current run logs",
  home: "Return to title screen",
});
export const RUN_LOG_RESOLUTION_RE = /(?:\bhand\b|\bblackjack\b|\bbust\b|\bdouble\b|\bsplit\b|\bhit\b|\bstand\b|\bdeal\b|\bpush\b|\bwin\b|\blose\b|\bresolved?\b)/i;

export const ENEMY_AVATAR_KEY_BY_NAME = Object.freeze({
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
});

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
