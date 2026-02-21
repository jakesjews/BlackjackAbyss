export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeOutCubic(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - (1 - clamped) ** 3;
}

export function easeOutBack(t) {
  const clamped = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (clamped - 1) ** 3 + c1 * (clamped - 1) ** 2;
}

export function spawnFloatText({ state, text, x, y, color, opts = {}, random = Math.random }) {
  const life = Math.max(0.1, Number(opts.life) || 1.2);
  state.floatingTexts.push({
    text,
    x,
    y,
    color,
    life,
    maxLife: life,
    vy: Number.isFinite(opts.vy) ? opts.vy : 24,
    size: Math.max(12, Number(opts.size) || 26),
    weight: Math.max(500, Number(opts.weight) || 700),
    jitter: Boolean(opts.jitter),
    glow: typeof opts.glow === "string" ? opts.glow : "",
    jitterSeed: random() * Math.PI * 2,
  });
}

export function animatedCardPosition({ card, targetX, targetY, worldTime }) {
  const dealtAt = Number(card?.dealtAt);
  if (!Number.isFinite(dealtAt)) {
    return { x: targetX, y: targetY, alpha: 1 };
  }

  const progress = (worldTime - dealtAt) / 0.28;
  if (progress >= 1) {
    return { x: targetX, y: targetY, alpha: 1 };
  }

  const t = Math.max(0, progress);
  const eased = easeOutBack(t);
  const fromX = Number.isFinite(card?.fromX) ? card.fromX : targetX;
  const fromY = Number.isFinite(card?.fromY) ? card.fromY : targetY;
  const arc = Math.sin(t * Math.PI) * 16 * (1 - t);
  return {
    x: lerp(fromX, targetX, eased),
    y: lerp(fromY, targetY, eased) - arc,
    alpha: 0.42 + 0.58 * easeOutCubic(t),
  };
}

export function spawnSparkBurst({ state, x, y, color, count = 12, speed = 160, random = Math.random }) {
  const total = Math.max(2, Math.floor(count));
  for (let i = 0; i < total; i += 1) {
    const angle = random() * Math.PI * 2;
    const velocity = speed * (0.45 + random() * 0.85);
    state.sparkParticles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - random() * 55,
      size: 1.4 + random() * 3.2,
      color,
      life: 0.34 + random() * 0.35,
      maxLife: 0.34 + random() * 0.35,
    });
  }
}

export function triggerScreenShake({ state, power = 6, duration = 0.2 }) {
  state.screenShakePower = Math.max(state.screenShakePower, power);
  state.screenShakeDuration = Math.max(state.screenShakeDuration, duration);
  state.screenShakeTime = Math.max(state.screenShakeTime, duration);
}

export function triggerFlash({ state, color, intensity = 0.08, duration = 0.16 }) {
  state.flashOverlays.push({
    color,
    intensity: Math.max(0, intensity),
    life: Math.max(0.01, duration),
    maxLife: Math.max(0.01, duration),
  });
}

export function triggerImpactBurstAt({
  state,
  x,
  y,
  amount,
  color,
  spawnSparkBurstFn = spawnSparkBurst,
  triggerScreenShakeFn = triggerScreenShake,
  triggerFlashFn = triggerFlash,
}) {
  const clampedAmount = Math.max(1, Number(amount) || 1);
  spawnSparkBurstFn({ state, x, y, color, count: 10 + Math.min(30, Math.floor(clampedAmount * 1.4)), speed: 140 + clampedAmount * 9 });
  spawnSparkBurstFn({
    state,
    x,
    y,
    color: "#f7e8bf",
    count: 8 + Math.min(14, Math.floor(clampedAmount * 0.6)),
    speed: 120 + clampedAmount * 7,
  });
  state.cardBursts.push({
    x,
    y,
    color,
    life: 0.34,
    maxLife: 0.34,
  });
  triggerScreenShakeFn({
    state,
    power: Math.min(18, 4 + clampedAmount * 0.72),
    duration: 0.16 + Math.min(0.2, clampedAmount * 0.012),
  });
  triggerFlashFn({
    state,
    color,
    intensity: Math.min(0.2, 0.035 + clampedAmount * 0.004),
    duration: 0.14,
  });
}

