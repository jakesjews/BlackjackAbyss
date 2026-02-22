import Phaser from "phaser";
import { MENU_BUTTON_STYLE } from "../ui/button-styles.js";
import { createGradientButton, setGradientButtonSize } from "../ui/gradient-button.js";
import {
  MENU_BUTTON_FONT_SCALE,
  MENU_BUTTON_SIZE_SCALE,
  MENU_FRAME_RADIUS,
  MENU_SPLASH_FALLBACK_KEY,
  MENU_SPLASH_KEY,
  MENU_SPLASH_KEY_ALT,
} from "./menu-scene-config.js";
import { ensureMenuSceneParticleTextures, syncMenuSceneEmberField } from "./menu-scene-ember-renderers.js";

function ensureMenuSceneFallbackTexture(scene) {
  if (scene.textures.exists(MENU_SPLASH_FALLBACK_KEY)) {
    return;
  }
  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
  gfx.fillGradientStyle(0x2a2016, 0x2a2016, 0x1a140e, 0x1a140e, 1);
  gfx.fillRect(0, 0, 256, 360);
  gfx.fillStyle(0xefd6a8, 0.08);
  gfx.fillCircle(128, 150, 120);
  gfx.generateTexture(MENU_SPLASH_FALLBACK_KEY, 256, 360);
  gfx.destroy();
}

function validMenuTextureKey(scene, key) {
  if (!key || !scene.textures.exists(key)) {
    return false;
  }
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || null;
  const width = Number(source?.width) || 0;
  const height = Number(source?.height) || 0;
  return width > 8 && height > 8;
}

function resolveMenuSplashTextureKey(scene) {
  if (validMenuTextureKey(scene, MENU_SPLASH_KEY)) {
    return MENU_SPLASH_KEY;
  }
  if (validMenuTextureKey(scene, MENU_SPLASH_KEY_ALT)) {
    return MENU_SPLASH_KEY_ALT;
  }
  ensureMenuSceneFallbackTexture(scene);
  return MENU_SPLASH_FALLBACK_KEY;
}

function containMenuTexture(scene, textureKey, boundsW, boundsH) {
  const texture = scene.textures.get(textureKey);
  const source = texture?.source?.[0];
  const sourceW = Math.max(1, Number(source?.width) || Number(texture?.getSourceImage?.()?.width) || 1);
  const sourceH = Math.max(1, Number(source?.height) || Number(texture?.getSourceImage?.()?.height) || 1);
  const scale = Math.min(boundsW / sourceW, boundsH / sourceH);
  return {
    width: sourceW * scale,
    height: sourceH * scale,
  };
}

function coverMenuTexture(scene, textureKey, boundsW, boundsH) {
  const texture = scene.textures.get(textureKey);
  const source = texture?.source?.[0];
  const sourceW = Math.max(1, Number(source?.width) || Number(texture?.getSourceImage?.()?.width) || 1);
  const sourceH = Math.max(1, Number(source?.height) || Number(texture?.getSourceImage?.()?.height) || 1);
  const scale = Math.max(boundsW / sourceW, boundsH / sourceH);
  return {
    width: sourceW * scale,
    height: sourceH * scale,
  };
}

function createMenuSceneButton(scene, label, onPress) {
  return createGradientButton(scene, {
    id: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    styleSet: MENU_BUTTON_STYLE,
    onPress,
    fontStyle: "900",
    width: Math.round(286 * MENU_BUTTON_SIZE_SCALE),
    height: Math.round(56 * MENU_BUTTON_SIZE_SCALE),
    fontSize: Math.max(12, Math.round(28 * MENU_BUTTON_FONT_SCALE)),
  });
}

