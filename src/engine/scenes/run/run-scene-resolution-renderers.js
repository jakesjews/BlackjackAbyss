import Phaser from "phaser";
import {
  RUN_ENEMY_DEFEAT_PULSE_INTERVAL_MS,
  RUN_ENEMY_DEFEAT_PULSE_STEPS,
  RUN_FIRE_CORE_PARTICLE_KEY,
  RUN_FIRE_GLOW_PARTICLE_KEY,
} from "./run-scene-config.js";

export function getRunSceneEncounterTypeLabel(type) {
  if (type === "elite") {
    return "Elite Encounter";
  }
  if (type === "boss") {
    return "Boss Encounter";
  }
  return "Normal Encounter";
}

export function getRunSceneTransitionState(snapshot) {
  const transition = snapshot?.transition;
  if (!transition || typeof transition !== "object") {
    return null;
  }
  const target = transition.target === "player" ? "player" : transition.target === "enemy" ? "enemy" : "";
  if (!target) {
    return null;
  }
  const duration = Math.max(0.001, Number(transition.duration) || Number(transition.remaining) || 0.001);
  const remaining = Phaser.Math.Clamp(Number(transition.remaining) || 0, 0, duration);
  const rawProgress = Number(transition.progress);
  const progress = Number.isFinite(rawProgress)
    ? Phaser.Math.Clamp(rawProgress, 0, 1)
    : Phaser.Math.Clamp(1 - remaining / duration, 0, 1);
  const waiting = Boolean(transition.waiting);
  return {
    target,
    duration,
    remaining,
    progress,
    waiting,
  };
}

export function tryStartRunSceneQueuedEnemyDefeatTransition(scene, snapshot, { deferResolutionUi = false } = {}) {
  const transitionState = getRunSceneTransitionState(snapshot);
  if (!transitionState || transitionState.target !== "enemy" || !transitionState.waiting) {
    return;
  }
  if (snapshot?.intro?.active) {
    return;
  }
  if (deferResolutionUi) {
    return;
  }
  if (scene.hasActiveResolutionAnimations()) {
    return;
  }
  scene.playRunSfx("startEnemyDefeatTransition");
}

export function renderRunSceneEnemyDefeatEffect(scene, transitionState, layout) {
  const enemyAvatarRect = layout?.enemyAvatarRect || null;
  if (!transitionState || transitionState.target !== "enemy" || transitionState.waiting || !enemyAvatarRect) {
    scene.enemyDefeatSignature = "";
    scene.enemyDefeatBurstStep = -1;
    scene.enemyDefeatLastPulseAt = 0;
    return;
  }
  const room = Number(scene.lastSnapshot?.run?.room) || 0;
  const floor = Number(scene.lastSnapshot?.run?.floor) || 0;
  const enemyName = String(scene.lastSnapshot?.enemy?.name || "");
  const signature = `${floor}:${room}:${enemyName}`;
  if (signature !== scene.enemyDefeatSignature) {
    scene.enemyDefeatSignature = signature;
    scene.enemyDefeatBurstStep = -1;
    scene.enemyDefeatLastPulseAt = 0;
  }
  const progress = Phaser.Math.Clamp(Number(transitionState.progress) || 0, 0, 1);
  const centerX = enemyAvatarRect.x + enemyAvatarRect.width * 0.5;
  const centerY = enemyAvatarRect.y + enemyAvatarRect.height * 0.5;
  const glowScale = 1 + progress * 0.54;
  const glowAlpha = 0.22 * (1 - progress * 0.35);
  scene.graphics.fillStyle(0xff9a54, glowAlpha);
  scene.graphics.fillEllipse(centerX, centerY, enemyAvatarRect.width * glowScale, enemyAvatarRect.height * (0.92 + progress * 0.48));

  const burstStep = Math.floor(progress * RUN_ENEMY_DEFEAT_PULSE_STEPS);
  if (scene.enemyDefeatEmitter && burstStep > scene.enemyDefeatBurstStep) {
    for (let step = scene.enemyDefeatBurstStep + 1; step <= burstStep; step += 1) {
      const burstCount = 12 + step * 4;
      const burstX = centerX + (Math.random() * 2 - 1) * enemyAvatarRect.width * 0.2;
      const burstY = centerY + (Math.random() * 2 - 1) * enemyAvatarRect.height * 0.22;
      scene.enemyDefeatEmitter.explode(burstCount, burstX, burstY);
    }
    scene.enemyDefeatBurstStep = burstStep;
  }
  const now = scene.time.now;
  if (scene.enemyDefeatEmitter && now - scene.enemyDefeatLastPulseAt >= RUN_ENEMY_DEFEAT_PULSE_INTERVAL_MS) {
    scene.enemyDefeatLastPulseAt = now;
    const trailX = centerX + (Math.random() * 2 - 1) * enemyAvatarRect.width * 0.4;
    const trailY = centerY + (Math.random() * 2 - 1) * enemyAvatarRect.height * 0.48;
    scene.enemyDefeatEmitter.explode(6, trailX, trailY);
  }
}

