import Phaser from "phaser";
import { getRunApi, isCoarsePointer } from "../runtime-access.js";
import { RUN_DEALER_CARD_ENTRY_MS, RUN_DEALER_CARD_FLIP_MS } from "./run-scene-config.js";

const RUN_SCENE_ACTION_GUARDS = new Set(["hit", "stand", "doubleDown", "split", "deal", "confirmIntro"]);

export function beginRunSceneResolutionAnimation(scene) {
  scene.activeResolutionAnimations = Math.max(0, Math.round(scene.activeResolutionAnimations || 0)) + 1;
}

export function endRunSceneResolutionAnimation(scene) {
  scene.activeResolutionAnimations = Math.max(0, Math.round(scene.activeResolutionAnimations || 0) - 1);
}

export function hasActiveRunSceneResolutionAnimations(scene) {
  return Math.max(0, Math.round(scene.activeResolutionAnimations || 0)) > 0;
}

export function hasActiveRunSceneCardDealAnimations(scene) {
  const now = scene.time.now;
  for (const state of scene.cardAnimStates.values()) {
    if (now < (Number(state?.start) || 0) + RUN_DEALER_CARD_ENTRY_MS) {
      return true;
    }
  }
  for (const state of scene.cardFlipStates.values()) {
    const duration = Math.max(120, Number(state?.duration) || RUN_DEALER_CARD_FLIP_MS);
    if (now < (Number(state?.start) || 0) + duration) {
      return true;
    }
  }
  return false;
}

export function playRunSceneSfx(scene, methodName, ...args) {
  const api = getRunApi(scene);
  const fn = api?.[methodName];
  if (typeof fn === "function") {
    fn(...args);
  }
}

export function triggerRunSceneAvatarShake(scene, side, magnitude = 6.5, duration = 220) {
  const key = side === "enemy" ? "enemy" : "player";
  const shake = scene.avatarShake?.[key];
  if (!shake) {
    return;
  }
  const now = scene.time.now;
  shake.start = now;
  shake.duration = Math.max(80, Math.round(duration || 0));
  shake.until = now + shake.duration;
  shake.magnitude = Math.max(0, Number(magnitude) || 0);
}

export function getRunSceneAvatarShakeOffset(scene, side) {
  const key = side === "enemy" ? "enemy" : "player";
  const shake = scene.avatarShake?.[key];
  if (!shake) {
    return { x: 0, y: 0 };
  }
  const now = scene.time.now;
  if (!Number.isFinite(shake.until) || now >= shake.until || !Number.isFinite(shake.magnitude) || shake.magnitude <= 0) {
    shake.magnitude = 0;
    return { x: 0, y: 0 };
  }
  const elapsed = Math.max(0, now - (Number.isFinite(shake.start) ? shake.start : now));
  const life = Math.max(80, Number(shake.duration) || 180);
  const lifeT = Phaser.Math.Clamp(elapsed / life, 0, 1);
  const damping = 1 - lifeT;
  const mag = shake.magnitude * damping;
  const wiggle = Math.sin(now * 0.11) * 0.7 + Math.sin(now * 0.21) * 0.3;
  return {
    x: (Phaser.Math.Between(-1000, 1000) / 1000) * mag * 0.55 + wiggle * mag * 0.24,
    y: (Phaser.Math.Between(-1000, 1000) / 1000) * mag * 0.28,
  };
}

export function getRunSceneSnapshot(scene) {
  const api = getRunApi(scene);
  if (!api || typeof api.getSnapshot !== "function") {
    return null;
  }
  try {
    return api.getSnapshot();
  } catch {
    return null;
  }
}

export function invokeRunSceneAction(scene, actionName) {
  if (
    RUN_SCENE_ACTION_GUARDS.has(actionName) &&
    (hasActiveRunSceneCardDealAnimations(scene) || hasActiveRunSceneResolutionAnimations(scene))
  ) {
    return;
  }
  const api = getRunApi(scene);
  const action = api ? api[actionName] : null;
  if (typeof action === "function") {
    action();
  }
}

export function isRunSceneCompactLayout(width) {
  return width < 760;
}

export function shouldShowRunSceneKeyboardHints(scene, width) {
  const viewportWidth = Number(width) || 0;
  const coarsePointer = isCoarsePointer(scene);
  return viewportWidth >= 1100 && !coarsePointer;
}