export function buildMenuSceneUi(scene) {
  scene.background = scene.add.graphics().setDepth(-60);
  scene.bgImage = scene.add.image(0, 0, resolveMenuSplashTextureKey(scene)).setOrigin(0.5, 0.5).setDepth(-44);
  scene.bgImage.setAlpha(1);

  scene.frameOverlay = scene.add.graphics().setDepth(-42);
  scene.frameBorder = scene.add.graphics().setDepth(-32);

  scene.frameMaskShape = scene.add.graphics().setDepth(-30).setVisible(false);
  scene.frameMask = scene.frameMaskShape.createGeometryMask();

  if (!scene.disableVisualFx) {
    ensureMenuSceneParticleTextures(scene);
    syncMenuSceneEmberField(scene, {
      x: 0,
      y: 0,
      width: scene.scale.gameSize.width,
      height: scene.scale.gameSize.height,
    });
  }

  scene.title = scene.add
    .text(0, 0, "BLACKJACK\nABYSS", {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "82px",
      fontStyle: "700",
      color: "#f6e6a6",
      align: "center",
      lineSpacing: -8,
    })
    .setOrigin(0.5, 0.5)
    .setDepth(20);
  scene.title.setShadow(0, 6, "#04060a", 12, true, true);

  scene.menuButtons = {
    newRun: createMenuSceneButton(scene, "NEW RUN", () => scene.runMenuAction("startRun")),
    resume: createMenuSceneButton(scene, "RESUME", () => scene.runMenuAction("resumeRun")),
    collection: createMenuSceneButton(scene, "COLLECTIONS", () => scene.runMenuAction("openCollection")),
  };

  scene.menuColumnContainer = scene.add.container(0, 0).setDepth(20);
  scene.menuColumnContainer.add(scene.title);
  scene.menuColumnContainer.add(scene.menuButtons.newRun.container);
  scene.menuColumnContainer.add(scene.menuButtons.resume.container);
  scene.menuColumnContainer.add(scene.menuButtons.collection.container);
}

export function playMenuSceneIntroAnimation(scene) {
  if (scene.title) {
    scene.title.setAlpha(1);
    scene.title.setScale(1);
  }
  ["newRun", "resume", "collection"].forEach((key) => {
    const button = scene.menuButtons?.[key];
    if (button?.container) {
      button.container.setAlpha(1);
      button.container.setScale(1);
    }
  });
}

