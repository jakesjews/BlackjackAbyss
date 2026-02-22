import Phaser from "phaser";
import { EMBER_MAX_SIZE, EMBER_MIN_SIZE, MENU_EMBER_TEXTURE_KEYS } from "./menu-scene-config.js";

export function ensureMenuSceneParticleTextures(scene) {
  const hasAllEmberTextures = MENU_EMBER_TEXTURE_KEYS.every((key) => scene.textures.exists(key));
  if (hasAllEmberTextures) {
    return;
  }

  const size = 20;
  const center = size * 0.5;
  const drawPoly = (gfx, points, alpha, color = 0xff9a3c) => {
    gfx.fillStyle(color, alpha);
    gfx.beginPath();
    gfx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      gfx.lineTo(points[i], points[i + 1]);
    }
    gfx.closePath();
    gfx.fillPath();
  };
  const drawBaseGlow = (gfx) => {
    gfx.fillStyle(0xff7a24, 0.24);
    gfx.fillCircle(center, center, 8.8);
    gfx.fillStyle(0xffc165, 0.42);
    gfx.fillCircle(center, center, 5.4);
  };

  const definitions = [
    {
      key: MENU_EMBER_TEXTURE_KEYS[0],
      draw: (gfx) => {
        drawBaseGlow(gfx);
        drawPoly(gfx, [center, center - 6, center + 3.7, center, center, center + 6, center - 3.7, center], 0.4, 0xff9a3c);
        drawPoly(gfx, [center, center - 3.7, center + 2.2, center, center, center + 3.7, center - 2.2, center], 1, 0xfff4d2);
      },
    },
    {
      key: MENU_EMBER_TEXTURE_KEYS[1],
      draw: (gfx) => {
        drawBaseGlow(gfx);
        drawPoly(
          gfx,
          [center - 5.8, center + 2.7, center + 4.8, center - 4.4, center + 6.1, center - 1.8, center - 4.4, center + 5.2],
          0.4,
          0xff8d34
        );
        drawPoly(gfx, [center - 3.2, center + 2.1, center + 2.9, center - 2.2, center + 3.8, center - 0.5, center - 2.5, center + 3.1], 1, 0xffefc7);
      },
    },
    {
      key: MENU_EMBER_TEXTURE_KEYS[2],
      draw: (gfx) => {
        drawBaseGlow(gfx);
        drawPoly(gfx, [center, center - 6, center + 4.8, center + 4.2, center - 4.8, center + 4.2], 0.4, 0xff9a3c);
        drawPoly(gfx, [center, center - 3.5, center + 2.8, center + 2.4, center - 2.8, center + 2.4], 1, 0xfff3cf);
      },
    },
    {
      key: MENU_EMBER_TEXTURE_KEYS[3],
      draw: (gfx) => {
        drawBaseGlow(gfx);
        gfx.fillStyle(0xff8d34, 0.4);
        gfx.fillRoundedRect(center - 6, center - 2.4, 12, 4.8, 1.8);
        gfx.fillStyle(0xfff1cb, 1);
        gfx.fillRoundedRect(center - 3.6, center - 1.2, 7.2, 2.4, 1.2);
      },
    },
  ];

  definitions.forEach(({ key, draw }) => {
    if (scene.textures.exists(key)) {
      return;
    }
    const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(gfx);
    gfx.generateTexture(key, size, size);
    gfx.destroy();
  });
}

export function resetMenuSceneEmberSprite(scene, ember, frame, fromBottom) {
  if (!ember || !frame) {
    return;
  }

  const x = Phaser.Math.Between(Math.round(frame.x + 10), Math.round(frame.x + frame.width - 10));
  const bottomEdgeMinY = Math.round(frame.y + frame.height - 8);
  const bottomEdgeMaxY = Math.round(frame.y + frame.height + 22);
  const y = Phaser.Math.Between(bottomEdgeMinY, bottomEdgeMaxY);
  const sizeRoll = Math.random();
  const size =
    sizeRoll < 0.72
      ? Phaser.Math.FloatBetween(EMBER_MIN_SIZE, 0.42)
      : sizeRoll < 0.96
        ? Phaser.Math.FloatBetween(0.42, 0.88)
        : Phaser.Math.FloatBetween(0.88, EMBER_MAX_SIZE);
  const palette = ember.emberPalette || [0xff9a35, 0xffa743, 0xffb650, 0xffc56a, 0xffd786];
  const tint = palette[Math.floor(Math.random() * palette.length)];
  const baseAlpha = Phaser.Math.FloatBetween(0.84, 1);
  const textureKey = Phaser.Utils.Array.GetRandom(MENU_EMBER_TEXTURE_KEYS);

  if (ember.texture?.key !== textureKey) {
    ember.setTexture(textureKey);
  }
  ember.setPosition(x, y);
  ember.setScale(size);
  ember.setTint(tint);
  ember.alpha = 0;

  const sizeT = Phaser.Math.Clamp((size - EMBER_MIN_SIZE) / (EMBER_MAX_SIZE - EMBER_MIN_SIZE), 0, 1);
  const speedBySize = Phaser.Math.Linear(2.6, 0.48, sizeT);
  ember.emberState = {
    baseAlpha,
    baseScale: size,
    vx: Phaser.Math.FloatBetween(-0.38, 0.38),
    vy: Phaser.Math.FloatBetween(-4.2, -0.7),
    swayAmount: Phaser.Math.FloatBetween(0.42, 1.45),
    swaySpeed: Phaser.Math.FloatBetween(0.0016, 0.0058),
    windInfluence: Phaser.Math.FloatBetween(0.14, 0.48),
    twinkleSpeed: Phaser.Math.FloatBetween(0.0019, 0.0052),
    spin: Phaser.Math.FloatBetween(-0.02, 0.02),
    phase: Math.random() * Math.PI * 2,
    scalePulseAmount: Phaser.Math.FloatBetween(0.03, 0.14),
    scalePulseSpeed: Phaser.Math.FloatBetween(0.0012, 0.0046),
    speedMult: speedBySize * Phaser.Math.FloatBetween(0.82, 1.18),
    life: Phaser.Math.Between(7000, 14500),
    age: 0,
  };
  if (!fromBottom) {
    ember.emberState.age = Phaser.Math.Between(Math.round(ember.emberState.life * 0.12), Math.round(ember.emberState.life * 0.28));
  } else {
    ember.emberState.age = Phaser.Math.Between(Math.round(ember.emberState.life * 0.18), Math.round(ember.emberState.life * 0.32));
  }
}

