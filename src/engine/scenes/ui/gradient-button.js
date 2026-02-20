import Phaser from "phaser";

const DESKTOP_HOVER_MEDIA = "(hover: hover) and (pointer: fine)";

function colorHex(value) {
  return `#${(value >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
}

function colorRgba(value, alpha) {
  const c = Phaser.Display.Color.IntegerToColor(value);
  const a = Math.max(0, Math.min(1, Number(alpha) || 0));
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${a})`;
}

function roundedPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, w * 0.5, h * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function textureKeyForStyle(styleName, style, w, h, radius, strokeWidth, strokeAlpha) {
  const alpha = Number.isFinite(style.alpha) ? style.alpha : 1;
  return [
    "__btn",
    styleName,
    w,
    h,
    Math.round(radius * 100),
    style.top,
    style.bottom,
    Math.round(alpha * 1000),
    style.stroke || 0,
    Math.round(strokeAlpha * 1000),
    Math.round(strokeWidth * 1000),
  ].join("-");
}

function ensureGradientTexture(scene, styleName, style, w, h, radius, strokeWidth, strokeAlpha) {
  const key = textureKeyForStyle(styleName, style, w, h, radius, strokeWidth, strokeAlpha);
  if (scene.textures.exists(key)) {
    return key;
  }
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, w, h);
  const alpha = Number.isFinite(style.alpha) ? style.alpha : 1;
  const inset = strokeWidth > 0 && strokeAlpha > 0 ? strokeWidth * 0.5 : 0;
  const drawW = Math.max(1, w - inset * 2);
  const drawH = Math.max(1, h - inset * 2);
  const drawRadius = Math.max(0, radius - inset);
  roundedPath(ctx, inset, inset, drawW, drawH, drawRadius);
  const gradient = ctx.createLinearGradient(0, inset, 0, inset + drawH);
  gradient.addColorStop(0, colorHex(style.top));
  gradient.addColorStop(1, colorHex(style.bottom));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (strokeWidth > 0 && strokeAlpha > 0) {
    ctx.strokeStyle = colorRgba(style.stroke, strokeAlpha);
    ctx.lineWidth = strokeWidth;
    roundedPath(ctx, inset, inset, drawW, drawH, drawRadius);
    ctx.stroke();
  }
  tex.refresh();
  return key;
}

function resolveStyle(styleSet, styleName) {
  return styleSet?.[styleName] || styleSet?.idle || {
    top: 0x4aa3d8,
    bottom: 0x2a6d99,
    alpha: 1,
    stroke: 0xc0deef,
    strokeAlpha: 0.42,
    text: "#f2f8ff",
    radius: 6,
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
  const radius = Math.max(4, Math.min(24, Number(style.radius) || Math.round(h * 0.28)));
  const bg = button.bg;
  const shadow = button.shadow;
  const strokeWidth = Number.isFinite(style.strokeWidth) ? style.strokeWidth : 1.8;
  const strokeAlpha = Number.isFinite(style.strokeAlpha) ? style.strokeAlpha : 0.42;
  const shadowOffsetY = Number.isFinite(style.shadowOffsetY) ? style.shadowOffsetY : 2;
  const shadowAlpha = Number.isFinite(style.shadowAlpha) ? style.shadowAlpha : button.enabled ? 0.14 : 0.1;
  shadow.clear();
  shadow.fillStyle(style.shadowColor ?? 0x000000, shadowAlpha);
  shadow.fillRoundedRect(-w * 0.5, -h * 0.5 + shadowOffsetY, w, h, radius);
  const textureKey = ensureGradientTexture(button.scene, styleName, style, w, h, radius, strokeWidth, strokeAlpha);
  bg.setTexture(textureKey);
  bg.setDisplaySize(w, h);
  bg.setVisible(true);

  button.text.setColor(style.text || "#f2f8ff");
  button.currentStyle = styleName;
  if (button.hitZone?.input) {
    button.hitZone.input.cursor = button.enabled ? "pointer" : "default";
  }
}

function syncHitArea(button) {
  const w = Math.max(24, Number(button.width) || 24);
  const h = Math.max(16, Number(button.height) || 16);
  if (!button.hitZone) {
    return;
  }
  button.hitZone.setPosition(-w * 0.5, -h * 0.5);
  button.hitZone.setSize(w, h);
  if (!button.hitZone.input) {
    button.hitZone.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    return;
  }
  const area = button.hitZone.input.hitArea;
  if (area && typeof area.setTo === "function") {
    area.setTo(0, 0, w, h);
  }
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
  const shadow = scene.add.graphics();
  const bg = scene.add.image(0, 0, "__WHITE");
  const safeW = Math.max(24, Number(width) || 24);
  const safeH = Math.max(16, Number(height) || 16);
  const hitZone = scene.add.zone(-safeW * 0.5, -safeH * 0.5, safeW, safeH);
  hitZone.setOrigin(0, 0);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily,
      fontStyle,
      fontSize: `${fontSize}px`,
      color: "#f2f8ff",
    })
    .setOrigin(0.5, 0.5);
  container.add([shadow, bg, text, hitZone]);

  const button = {
    scene,
    id,
    container,
    shadow,
    bg,
    hitZone,
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

  hitZone.on("pointerover", () => {
    if (!button.enabled) {
      return;
    }
    redrawButton(button, "hover");
    if (button.allowDesktopHoverScale) {
      applyButtonScale(button, button.hoverScale);
    }
  });
  hitZone.on("pointerout", () => {
    if (!button.enabled) {
      return;
    }
    redrawButton(button, "idle");
    applyButtonScale(button, 1);
  });
  hitZone.on("pointerdown", () => {
    if (!button.enabled) {
      return;
    }
    redrawButton(button, "pressed");
    if (button.allowDesktopHoverScale) {
      applyButtonScale(button, button.pressedScale);
    }
  });
  hitZone.on("pointerup", () => {
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
