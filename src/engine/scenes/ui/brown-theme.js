function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl(r, g, b) {
  const rn = clamp((Number(r) || 0) / 255, 0, 1);
  const gn = clamp((Number(g) || 0) / 255, 0, 1);
  const bn = clamp((Number(b) || 0) / 255, 0, 1);
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) * 0.5;

  if (delta > 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rn) {
      h = (gn - bn) / delta + (gn < bn ? 6 : 0);
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const hue = ((Number(h) || 0) % 1 + 1) % 1;
  const sat = clamp(Number(s) || 0, 0, 1);
  const light = clamp(Number(l) || 0, 0, 1);
  if (sat === 0) {
    const value = Math.round(light * 255);
    return { r: value, g: value, b: value };
  }
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const hue2rgb = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  return {
    r: Math.round(hue2rgb(hue + 1 / 3) * 255),
    g: Math.round(hue2rgb(hue) * 255),
    b: Math.round(hue2rgb(hue - 1 / 3) * 255),
  };
}

const DEFAULT_BROWN_THEME = Object.freeze({
  blueHueMin: 170,
  blueHueMax: 255,
  brownHue: 30 / 360,
  saturationScale: 0.8,
  saturationOffset: 0.18,
  saturationFloor: 0,
  lightScale: 1,
  lightOffset: 0,
  patchFlag: "__brownThemePatched",
});

function resolveTheme(theme) {
  return theme || DEFAULT_BROWN_THEME;
}

export function createBrownTheme(theme = {}) {
  return Object.freeze({ ...DEFAULT_BROWN_THEME, ...theme });
}

export function toBrownThemeColorNumber(value, theme = DEFAULT_BROWN_THEME) {
  if (!Number.isFinite(value)) {
    return value;
  }
  const colorValue = clamp(Math.round(value), 0, 0xffffff);
  const safeTheme = resolveTheme(theme);
  const r = (colorValue >> 16) & 0xff;
  const g = (colorValue >> 8) & 0xff;
  const b = colorValue & 0xff;
  const { h, s, l } = rgbToHsl(r, g, b);
  const hueDeg = h * 360;
  if (s < 0.08 || hueDeg < safeTheme.blueHueMin || hueDeg > safeTheme.blueHueMax) {
    return colorValue;
  }

  const shiftedSat = clamp(
    Math.max(safeTheme.saturationFloor, s * safeTheme.saturationScale + safeTheme.saturationOffset),
    0,
    1
  );
  const shiftedLight = clamp(l * safeTheme.lightScale + safeTheme.lightOffset, 0, 1);
  const shifted = hslToRgb(safeTheme.brownHue, shiftedSat, shiftedLight);
  return (shifted.r << 16) | (shifted.g << 8) | shifted.b;
}

export function toBrownThemeColorString(value, theme = DEFAULT_BROWN_THEME) {
  if (typeof value !== "string" || !value.startsWith("#")) {
    return value;
  }
  const input = Number.parseInt(value.slice(1), 16);
  if (!Number.isFinite(input)) {
    return value;
  }
  const output = toBrownThemeColorNumber(input, theme);
  return `#${output.toString(16).padStart(6, "0")}`;
}

export function toBrownThemeTextStyle(style, theme = DEFAULT_BROWN_THEME) {
  if (!style || typeof style !== "object") {
    return style;
  }
  const themed = { ...style };
  if (typeof themed.color === "string") {
    themed.color = toBrownThemeColorString(themed.color, theme);
  }
  if (typeof themed.stroke === "string") {
    themed.stroke = toBrownThemeColorString(themed.stroke, theme);
  }
  if (typeof themed.backgroundColor === "string") {
    themed.backgroundColor = toBrownThemeColorString(themed.backgroundColor, theme);
  }
  return themed;
}

export function applyBrownThemeToGraphics(graphics, theme = DEFAULT_BROWN_THEME) {
  if (!graphics) {
    return graphics;
  }
  const safeTheme = resolveTheme(theme);
  const patchFlag = safeTheme.patchFlag || DEFAULT_BROWN_THEME.patchFlag;
  if (graphics[patchFlag]) {
    return graphics;
  }

  const fillStyle = graphics.fillStyle;
  const lineStyle = graphics.lineStyle;
  const fillGradientStyle = graphics.fillGradientStyle;

  if (typeof fillStyle === "function") {
    graphics.fillStyle = (color, alpha) =>
      fillStyle.call(graphics, toBrownThemeColorNumber(color, safeTheme), alpha);
  }
  if (typeof lineStyle === "function") {
    graphics.lineStyle = (lineWidth, color, alpha) =>
      lineStyle.call(graphics, lineWidth, toBrownThemeColorNumber(color, safeTheme), alpha);
  }
  if (typeof fillGradientStyle === "function") {
    graphics.fillGradientStyle = (topLeft, topRight, bottomLeft, bottomRight, ...rest) =>
      fillGradientStyle.call(
        graphics,
        toBrownThemeColorNumber(topLeft, safeTheme),
        toBrownThemeColorNumber(topRight, safeTheme),
        toBrownThemeColorNumber(bottomLeft, safeTheme),
        toBrownThemeColorNumber(bottomRight, safeTheme),
        ...rest
      );
  }

  graphics[patchFlag] = true;
  return graphics;
}
