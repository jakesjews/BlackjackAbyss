import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./gradient-button.js";

export const DEFAULT_MODAL_CLOSE_ICON_KEY = "__ui-modal-close-icon__";

export function ensureModalCloseIconTexture(scene, textureKey = DEFAULT_MODAL_CLOSE_ICON_KEY, color = 0x2a1c11) {
  if (scene?.textures?.exists(textureKey)) {
    return textureKey;
  }
  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
  gfx.lineStyle(3, color, 1);
  gfx.beginPath();
  gfx.moveTo(4, 4);
  gfx.lineTo(16, 16);
  gfx.moveTo(16, 4);
  gfx.lineTo(4, 16);
  gfx.strokePath();
  gfx.generateTexture(textureKey, 20, 20);
  gfx.destroy();
  return textureKey;
}

export function drawModalBackdrop(graphics, width, height, { color = 0x000000, alpha = 0.82 } = {}) {
  if (!graphics) {
    return;
  }
  graphics.fillStyle(color, alpha);
  graphics.fillRect(0, 0, width, height);
}

export function drawFramedModalPanel(
  graphics,
  {
    x,
    y,
    width,
    height,
    radius = 20,
    fillColor = 0x0f1f30,
    fillAlpha = 0.96,
    borderColor = 0x6f95b6,
    borderAlpha = 0.46,
    borderWidth = 1.4,
    headerColor = 0x0b1623,
    headerAlpha = 0.9,
    headerHeight = 52,
  }
) {
  if (!graphics) {
    return;
  }
  graphics.fillStyle(fillColor, fillAlpha);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(borderWidth, borderColor, borderAlpha);
  graphics.strokeRoundedRect(x, y, width, height, radius);
  graphics.fillStyle(headerColor, headerAlpha);
  graphics.fillRoundedRect(x, y, width, headerHeight, radius);
  graphics.fillRect(x, y + Math.floor(headerHeight * 0.5), width, Math.ceil(headerHeight * 0.5));
}

export function createModalCloseButton(
  scene,
  {
    id,
    styleSet,
    onPress,
    depth = 320,
    width = 42,
    height = 42,
    iconSize = 16,
    iconAlpha = 0.96,
    closeIconKey = DEFAULT_MODAL_CLOSE_ICON_KEY,
  }
) {
  const button = createGradientButton(scene, {
    id,
    label: "",
    styleSet,
    onPress,
    width,
    height,
    fontSize: 18,
    hoverScale: 1,
    pressedScale: 0.98,
  });
  button.text.setVisible(false);
  const iconTexture = ensureModalCloseIconTexture(scene, closeIconKey);
  const icon = scene.add.image(0, 0, iconTexture).setDisplaySize(iconSize, iconSize).setAlpha(iconAlpha);
  button.container.add(icon);
  button.icon = icon;
  button.container.setDepth(depth);
  return button;
}

export function placeModalCloseButton(
  button,
  {
    x,
    y,
    depth = null,
    width = 42,
    height = 42,
    iconSize = 16,
    enabled = true,
    visible = true,
    styleName = "idle",
    applyStyle = null,
  }
) {
  if (!button) {
    return;
  }
  setGradientButtonSize(button, width, height);
  if (button.icon) {
    button.icon.setDisplaySize(iconSize, iconSize);
  }
  button.enabled = Boolean(enabled);
  if (typeof applyStyle === "function") {
    applyStyle(button, styleName);
  } else {
    applyGradientButtonStyle(button, styleName);
  }
  if (depth != null) {
    button.container.setDepth(depth);
  }
  button.container.setPosition(x, y);
  button.container.setVisible(Boolean(visible));
}
