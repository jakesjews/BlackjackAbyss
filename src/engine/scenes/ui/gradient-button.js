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
  const shadowOffsetY = Number.isFinite(style.shadowOffsetY) ? style.shadowOffsetY : 2;
  const shadowAlpha = Number.isFinite(style.shadowAlpha) ? style.shadowAlpha : button.enabled ? 0.14 : 0.1;
  const innerInset = Number.isFinite(style.innerInset) ? style.innerInset : 1;
  const innerStrokeWidth = Number.isFinite(style.innerStrokeWidth) ? style.innerStrokeWidth : 1;

  bg.clear();
  bg.fillStyle(style.shadowColor ?? 0x000000, shadowAlpha);
  bg.fillRoundedRect(-w * 0.5, -h * 0.5 + shadowOffsetY, w, h, radius);
  const fillAlpha = Number.isFinite(style.alpha) ? style.alpha : 1;
  bg.fillStyle(style.bottom, fillAlpha);
  bg.fillRoundedRect(-w * 0.5, -h * 0.5, w, h, radius);
  bg.fillGradientStyle(
    style.top,
    style.top,
    style.bottom,
    style.bottom,
    fillAlpha,
    fillAlpha,
    fillAlpha,
    fillAlpha
  );
  bg.fillRoundedRect(-w * 0.5, -h * 0.5, w, h, radius);
  bg.lineStyle(strokeWidth, style.stroke, style.strokeAlpha ?? 0.42);
  bg.strokeRoundedRect(-w * 0.5, -h * 0.5, w, h, radius);
  if (style.innerStroke) {
    const innerW = Math.max(2, w - innerInset * 2);
    const innerH = Math.max(2, h - innerInset * 2);
    const innerRadius = Math.max(2, radius - innerInset * 0.5);
    bg.lineStyle(innerStrokeWidth, style.innerStroke, style.innerStrokeAlpha ?? 0.32);
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