export function triggerImpactBurst({ state, side, amount, color, width, height, triggerImpactBurstAtFn = triggerImpactBurstAt }) {
  const clampedAmount = Math.max(1, Number(amount) || 1);
  const x = side === "enemy" ? width * 0.73 : width * 0.27;
  const y = side === "enemy" ? 108 : height - 144;
  triggerImpactBurstAtFn({
    state,
    x,
    y,
    amount: clampedAmount,
    color,
  });
}

export function handTackleTargets({
  state,
  winner,
  width,
  height,
  handBoundsFn,
}) {
  if (!state?.encounter) {
    return null;
  }

  const side = winner === "enemy" ? "dealer" : "player";
  const loserSide = winner === "enemy" ? "player" : "enemy";
  const layout = state.combatLayout || null;
  const playerCount = Math.max(1, state.encounter.playerHand?.length || 0);
  const dealerCount = Math.max(1, state.encounter.dealerHand?.length || 0);
  const fallbackDealerBox = typeof handBoundsFn === "function" ? handBoundsFn("dealer", dealerCount) : null;
  const fallbackPlayerBox = typeof handBoundsFn === "function" ? handBoundsFn("player", playerCount) : null;
  const box = side === "dealer" ? layout?.dealerBox || fallbackDealerBox : layout?.playerBox || fallbackPlayerBox;
  if (!box) {
    return null;
  }

  const targetPortrait = loserSide === "enemy" ? layout?.enemyPortrait : layout?.playerPortrait;
  const targetX = targetPortrait ? targetPortrait.centerX : winner === "enemy" ? width * 0.28 : width * 0.72;
  const targetY = targetPortrait ? targetPortrait.centerY : winner === "enemy" ? height * 0.82 : 114;
  return {
    fromX: box.centerX,
    fromY: box.centerY,
    toX: targetX,
    toY: targetY,
  };
}

export function triggerHandTackle({
  state,
  winner,
  amount,
  impactPayload = null,
  cardW,
  cardH,
  width,
  height,
  handBoundsFn,
  handTackleTargetsFn = handTackleTargets,
}) {
  if (!state?.encounter) {
    return false;
  }

  const points = handTackleTargetsFn({
    state,
    winner,
    width,
    height,
    handBoundsFn,
  });
  if (!points) {
    return false;
  }

  const layout = state.combatLayout || null;
  const sourceRects = winner === "enemy" ? layout?.dealerCards : layout?.playerCards;
  const sourceHand = winner === "enemy" ? state.encounter.dealerHand : state.encounter.playerHand;
  const count = Math.min(4, sourceHand.length);
  if (count <= 0) {
    return false;
  }

  const defaultW = Math.max(1, Number(cardW) || 88) * 0.72;
  const defaultH = Math.max(1, Number(cardH) || 124) * 0.72;
  const projectiles = [];
  for (let i = 0; i < count; i += 1) {
    const card = sourceHand[i];
    const rect = sourceRects && sourceRects[i] ? sourceRects[i] : null;
    const fallbackX = points.fromX + (i - (count - 1) * 0.5) * 24;
    const fallbackY = points.fromY + Math.abs(i - (count - 1) * 0.5) * 6;
    projectiles.push({
      card: { ...card },
      fromX: rect ? rect.x + rect.w * 0.5 : fallbackX,
      fromY: rect ? rect.y + rect.h * 0.5 : fallbackY,
      w: rect ? rect.w : defaultW,
      h: rect ? rect.h : defaultH,
    });
  }

  state.handTackles.push({
    projectiles,
    winner,
    fromX: points.fromX,
    fromY: points.fromY,
    toX: points.toX,
    toY: points.toY,
    elapsed: 0,
    duration: 0.56,
    impactAt: 0.72,
    impacted: false,
    amount: Math.max(1, Number(amount) || 1),
    color: winner === "enemy" ? "#ff8eaf" : "#f6d06e",
    impactPayload,
  });
  return true;
}

