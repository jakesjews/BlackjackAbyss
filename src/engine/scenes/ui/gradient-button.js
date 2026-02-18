import Phaser from "phaser";

const DESKTOP_HOVER_MEDIA = "(hover: hover) and (pointer: fine)";

function resolveStyle(styleSet, styleName) {
  return styleSet?.[styleName] || styleSet?.idle || {
    top: 0x4aa3d8,
    bottom: 0x2a6d99,
    alpha: 1,
    stroke: 0xc0deef,
    strokeAlpha: 0.42,
    text: "#f2f8ff",
    radius: 8,
  };
}

function canUseDesktopHoverScale() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(DESKTOP_HOVER_MEDIA).matches;
}

function drawVerticalBands(gfx, x, y, width, height, topColor, bottomColor, topAlpha = 1, bottomAlpha = 1, steps = 20) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const count = Math.max(2, Math.floor(steps));
  const bandH = h / count;
  const top = Phaser.Display.Color.IntegerToColor(topColor);
  const bottom = Phaser.Display.Color.IntegerToColor(bottomColor);

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const r = Math.round(Phaser.Math.Linear(top.red, bottom.red, t));
    const g = Math.round(Phaser.Math.Linear(top.green, bottom.green, t));
    const b = Math.round(Phaser.Math.Linear(top.blue, bottom.blue, t));
    const color = (r << 16) | (g << 8) | b;
    const alpha = Phaser.Math.Linear(topAlpha, bottomAlpha, t);
    gfx.fillStyle(color, alpha);
    gfx.fillRect(x, y + i * bandH, w, Math.ceil(bandH + 0.8));
  }
}

function applyButtonScale(button, targetScale) {
  const next = Number.isFinite(targetScale) ? targetScale : 1;
  if (button.currentScale === next) {
    return;
  }
  if (!button.scene?.tweens) {
    button.currentScale = next;
    button.container.setScale(next);
    return;
  }
  if (button.scaleTween) {
    button.scaleTween.stop();
    button.scaleTween = null;
  }
  button.currentScale = next;
  button.scaleTween = button.scene.tweens.add({
    targets: button.container,
    scaleX: next,
    scaleY: next,
    duration: next > button.container.scaleX ? 120 : 90,
    ease: "Sine.easeInOut",
    onComplete: () => {
      button.scaleTween = null;
    },
  });
}

function redrawButton(button, styleName) {
  const style = resolveStyle(button.styleSet, styleName);
  const w = Math.max(24, Number(button.width) || 24);
  const h = Math.max(16, Number(button.height) || 16);
  const radius = Math.max(4, Math.min(10, Number(style.radius) || Math.round(h * 0.18)));
  const bg = button.bg;
  const strokeWidth = Number.isFinite(style.strokeWidth) ? style.strokeWidth : 1.8;
  const strokeAlpha = Number.isFinite(style.strokeAlpha) ? style.strokeAlpha : 0.42;
  const shadowOffsetY = Number.isFinite(style.shadowOffsetY) ? style.shadowOffsetY : 2;
  const shadowAlpha = Number.isFinite(style.shadowAlpha) ? style.shadowAlpha : button.enabled ? 0.14 : 0.1;
  const innerInset = Number.isFinite(style.innerInset) ? style.innerInset : 1;
  const innerStrokeWidth = Number.isFinite(style.innerStrokeWidth) ? style.innerStrokeWidth : 1;
  const innerStrokeAlpha = Number.isFinite(style.innerStrokeAlpha) ? style.innerStrokeAlpha : 0.32;

  bg.clear();
  bg.fillStyle(style.shadowColor ?? 0x000000, shadowAlpha);
  bg.fillRoundedRect(-w * 0.5, -h * 0.5 + shadowOffsetY, w, h, radius);
  const fillAlpha = Number.isFinite(style.alpha) ? style.alpha : 1;
  bg.fillStyle(style.bottom, fillAlpha);
  bg.fillRoundedRect(-w * 0.5, -h * 0.5, w, h, radius);
  const fillInset = 1;
  drawVerticalBands(
    bg,
    -w * 0.5 + fillInset,
    -h * 0.5 + fillInset,
    Math.max(2, w - fillInset * 2),
    Math.max(2, h - fillInset * 2),
    style.top,
    style.bottom,
    fillAlpha,
    fillAlpha,
    Math.max(16, Math.round(h * 0.8))
  );
  bg.fillStyle(style.top, Math.min(0.14, fillAlpha * 0.14));
  bg.fillRoundedRect(-w * 0.5, -h * 0.5, w, Math.max(3, Math.round(h * 0.22)), radius);
  const glossAlpha = Number.isFinite(style.glossAlpha) ? style.glossAlpha : 0;
  if (glossAlpha > 0) {
    const glossColor = Number.isFinite(style.glossColor) ? style.glossColor : 0xffffff;
    const glossHeightRatio = Phaser.Math.Clamp(Number(style.glossHeight) || 0.52, 0.2, 1);
    const glossBottomAlpha = Number.isFinite(style.glossBottomAlpha) ? style.glossBottomAlpha : 0;
    const glossHeight = Math.max(4, Math.round(h * glossHeightRatio));
    drawVerticalBands(
      bg,
      -w * 0.5 + 1,
      -h * 0.5 + 1,
      Math.max(2, w - 2),
      Math.min(h - 2, glossHeight),
      glossColor,
      glossColor,
      glossAlpha,
      glossBottomAlpha,
      Math.max(8, Math.round(glossHeight * 0.75))
    );
  }
  if (strokeWidth > 0 && strokeAlpha > 0) {
    bg.lineStyle(strokeWidth, style.stroke, strokeAlpha);
    bg.strokeRoundedRect(-w * 0.5, -h * 0.5, w, h, radius);
  }
  if (style.innerStroke && innerStrokeWidth > 0 && innerStrokeAlpha > 0) {
    const innerW = Math.max(2, w - innerInset * 2);
    const innerH = Math.max(2, h - innerInset * 2);
    const innerRadius = Math.max(2, radius - innerInset * 0.5);
    bg.lineStyle(innerStrokeWidth, style.innerStroke, innerStrokeAlpha);
    bg.strokeRoundedRect(-w * 0.5 + innerInset, -h * 0.5 + innerInset, innerW, innerH, innerRadius);
  }

  button.text.setColor(style.text || "#f2f8ff");
  button.currentStyle = styleName;
  if (bg.input) {
    bg.input.cursor = button.enabled ? "pointer" : "default";
  }
}

