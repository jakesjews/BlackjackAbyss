export function createAmbientOrbs({
  width,
  height,
  count = 44,
  random = Math.random,
}) {
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    radius: 1.2 + random() * 4.6,
    speed: 3 + random() * 12,
    alpha: 0.05 + random() * 0.11,
  }));
}

export function createMenuMotes({
  width,
  height,
  count = 39,
  random = Math.random,
}) {
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    radius: 0.675 + random() * 1.65,
    vx: -24 + random() * 48,
    vy: -34 - random() * 136,
    alpha: 0.2 + random() * 0.4,
    twinkle: 1.1 + random() * 2.4,
    phase: random() * Math.PI * 2,
    warm: true,
    heat: random(),
    drift: 0.8 + random() * 1.6,
    swirl: 0.6 + random() * 1.8,
    speedScale: 0.7 + random() * 1.65,
    spin: -2.4 + random() * 4.8,
    shape: Math.floor(random() * 3),
  }));
}

export function createRuntimeVisualSeeds({
  width,
  height,
  random = Math.random,
}) {
  return {
    ambientOrbs: createAmbientOrbs({
      width,
      height,
      random,
    }),
    menuMotes: createMenuMotes({
      width,
      height,
      random,
    }),
  };
}