export function processRunSceneHpImpacts(
  scene,
  {
    snapshot = null,
    layout = null,
    width = 0,
    height = 0,
    deferResolutionUi = false,
  } = {}
) {
  if (!snapshot || !layout) {
    scene.lastHpState = null;
    return;
  }
  const currentState = {
    enemyName: String(snapshot.enemy?.name || ""),
    enemyHp: Math.max(0, Number(snapshot.enemy?.hp) || 0),
    playerHp: Math.max(0, Number(snapshot.player?.hp) || 0),
  };
  if (snapshot?.intro?.active) {
    scene.lastHpState = currentState;
    return;
  }
  if (deferResolutionUi) {
    if (!scene.lastHpState || scene.lastHpState.enemyName !== currentState.enemyName) {
      scene.lastHpState = currentState;
    }
    return;
  }
  if (!scene.lastHpState || scene.lastHpState.enemyName !== currentState.enemyName) {
    scene.lastHpState = currentState;
    return;
  }

  const enemyDamage = Math.max(0, scene.lastHpState.enemyHp - currentState.enemyHp);
  const playerDamage = Math.max(0, scene.lastHpState.playerHp - currentState.playerHp);
  if (enemyDamage > 0) {
    launchRunSceneDamageFireball(scene, "player", "enemy", enemyDamage, layout, width, height);
  }
  if (playerDamage > 0) {
    launchRunSceneDamageFireball(scene, "enemy", "player", playerDamage, layout, width, height);
  }
  scene.lastHpState = currentState;
}