export function syncMenuSceneEmberField(scene, frame) {
  if (scene.disableVisualFx) {
    while (scene.emberSprites.length > 0) {
      const ember = scene.emberSprites.pop();
      ember?.destroy?.();
    }
    return;
  }

  const safeFrame = frame || {
    x: 0,
    y: 0,
    width: scene.scale.gameSize.width,
    height: scene.scale.gameSize.height,
  };
  const area = Math.max(1, safeFrame.width * safeFrame.height);
  const targetCount = Phaser.Math.Clamp(Math.round(area / 10000), 18, 44);
  const emberPalette = [0xff9a35, 0xffa743, 0xffb650, 0xffc56a, 0xffd786];

  while (scene.emberSprites.length < targetCount) {
    const textureKey = Phaser.Utils.Array.GetRandom(MENU_EMBER_TEXTURE_KEYS);
    const ember = scene.add.image(0, 0, textureKey).setDepth(19).setBlendMode(Phaser.BlendModes.NORMAL);
    ember.emberPalette = emberPalette;
    scene.emberSprites.push(ember);
  }
  while (scene.emberSprites.length > targetCount) {
    const ember = scene.emberSprites.pop();
    ember?.destroy?.();
  }

  scene.emberSprites.forEach((ember) => {
    if (!ember?.emberState) {
      resetMenuSceneEmberSprite(scene, ember, safeFrame, false);
      return;
    }
    const margin = 72;
    if (
      ember.x < safeFrame.x - margin ||
      ember.x > safeFrame.x + safeFrame.width + margin ||
      ember.y < safeFrame.y - margin ||
      ember.y > safeFrame.y + safeFrame.height + margin
    ) {
      resetMenuSceneEmberSprite(scene, ember, safeFrame, false);
    }
  });
}

export function updateMenuSceneEmbers(scene, time, delta) {
  if (!scene.menuFrameRect) {
    return;
  }
  if (!Array.isArray(scene.emberSprites) || scene.emberSprites.length === 0) {
    return;
  }

  const frame = scene.menuFrameRect;
  const wind = Math.sin(time * 0.0012) * 0.9 + Math.sin(time * 0.0025 + 0.9) * 0.45;
  const deltaMs = Number.isFinite(delta) ? delta : 16.67;
  const dt = Phaser.Math.Clamp(deltaMs / 16.67, 0.35, 2.4);

  for (let i = 0; i < scene.emberSprites.length; i += 1) {
    const ember = scene.emberSprites[i];
    const state = ember?.emberState;
    if (!ember || !state) {
      continue;
    }

    const speedMult = (state.speedMult || 1) * 1.22;
    const wavePrimary = Math.sin(time * state.swaySpeed + state.phase) * state.swayAmount;
    const waveSecondary = Math.sin(time * (state.swaySpeed * 1.85) + state.phase * 1.7) * state.swayAmount * 0.85;
    const waveTertiary = Math.sin(time * (state.swaySpeed * 2.7) + state.phase * 2.25) * state.swayAmount * 0.34;
    const sway = (wavePrimary + waveSecondary + waveTertiary) * 1.18;
    ember.x += (state.vx + sway + wind * state.windInfluence) * dt * speedMult;
    ember.y += state.vy * dt * speedMult;
    ember.rotation += state.spin * dt;

    state.age += deltaMs;
    const lifeT = Phaser.Math.Clamp(state.age / state.life, 0, 1);
    const fadeIn = Phaser.Math.Clamp(lifeT / 0.24, 0, 1);
    const fadeOut = Phaser.Math.Clamp((1 - lifeT) / 0.48, 0, 1);
    const envelope = Math.min(fadeIn, fadeOut);
    const twinkle = 1.04 + Math.sin(time * state.twinkleSpeed + state.phase) * 0.08;
    const riseT = Phaser.Math.Clamp((frame.y + frame.height - ember.y) / (frame.height + 36), 0, 1);
    const riseTAdjusted = Phaser.Math.Clamp(riseT * 1.15, 0, 1);
    const altitudeFade = 0.18 + (1 - Math.pow(riseTAdjusted, 1.05)) * 0.82;
    ember.alpha = Phaser.Math.Clamp(state.baseAlpha * envelope * twinkle * altitudeFade, 0, 1);
    const sizePulse = 1 + Math.sin(time * state.scalePulseSpeed + state.phase * 0.7) * state.scalePulseAmount;
    ember.setScale(state.baseScale * (0.94 + envelope * 0.52) * 0.64 * sizePulse);

    if (lifeT >= 1 || ember.y < frame.y - 34 || ember.x < frame.x - 42 || ember.x > frame.x + frame.width + 42) {
      resetMenuSceneEmberSprite(scene, ember, frame, true);
    }
  }
}
