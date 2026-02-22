import { ACTION_BUTTON_STYLE } from "../ui/button-styles.js";
import { createBrownTheme } from "../ui/brown-theme.js";

export const REWARD_CARD_STYLE = Object.freeze({
  fill: 0x12263a,
  fillSelected: 0x18324a,
  edge: 0x2f4f68,
  edgeSelected: 0x87bce4,
  pill: 0x153a55,
  pillSelected: 0x1f4d6d,
  claim: 0xd8a255,
  claimSelected: 0xe6ba72,
});

export const REWARD_BUTTON_STYLE = ACTION_BUTTON_STYLE;
export const REWARD_CHIPS_ICON_KEY = "__reward-chips-icon__";
export const REWARD_CHIPS_ICON_TRIM_KEY = "__reward-chips-icon-trim__";
export const REWARD_PRIMARY_GOLD = 0xf2cd88;
export const REWARD_MODAL_BASE_DEPTH = 300;
export const REWARD_MODAL_CONTENT_DEPTH = 310;
export const REWARD_MODAL_CLOSE_DEPTH = 320;

export const REWARD_TOP_ACTION_ICON_KEYS = Object.freeze({
  logs: "__reward-top-action-logs__",
  home: "__reward-top-action-home__",
});

export const REWARD_TOP_ACTION_ICONS = Object.freeze({
  logs: "/images/icons/log.png",
  home: "/images/icons/home.png",
});

export const REWARD_THEME_BLUE_HUE_MIN = 170;
export const REWARD_THEME_BLUE_HUE_MAX = 255;
export const REWARD_THEME_BROWN_HUE = 30 / 360;
export const REWARD_THEME_SATURATION_FLOOR = 0.18;
export const REWARD_THEME_SATURATION_SCALE = 0.8;

export const REWARD_BROWN_THEME = createBrownTheme({
  blueHueMin: REWARD_THEME_BLUE_HUE_MIN,
  blueHueMax: REWARD_THEME_BLUE_HUE_MAX,
  brownHue: REWARD_THEME_BROWN_HUE,
  saturationScale: REWARD_THEME_SATURATION_SCALE,
  saturationOffset: REWARD_THEME_SATURATION_FLOOR,
  patchFlag: "__rewardBrownThemePatched",
});