function launchRunSceneDamageFireball(scene, attackerSide, targetSide, amount, layout, width, height) {
  const safeAmount = Math.max(1, Math.round(Number(amount) || 0));
  if (!safeAmount || !layout) {
    return;
  }
  const isPlayerAttacker = attackerSide === "player";
  const fromY = (isPlayerAttacker ? layout.playerY : layout.enemyY) + layout.cardHeight * 0.5;
  const fromX = width * 0.5;
  const toX = targetSide === "enemy"
    ? layout.enemyAvatarX + layout.enemyAvatarW * 0.5
    : layout.playerAvatarX + layout.playerAvatarW * 0.5;
  const toY = targetSide === "enemy"
    ? layout.enemyAvatarY + layout.enemyAvatarH * 0.5
    : layout.playerAvatarY + layout.playerAvatarH * 0.5;
  const controlX = Phaser.Math.Linear(fromX, toX, 0.5) + Phaser.Math.Between(-88, 88);
  const controlY = Math.min(fromY, toY) - Phaser.Math.Between(84, 176);
  const compact = scene.isCompactLayout(width);
  const travelDuration = compact ? 430 : 540;
  scene.playRunSfx("fireballLaunch", attackerSide, targetSide, safeAmount);

  const glow = scene.add
    .image(0, 0, RUN_FIRE_GLOW_PARTICLE_KEY)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xff9d34)
    .setAlpha(0.92)
    .setScale(compact ? 1.06 : 1.32);
  const flame = scene.add
    .image(0, 0, RUN_FIRE_CORE_PARTICLE_KEY)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xff6a22)
    .setAlpha(0.98)
    .setScale(compact ? 1.24 : 1.56);
  const hotCore = scene.add
    .image(0, 0, RUN_FIRE_CORE_PARTICLE_KEY)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xffd65a)
    .setAlpha(0.96)
    .setScale(compact ? 0.72 : 0.9);
  const ember = scene.add
    .image(-(compact ? 14 : 18), compact ? 0 : 1, RUN_FIRE_CORE_PARTICLE_KEY)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xff3d12)
    .setAlpha(0.7)
    .setScale(compact ? 1 : 1.22);
  const streak = scene.add
    .image(-(compact ? 26 : 34), 0, RUN_FIRE_GLOW_PARTICLE_KEY)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(0xff6a1f)
    .setAlpha(0.62)
    .setScale(compact ? 0.95 : 1.18);
  const fireball = scene.add.container(fromX, fromY, [streak, glow, flame, hotCore, ember]).setDepth(122);
  scene.beginResolutionAnimation();
  scene.tweens.add({
    targets: [glow, flame, hotCore],
    scaleX: compact ? 1.22 : 1.34,
    scaleY: compact ? 1.22 : 1.34,
    duration: 96,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: travelDuration,
    ease: "Cubic.easeIn",
    onUpdate: (tween) => {
      const t = tween.getValue();
      const inv = 1 - t;
      const x = inv * inv * fromX + 2 * inv * t * controlX + t * t * toX;
      const y = inv * inv * fromY + 2 * inv * t * controlY + t * t * toY;
      fireball.setPosition(x, y);
      const pulse = 1 + Math.sin(t * Math.PI * 18) * 0.1;
      fireball.setScale((compact ? 1.88 : 2.28) * (1 - t * 0.2) * pulse);
      fireball.setRotation(Phaser.Math.Angle.Between(fromX, fromY, x, y) + Math.sin(t * Math.PI * 9) * 0.14);
      if (scene.fireTrailEmitter) {
        scene.fireTrailEmitter.explode(compact ? 8 : 14, x, y);
      }
    },
    onComplete: () => {
      if (scene.fireTrailEmitter) {
        scene.fireTrailEmitter.explode(compact ? 52 : 88, toX, toY);
      }
      if (scene.fireImpactEmitter) {
        scene.fireImpactEmitter.explode(compact ? 120 : 186, toX, toY);
      }
      if (scene.resultEmitter) {
        scene.resultEmitter.explode(compact ? 52 : 76, toX, toY);
      }
      scene.playRunSfx("fireballImpact", safeAmount, targetSide);
      scene.triggerAvatarShake(targetSide, compact ? 7.5 : 10, compact ? 220 : 280);
      const blast = scene.add
        .image(toX, toY, RUN_FIRE_GLOW_PARTICLE_KEY)
        .setDepth(130)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xff9f2f)
        .setAlpha(0.94)
        .setScale(compact ? 0.72 : 0.94);
      const coreBlast = scene.add
        .image(toX, toY, RUN_FIRE_CORE_PARTICLE_KEY)
        .setDepth(131)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xffe16e)
        .setAlpha(0.88)
        .setScale(compact ? 0.58 : 0.74);
      const ring = scene.add.circle(toX, toY, compact ? 22 : 30, 0xffad46, 0.24).setDepth(129).setBlendMode(Phaser.BlendModes.ADD);
      ring.setStrokeStyle(compact ? 3.2 : 4.2, 0xffca74, 0.8);
      const ringInner = scene.add.circle(toX, toY, compact ? 10 : 14, 0xffdd9b, 0.34).setDepth(130).setBlendMode(Phaser.BlendModes.ADD);
      ringInner.setStrokeStyle(compact ? 2 : 2.8, 0xfff0ca, 0.74);
      scene.beginResolutionAnimation();
      scene.tweens.add({
        targets: blast,
        scaleX: compact ? 3.7 : 4.8,
        scaleY: compact ? 3.7 : 4.8,
        alpha: 0,
        duration: compact ? 260 : 340,
        ease: "Cubic.easeOut",
        onComplete: () => {
          blast.destroy();
          scene.endResolutionAnimation();
        },
      });
      scene.beginResolutionAnimation();
      scene.tweens.add({
        targets: coreBlast,
        scaleX: compact ? 2.6 : 3.4,
        scaleY: compact ? 2.6 : 3.4,
        alpha: 0,
        duration: compact ? 220 : 280,
        ease: "Cubic.easeOut",
        onComplete: () => {
          coreBlast.destroy();
          scene.endResolutionAnimation();
        },
      });
      scene.beginResolutionAnimation();
      scene.tweens.add({
        targets: ring,
        scaleX: compact ? 3.8 : 4.8,
        scaleY: compact ? 3.8 : 4.8,
        alpha: 0,
        duration: compact ? 240 : 300,
        ease: "Cubic.easeOut",
        onComplete: () => {
          ring.destroy();
          scene.endResolutionAnimation();
        },
      });
      scene.beginResolutionAnimation();
      scene.tweens.add({
        targets: ringInner,
        scaleX: compact ? 3 : 3.9,
        scaleY: compact ? 3 : 3.9,
        alpha: 0,
        duration: compact ? 220 : 280,
        ease: "Cubic.easeOut",
        onComplete: () => {
          ringInner.destroy();
          scene.endResolutionAnimation();
        },
      });
      scene.cameras.main.shake(compact ? 180 : 240, compact ? 0.0033 : 0.0043, true);
      scene.cameras.main.flash(compact ? 140 : 180, 255, 140, 42, false);
      fireball.destroy();

      const damageXRaw = targetSide === "enemy"
        ? layout.enemyHpX + layout.enemyHpW * 0.5
        : layout.playerHpX + layout.playerHpW * 0.5;
      const damageYRaw = targetSide === "enemy"
        ? layout.enemyHpY - (compact ? 12 : 16)
        : layout.playerHpY - (compact ? 12 : 16);
      const damageX = Phaser.Math.Clamp(Math.round(damageXRaw), 44, width - 44);
      const damageY = Phaser.Math.Clamp(Math.round(damageYRaw), 24, height - 24);
      spawnRunSceneDamageNumber(scene, targetSide, safeAmount, damageX, damageY);
      scene.endResolutionAnimation();
    },
  });
}

