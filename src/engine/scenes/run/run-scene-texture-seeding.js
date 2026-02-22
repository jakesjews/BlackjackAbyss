import Phaser from "phaser";
import { RUN_CARD_SHADOW_KEY, RUN_FIRE_CORE_PARTICLE_KEY, RUN_FIRE_GLOW_PARTICLE_KEY, RUN_PARTICLE_KEY } from "./run-scene-config.js";

function ensureRunSceneRadialParticleTexture(scene, key, size, stops) {
  if (!key || scene.textures.exists(key) || typeof scene.textures.createCanvas !== "function") {
    return;
  }
  const safeSize = Math.max(8, Math.round(size || 32));
  const canvasTexture = scene.textures.createCanvas(key, safeSize, safeSize);
  const ctx = canvasTexture?.getContext?.();
  if (!ctx) {
    return;
  }
  const center = safeSize * 0.5;
  const gradient = ctx.createRadialGradient(center, center, 1, center, center, center);
  const colorStops = Array.isArray(stops) ? stops : [];
  if (colorStops.length === 0) {
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
  } else {
    colorStops.forEach(([offset, color]) => {
      gradient.addColorStop(Phaser.Math.Clamp(Number(offset) || 0, 0, 1), String(color || "rgba(255,255,255,1)"));
    });
  }
  ctx.clearRect(0, 0, safeSize, safeSize);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();
  canvasTexture.refresh();
}

export function ensureRunSceneParticleTextures(scene) {
  if (scene.textures.exists(RUN_PARTICLE_KEY)) {
    ensureRunSceneRadialParticleTexture(scene, RUN_FIRE_CORE_PARTICLE_KEY, 40, [
      [0, "rgba(255,255,255,1)"],
      [0.18, "rgba(255,242,205,0.98)"],
      [0.45, "rgba(255,170,78,0.85)"],
      [0.72, "rgba(255,98,38,0.46)"],
      [1, "rgba(255,84,32,0)"],
    ]);
    ensureRunSceneRadialParticleTexture(scene, RUN_FIRE_GLOW_PARTICLE_KEY, 68, [
      [0, "rgba(255,250,228,1)"],
      [0.2, "rgba(255,214,140,0.92)"],
      [0.44, "rgba(255,146,54,0.66)"],
      [0.72, "rgba(255,86,26,0.35)"],
      [1, "rgba(255,64,18,0)"],
    ]);
    return;
  }
  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
  gfx.fillStyle(0xffffff, 1);
  gfx.fillCircle(8, 8, 8);
  gfx.generateTexture(RUN_PARTICLE_KEY, 16, 16);
  gfx.destroy();
  ensureRunSceneRadialParticleTexture(scene, RUN_FIRE_CORE_PARTICLE_KEY, 40, [
    [0, "rgba(255,255,255,1)"],
    [0.18, "rgba(255,242,205,0.98)"],
    [0.45, "rgba(255,170,78,0.85)"],
    [0.72, "rgba(255,98,38,0.46)"],
    [1, "rgba(255,84,32,0)"],
  ]);
  ensureRunSceneRadialParticleTexture(scene, RUN_FIRE_GLOW_PARTICLE_KEY, 68, [
    [0, "rgba(255,250,228,1)"],
    [0.2, "rgba(255,214,140,0.92)"],
    [0.44, "rgba(255,146,54,0.66)"],
    [0.72, "rgba(255,86,26,0.35)"],
    [1, "rgba(255,64,18,0)"],
  ]);
}

export function ensureRunSceneCardShadowTexture(scene) {
  if (scene.textures.exists(RUN_CARD_SHADOW_KEY) || typeof scene.textures.createCanvas !== "function") {
    return;
  }
  const texW = 240;
  const texH = 332;
  const canvasTexture = scene.textures.createCanvas(RUN_CARD_SHADOW_KEY, texW, texH);
  const ctx = canvasTexture?.getContext?.();
  if (!ctx) {
    return;
  }
  const baseX = 52;
  const baseY = 18;
  const baseW = texW - 78;
  const baseH = texH - 36;
  const baseRadius = 24;
  const drawRoundRect = (x, y, w, h, r) => {
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
  };
  ctx.clearRect(0, 0, texW, texH);
  const passes = [
    { blur: 42, offsetX: -24, alpha: 0.2, inset: 0 },
    { blur: 28, offsetX: -18, alpha: 0.17, inset: 4 },
    { blur: 16, offsetX: -10, alpha: 0.13, inset: 8 },
  ];
  passes.forEach((pass) => {
    const inset = pass.inset;
    const x = baseX + inset;
    const y = baseY + inset * 0.22;
    const w = Math.max(24, baseW - inset * 1.2);
    const h = Math.max(24, baseH - inset * 0.55);
    const r = Math.max(10, baseRadius - inset * 0.28);
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${pass.alpha.toFixed(3)})`;
    ctx.shadowBlur = pass.blur;
    ctx.shadowOffsetX = pass.offsetX;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    drawRoundRect(x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  });
  canvasTexture.refresh();
}