function syncHitArea(button) {
  const w = Math.max(24, Number(button.width) || 24);
  const h = Math.max(16, Number(button.height) || 16);
  const area = button.bg.input?.hitArea;
  if (area && typeof area.setTo === "function") {
    area.setTo(-w * 0.5, -h * 0.5, w, h);
    return;
  }
  button.bg.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-w * 0.5, -h * 0.5, w, h),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
}

export function createGradientButton(
  scene,
  {
    id,
    label,
    styleSet,
    onPress,
    fontFamily = '"Chakra Petch", "Sora", sans-serif',
    fontStyle = "700",
    fontSize = 28,
    width = 210,
    height = 64,
    hoverScale = 1.02,
    pressedScale = 0.985,
    enableDesktopHoverScale = true,
  }
) {
  const container = scene.add.container(0, 0);
  const bg = scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, {
      fontFamily,
      fontStyle,
      fontSize: `${fontSize}px`,
      color: "#f2f8ff",
    })
    .setOrigin(0.5, 0.5);
  container.add([bg, text]);

  const button = {
    scene,
    id,
    container,
    bg,
    text,
    width,
    height,
    enabled: true,
    styleSet,
    onPress: typeof onPress === "function" ? onPress : null,
    currentStyle: "idle",
    currentScale: 1,
    hoverScale: Number.isFinite(hoverScale) ? hoverScale : 1.02,
    pressedScale: Number.isFinite(pressedScale) ? pressedScale : 0.985,
    allowDesktopHoverScale: Boolean(enableDesktopHoverScale) && canUseDesktopHoverScale(),
    scaleTween: null,
  };

  syncHitArea(button);
  redrawButton(button, "idle");
  applyButtonScale(button, 1);

  bg.on("pointerover", () => {
    if (!button.enabled) {
      return;
    }
    redrawButton(button, "hover");
    if (button.allowDesktopHoverScale) {
      applyButtonScale(button, button.hoverScale);
    }
  });
  bg.on("pointerout", () => {
    if (!button.enabled) {
      return;
    }
    redrawButton(button, "idle");
    applyButtonScale(button, 1);
  });
  bg.on("pointerdown", () => {
    if (!button.enabled) {
      return;
    }
    redrawButton(button, "pressed");
    if (button.allowDesktopHoverScale) {
      applyButtonScale(button, button.pressedScale);
    }
  });
  bg.on("pointerup", () => {
    if (!button.enabled) {
      return;
    }
    redrawButton(button, "hover");
    if (button.allowDesktopHoverScale) {
      applyButtonScale(button, button.hoverScale);
    } else {
      applyButtonScale(button, 1);
    }
    if (button.onPress) {
      button.onPress();
    }
  });

  return button;
}

export function setGradientButtonSize(button, width, height) {
  button.width = Math.max(24, Number(width) || button.width || 24);
  button.height = Math.max(16, Number(height) || button.height || 16);
  syncHitArea(button);
  redrawButton(button, button.currentStyle || "idle");
}

export function applyGradientButtonStyle(button, styleName) {
  redrawButton(button, styleName);
  if (!button.enabled || styleName === "disabled") {
    applyButtonScale(button, 1);
  }
}