function spawnRunSceneDamageNumber(scene, targetSide, amount, x, y) {
  const compact = scene.isCompactLayout(scene.scale.gameSize.width);
  const tone = targetSide === "enemy" ? "#ffd4c6" : "#ffc3c8";
  const node = scene.add.text(x, y, `-${Math.max(1, Math.round(amount || 0))}`, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: `${compact ? 34 : 46}px`,
    color: tone,
    fontStyle: "700",
  });
  node.setOrigin(0.5, 0.5);
  node.setDepth(132);
  node.setStroke("#1d0a0d", compact ? 4 : 6);
  node.setShadow(0, 0, "#000000", compact ? 6 : 9, true, true);
  node.setScale(0.72);
  scene.beginResolutionAnimation();
  scene.tweens.add({
    targets: node,
    scaleX: 1.08,
    scaleY: 1.08,
    duration: 150,
    ease: "Back.easeOut",
  });
  scene.tweens.add({
    targets: node,
    y: y - (compact ? 24 : 32),
    alpha: 0,
    duration: 620,
    ease: "Cubic.easeOut",
    onComplete: () => {
      node.destroy();
      scene.endResolutionAnimation();
    },
  });
}

function tonePalette(tone) {
  if (tone === "good") {
    return [0xd9ffd5, 0x9be68f, 0x66c66b, 0x9be68f];
  }
  if (tone === "bad") {
    return [0xffe2d8, 0xffb088, 0xff8156, 0xffb088];
  }
  return [0xf6e3ac, 0xffcb7f, 0xff8f59, 0xffcb7f];
}

export function animateRunSceneResultMessage(scene, node, tone) {
  if (!node) {
    return;
  }
  const compact = scene.isCompactLayout(scene.scale.gameSize.width);
  const palette = tonePalette(tone);
  if (scene.resultEmitter) {
    if (typeof scene.resultEmitter.setParticleTint === "function") {
      scene.resultEmitter.setParticleTint(palette[1]);
    }
    scene.resultEmitter.explode(compact ? 22 : 34, node.x, node.y + 12);
  }

  const burstCircle = scene.add
    .circle(node.x, node.y + 4, compact ? 28 : 36, palette[2], 0.26)
    .setDepth(132)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.beginResolutionAnimation();
  scene.tweens.add({
    targets: burstCircle,
    scaleX: compact ? 2.1 : 2.8,
    scaleY: compact ? 2.1 : 2.8,
    alpha: 0,
    duration: compact ? 250 : 320,
    ease: "Cubic.easeOut",
    onComplete: () => {
      burstCircle.destroy();
      scene.endResolutionAnimation();
    },
  });

  node.setScale(compact ? 0.64 : 0.56);
  node.setRotation(-0.04);
  node.setAlpha(0);
  scene.beginResolutionAnimation();
  scene.tweens.add({
    targets: node,
    scaleX: 1.14,
    scaleY: 1.14,
    alpha: 1,
    rotation: 0.01,
    duration: compact ? 170 : 200,
    ease: "Back.easeOut",
    onComplete: () => {
      scene.tweens.add({
        targets: node,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: compact ? 100 : 130,
        ease: "Sine.easeOut",
        onComplete: () => {
          scene.endResolutionAnimation();
        },
      });
    },
  });

  scene.cameras.main.shake(compact ? 110 : 150, compact ? 0.0015 : 0.0019, true);
}