export function resizeMenuSceneLayout(scene, gameSize) {
  const width = (gameSize && Number.isFinite(gameSize.width) ? gameSize.width : null) || scene.scale.gameSize.width;
  const height = (gameSize && Number.isFinite(gameSize.height) ? gameSize.height : null) || scene.scale.gameSize.height;
  const centerX = width * 0.5;

  scene.background.clear();
  scene.background.fillGradientStyle(0x081420, 0x081420, 0x040b12, 0x040b12, 1);
  scene.background.fillRect(0, 0, width, height);
  scene.background.fillStyle(0x2f5c7b, 0.04);
  scene.background.fillCircle(centerX, height * 0.34, height * 0.58);

  const frameX = 0;
  const frameY = 0;
  const frameW = Math.max(1, Math.round(width));
  const frameH = Math.max(1, Math.round(height));
  scene.menuFrameRect = { x: frameX, y: frameY, width: frameW, height: frameH };

  if (scene.bgImage) {
    const textureKey = scene.bgImage.texture?.key || resolveMenuSplashTextureKey(scene);
    const fitToViewport = scene.shouldUseFullscreenMobileMenu(width)
      ? coverMenuTexture(scene, textureKey, frameW, frameH)
      : containMenuTexture(scene, textureKey, frameW, frameH);
    scene.bgImage.setPosition(centerX, frameY + frameH * 0.5);
    scene.bgImage.setDisplaySize(fitToViewport.width, fitToViewport.height);
    scene.bgImage.setAlpha(1);
    if (scene.bgImage.mask && typeof scene.bgImage.clearMask === "function") {
      scene.bgImage.clearMask(true);
    }
  }

  if (scene.frameMaskShape) {
    scene.frameMaskShape.clear();
    scene.frameMaskShape.fillStyle(0xffffff, 1);
    scene.frameMaskShape.fillRoundedRect(frameX, frameY, frameW, frameH, MENU_FRAME_RADIUS);
  }

  scene.frameOverlay.clear();
  const centerFadeY = frameY + frameH * 0.46;
  const centerFadeH = Math.max(1, frameY + frameH - centerFadeY);
  const steps = 26;
  const bandH = centerFadeH / steps;
  for (let i = 0; i < steps; i += 1) {
    const t = i / Math.max(1, steps - 1);
    const alpha = Math.pow(t, 1.25) * 0.56;
    scene.frameOverlay.fillStyle(0x050a12, alpha);
    scene.frameOverlay.fillRect(frameX, centerFadeY + i * bandH, frameW, Math.ceil(bandH + 1));
  }

  scene.frameBorder.clear();
  scene.frameBorder.lineStyle(1.8, 0xbedff6, 0.42);
  scene.frameBorder.strokeRoundedRect(frameX, frameY, frameW, frameH, MENU_FRAME_RADIUS);

  syncMenuSceneEmberField(scene, scene.menuFrameRect);

  const layoutPadX = Math.max(18, Math.round(frameW * 0.1));
  const layoutPadTop = Math.max(20, Math.round(frameH * 0.08));
  const layoutPadBottom = Math.max(20, Math.round(frameH * 0.075));
  const layoutX = frameX + layoutPadX;
  const layoutY = frameY + layoutPadTop;
  const layoutW = Math.max(120, frameW - layoutPadX * 2);
  const layoutH = Math.max(120, frameH - layoutPadTop - layoutPadBottom);

  if (scene.menuColumnContainer) {
    scene.menuColumnContainer.setPosition(layoutX, layoutY);
  }

  const titleSizeBase = Math.max(44, Math.min(82, Math.round(layoutW * 0.22)));
  const titleSize = Math.max(28, Math.round(titleSizeBase * 0.75));
  const titleStackOffset = Math.max(14, Math.round(layoutH * 0.06));
  let titleBaseY = Math.round(layoutH * 0.16);
  if (scene.title) {
    scene.title.setScale(1);
    scene.title.setFontSize(titleSize);
    const maxTitleW = Math.max(120, layoutW * 0.92);
    if (scene.title.width > maxTitleW) {
      const titleScale = Phaser.Math.Clamp(maxTitleW / scene.title.width, 0.62, 1);
      scene.title.setScale(titleScale);
    }
    titleBaseY = Math.round(scene.title.height * 0.5 + titleStackOffset);
    scene.title.setPosition(layoutW * 0.5, titleBaseY);
  }

  const baseWidth = Math.max(238, Math.min(304, Math.round(layoutW * 0.92)));
  const baseHeight = Math.max(50, Math.min(62, Math.round(layoutH * 0.1)));
  const buttonWidth = Math.max(120, Math.round(baseWidth * MENU_BUTTON_SIZE_SCALE));
  const buttonHeight = Math.max(32, Math.round(baseHeight * MENU_BUTTON_SIZE_SCALE));
  const baseFontSize = Math.max(24, Math.min(31, Math.round((buttonHeight * 0.54) / MENU_BUTTON_SIZE_SCALE)));
  const buttonFontSize = Math.max(12, Math.round(baseFontSize * MENU_BUTTON_FONT_SCALE));
  const stackGap = Math.max(8, Math.round(buttonHeight * 0.4));
  const titleBottom = scene.title ? titleBaseY + scene.title.height * 0.5 : Math.round(layoutH * 0.24);
  const topGap = Math.max(10, Math.round(layoutH * 0.045));
  const newRunBaseY = Math.round(titleBottom + topGap + buttonHeight * 0.5);
  const resumeBaseY = newRunBaseY + buttonHeight + stackGap;
  const bottomPad = Math.max(10, Math.round(layoutH * 0.045));
  const collectionY = Math.round(layoutH - bottomPad - buttonHeight * 0.5);
  const requestedStackShift = Math.round(frameH * 0.25);
  const maxStackShift = Math.max(0, collectionY - (resumeBaseY + buttonHeight + stackGap));
  const stackShift = Math.min(requestedStackShift, maxStackShift);
  const newRunY = newRunBaseY + stackShift;
  const resumeY = resumeBaseY + stackShift;

  if (scene.title) {
    scene.title.setY(titleBaseY + stackShift);
  }

  const layoutForButton = (button, localY) => {
    if (!button) {
      return;
    }
    button.container.setPosition(layoutW * 0.5, localY);
    setGradientButtonSize(button, buttonWidth, buttonHeight);
    button.text.setFontSize(buttonFontSize);
  };

  layoutForButton(scene.menuButtons?.newRun, newRunY);
  layoutForButton(scene.menuButtons?.resume, resumeY);
  layoutForButton(scene.menuButtons?.collection, collectionY);
}
