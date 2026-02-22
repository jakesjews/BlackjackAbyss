import { ACTION_BUTTON_STYLE } from "../ui/button-styles.js";
import { createBrownTheme } from "../ui/brown-theme.js";

export const SHOP_CARD_STYLE = Object.freeze({
  fill: 0x22384a,
  fillSelected: 0x2c475e,
  border: 0x9ec1d8,
  borderSelected: 0xf2d38e,
});

export const SHOP_BUTTON_STYLE = ACTION_BUTTON_STYLE;
export const SHOP_CHIPS_ICON_KEY = "__shop-chips-icon__";
export const SHOP_CHIPS_ICON_TRIM_KEY = "__shop-chips-icon-trim__";
export const SHOP_BUY_ICON_KEY = "__shop-buy-icon__";
export const SHOP_DEAL_ICON_KEY = "__shop-deal-icon__";
export const SHOP_CAMP_BACKGROUND_KEY = "__shop-camp-background__";
export const SHOP_PRIMARY_GOLD = 0xf2cd88;
export const SHOP_MODAL_BASE_DEPTH = 300;
export const SHOP_MODAL_CONTENT_DEPTH = 310;
export const SHOP_MODAL_CLOSE_DEPTH = 320;

export const SHOP_TOP_ACTION_ICON_KEYS = Object.freeze({
  logs: "__shop-top-action-logs__",
  home: "__shop-top-action-home__",
});

export const SHOP_TOP_ACTION_ICONS = Object.freeze({
  logs: "/images/icons/log.png",
  home: "/images/icons/home.png",
});

export const SHOP_THEME_BLUE_HUE_MIN = 170;
export const SHOP_THEME_BLUE_HUE_MAX = 255;
export const SHOP_THEME_BROWN_HUE = 30 / 360;
export const SHOP_THEME_SATURATION_FLOOR = 0.18;
export const SHOP_THEME_SATURATION_SCALE = 0.8;

export const SHOP_BROWN_THEME = createBrownTheme({
  blueHueMin: SHOP_THEME_BLUE_HUE_MIN,
  blueHueMax: SHOP_THEME_BLUE_HUE_MAX,
  brownHue: SHOP_THEME_BROWN_HUE,
  saturationScale: SHOP_THEME_SATURATION_SCALE,
  saturationOffset: SHOP_THEME_SATURATION_FLOOR,
  patchFlag: "__shopBrownThemePatched",
});

export const SHOPKEEPER_DIALOGUE_VARIANTS = Object.freeze([
  "Welcome back, traveler. Browse slow, buy smart.",
  "Camp prices are fair. The odds are not.",
  "I've got relics with stories and scars. Pick one.",
  "Spend chips here, save regrets for the next room.",
  "Everything on this rack survived someone else first.",
  "Take your time. Leave camp stronger than you arrived.",
]);
