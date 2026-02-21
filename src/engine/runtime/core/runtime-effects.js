import {
  animatedCardPosition as animatedCardPositionFromModule,
  beginQueuedEnemyDefeatTransition as beginQueuedEnemyDefeatTransitionFromModule,
  currentShakeOffset as currentShakeOffsetFromModule,
  damageFloatAnchor as damageFloatAnchorFromModule,
  lerp as lerpFromModule,
  queueEnemyDefeatTransition as queueEnemyDefeatTransitionFromModule,
  spawnFloatText as spawnFloatTextFromModule,
  spawnSparkBurst as spawnSparkBurstFromModule,
  startDefeatTransition as startDefeatTransitionFromModule,
  triggerFlash as triggerFlashFromModule,
  triggerHandTackle as triggerHandTackleFromModule,
  triggerImpactBurst as triggerImpactBurstFromModule,
  triggerImpactBurstAt as triggerImpactBurstAtFromModule,
  triggerScreenShake as triggerScreenShakeFromModule,
} from "./combat-effects.js";

export function createRuntimeEffects({
  state,
  width,
  height,
  cardW,
  cardH,
  getHandBoundsFn = () => null,
  playImpactSfxFn = () => {},
  enemyDefeatTransitionSeconds,
  playerDefeatTransitionSeconds,
  animatedCardPositionFn = animatedCardPositionFromModule,
  beginQueuedEnemyDefeatTransitionFn = beginQueuedEnemyDefeatTransitionFromModule,
  currentShakeOffsetFn = currentShakeOffsetFromModule,
  damageFloatAnchorFn = damageFloatAnchorFromModule,
  lerpFn = lerpFromModule,
  queueEnemyDefeatTransitionFn = queueEnemyDefeatTransitionFromModule,
  spawnFloatTextFn = spawnFloatTextFromModule,
  spawnSparkBurstFn = spawnSparkBurstFromModule,
  startDefeatTransitionFn = startDefeatTransitionFromModule,
  triggerFlashFn = triggerFlashFromModule,
  triggerHandTackleFn = triggerHandTackleFromModule,
  triggerImpactBurstFn = triggerImpactBurstFromModule,
  triggerImpactBurstAtFn = triggerImpactBurstAtFromModule,
  triggerScreenShakeFn = triggerScreenShakeFromModule,
}) {
  function resolveHandBoundsFn() {
    const handBoundsFn = getHandBoundsFn();
    return typeof handBoundsFn === "function" ? handBoundsFn : () => null;
  }

  function lerp(a, b, t) {
    return lerpFn(a, b, t);
  }

  function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - (1 - clamped) ** 3;
  }

  function spawnFloatText(text, x, y, color, opts = {}) {
    spawnFloatTextFn({
      state,
      text,
      x,
      y,
      color,
      opts,
    });
  }

  function animatedCardPosition(card, targetX, targetY) {
    return animatedCardPositionFn({
      card,
      targetX,
      targetY,
      worldTime: state.worldTime,
    });
  }

  function spawnSparkBurst(x, y, color, count = 12, speed = 160) {
    spawnSparkBurstFn({
      state,
      x,
      y,
      color,
      count,
      speed,
    });
  }

  function triggerScreenShake(power = 6, duration = 0.2) {
    triggerScreenShakeFn({
      state,
      power,
      duration,
    });
  }

  function triggerFlash(color, intensity = 0.08, duration = 0.16) {
    triggerFlashFn({
      state,
      color,
      intensity,
      duration,
    });
  }

  function triggerImpactBurstAt(x, y, amount, color) {
    triggerImpactBurstAtFn({
      state,
      x,
      y,
      amount,
      color,
    });
  }

  function triggerImpactBurst(side, amount, color) {
    triggerImpactBurstFn({
      state,
      side,
      amount,
      color,
      width,
      height,
    });
  }

  function triggerHandTackle(winner, amount, impactPayload = null) {
    return triggerHandTackleFn({
      state,
      winner,
      amount,
      impactPayload,
      cardW,
      cardH,
      width,
      height,
      handBoundsFn: resolveHandBoundsFn(),
    });
  }

  function damageFloatAnchor(target) {
    return damageFloatAnchorFn({
      state,
      target,
      width,
      height,
    });
  }

  function startDefeatTransition(target) {
    return startDefeatTransitionFn({
      state,
      target,
      handBoundsFn: resolveHandBoundsFn(),
      spawnSparkBurstFn,
      triggerScreenShakeFn,
      triggerFlashFn,
      playImpactSfxFn,
      enemyDefeatTransitionSeconds,
      playerDefeatTransitionSeconds,
    });
  }

  function queueEnemyDefeatTransition() {
    return queueEnemyDefeatTransitionFn({
      state,
      enemyDefeatTransitionSeconds,
    });
  }

  function beginQueuedEnemyDefeatTransition() {
    return beginQueuedEnemyDefeatTransitionFn({
      state,
      triggerScreenShakeFn,
      triggerFlashFn,
      playImpactSfxFn,
      enemyDefeatTransitionSeconds,
    });
  }

  function currentShakeOffset() {
    return currentShakeOffsetFn({ state });
  }

  return {
    animatedCardPosition,
    beginQueuedEnemyDefeatTransition,
    currentShakeOffset,
    damageFloatAnchor,
    easeOutCubic,
    lerp,
    queueEnemyDefeatTransition,
    spawnFloatText,
    spawnSparkBurst,
    startDefeatTransition,
    triggerFlash,
    triggerHandTackle,
    triggerImpactBurst,
    triggerImpactBurstAt,
    triggerScreenShake,
  };
}
