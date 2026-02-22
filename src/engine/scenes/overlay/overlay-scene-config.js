import { ACTION_BUTTON_STYLE } from "../ui/button-styles.js";
import { createBrownTheme } from "../ui/brown-theme.js";

export const OVERLAY_BUTTON_STYLE = ACTION_BUTTON_STYLE;
export const COLLECTION_ROW_GAP = 9;
export const COLLECTION_ROW_HEIGHT = 56;

const OVERLAY_THEME_BLUE_HUE_MIN = 170;
const OVERLAY_THEME_BLUE_HUE_MAX = 255;
const OVERLAY_THEME_BROWN_HUE = 30 / 360;
const OVERLAY_THEME_SATURATION_FLOOR = 0.18;
const OVERLAY_THEME_SATURATION_SCALE = 0.74;

export const OVERLAY_BROWN_THEME = createBrownTheme({
  blueHueMin: OVERLAY_THEME_BLUE_HUE_MIN,
  blueHueMax: OVERLAY_THEME_BLUE_HUE_MAX,
  brownHue: OVERLAY_THEME_BROWN_HUE,
  saturationScale: OVERLAY_THEME_SATURATION_SCALE,
  saturationFloor: OVERLAY_THEME_SATURATION_FLOOR,
  saturationOffset: 0,
  lightScale: 0.98,
  lightOffset: 0.02,
  patchFlag: "__overlayBrownThemePatched",
});