export function startDefeatTransition({
  state,
  target,
  handBoundsFn,
  spawnSparkBurstFn = spawnSparkBurst,
  triggerScreenShakeFn = triggerScreenShake,
  triggerFlashFn = triggerFlash,
  playImpactSfxFn,
  enemyDefeatTransitionSeconds,
  playerDefeatTransitionSeconds,
  random = Math.random,
}) {
  if (!state?.encounter || state.pendingTransition) {
    return false;
  }

  const handType = target === "enemy" ? "dealer" : "player";
  const hand = target === "enemy" ? state.encounter.dealerHand : state.encounter.playerHand;
  const layout = state.combatLayout || null;
  const cardScale = layout?.cardScale || 1;
  const fallbackBounds = typeof handBoundsFn === "function"
    ? handBoundsFn(handType, Math.max(1, hand.length), 0, cardScale)
    : null;
  const bounds = target === "enemy" ? layout?.dealerBox || fallbackBounds : layout?.playerBox || fallbackBounds;
  if (!bounds) {
    return false;
  }

  const color = target === "enemy" ? "#ffb07a" : "#ff8eaf";
  for (let i = 0; i < 3; i += 1) {
    const xJitter = (random() * 2 - 1) * 24;
    const yJitter = (random() * 2 - 1) * 18;
    spawnSparkBurstFn({
      state,
      x: bounds.centerX + xJitter,
      y: bounds.centerY + yJitter,
      color,
      count: 24 + i * 12,
      speed: 210 + i * 70,
    });
  }
  if (target === "enemy") {
    state.encounter.resultText = "Defeated Opponent";
    state.encounter.resultTone = "win";
  }

  triggerScreenShakeFn({ state, power: 12, duration: 0.46 });
  triggerFlashFn({ state, color, intensity: 0.14, duration: 0.28 });
  if (typeof playImpactSfxFn === "function") {
    playImpactSfxFn(16, target === "enemy" ? "enemy" : "player");
  }

  const enemyDuration = Math.max(0.001, Number(enemyDefeatTransitionSeconds) || 1.9);
  const playerDuration = Math.max(0.001, Number(playerDefeatTransitionSeconds) || 1.02);
  const transitionDuration = target === "enemy" ? enemyDuration : playerDuration;
  state.pendingTransition = {
    target,
    timer: transitionDuration,
    duration: transitionDuration,
  };
  state.encounter.phase = "done";
  state.encounter.resolveTimer = 0;
  return true;
}

export function queueEnemyDefeatTransition({ state, enemyDefeatTransitionSeconds }) {
  if (!state?.encounter || state.pendingTransition) {
    return false;
  }

  const transitionDuration = Math.max(0.001, Number(enemyDefeatTransitionSeconds) || 1.9);
  state.pendingTransition = {
    target: "enemy",
    timer: 0,
    duration: transitionDuration,
    waiting: true,
  };
  state.encounter.phase = "done";
  state.encounter.resolveTimer = 0;
  state.encounter.resultText = "Defeated Opponent";
  state.encounter.resultTone = "win";
  return true;
}

export function beginQueuedEnemyDefeatTransition({
  state,
  triggerScreenShakeFn = triggerScreenShake,
  triggerFlashFn = triggerFlash,
  playImpactSfxFn,
  enemyDefeatTransitionSeconds,
}) {
  const transition = state?.pendingTransition;
  if (!transition || transition.target !== "enemy" || !transition.waiting) {
    return false;
  }

  transition.waiting = false;
  transition.timer = Math.max(0.001, Number(transition.duration) || Number(enemyDefeatTransitionSeconds) || 1.9);
  triggerScreenShakeFn({ state, power: 12, duration: 0.46 });
  triggerFlashFn({ state, color: "#ffb07a", intensity: 0.14, duration: 0.28 });
  if (typeof playImpactSfxFn === "function") {
    playImpactSfxFn(16, "enemy");
  }
  return true;
}

export function damageFloatAnchor({ state, target, width, height }) {
  const layout = state.combatLayout || null;
  if (target === "enemy" && layout?.enemyPortrait) {
    return {
      x: layout.enemyPortrait.centerX,
      y: layout.enemyPortrait.y - 8,
    };
  }
  if (target === "player" && layout?.playerPortrait) {
    return {
      x: layout.playerPortrait.centerX,
      y: layout.playerPortrait.y - 8,
    };
  }
  return target === "enemy"
    ? { x: width * 0.72, y: 108 }
    : { x: width * 0.26, y: height - 144 };
}

export function currentShakeOffset({ state, random = Math.random }) {
  if (state.screenShakeTime <= 0 || state.screenShakePower <= 0) {
    return { x: 0, y: 0 };
  }
  const duration = Math.max(0.01, state.screenShakeDuration);
  const t = Math.max(0, Math.min(1, state.screenShakeTime / duration));
  const strength = state.screenShakePower * t;
  return {
    x: (random() * 2 - 1) * strength,
    y: (random() * 2 - 1) * strength,
  };
}
