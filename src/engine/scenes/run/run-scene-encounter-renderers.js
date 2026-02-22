import Phaser from "phaser";
import {
  ENEMY_AVATAR_KEY_BY_NAME,
  ENEMY_AVATAR_TEXTURE_PREFIX,
  RUN_CARD_HEIGHT_SCALE,
  RUN_MOBILE_HAND_GROUP_SCALE_BOOST,
  RUN_PLAYER_AVATAR_KEY,
  sanitizeEnemyAvatarKey,
} from "./run-scene-config.js";
import { coverSizeForTexture } from "../ui/texture-processing.js";

function enemyAccent(type) {
  if (type === "boss") {
    return 0xffab84;
  }
  if (type === "elite") {
    return 0xffdf9d;
  }
  return 0xaed2f0;
}

export function resolveRunSceneEnemyAvatarTexture(scene, enemy) {
  const explicitKey = typeof enemy?.avatarKey === "string" && enemy.avatarKey.trim().length > 0 ? enemy.avatarKey.trim() : "";
  const mappedKey = ENEMY_AVATAR_KEY_BY_NAME[enemy?.name] || "";
  const safeKey = explicitKey || mappedKey || sanitizeEnemyAvatarKey(enemy?.name);
  if (!safeKey) {
    return "";
  }
  const textureKey = `${ENEMY_AVATAR_TEXTURE_PREFIX}${safeKey}`;
  return scene.textures.exists(textureKey) ? textureKey : "";
}

function drawRunScenePlayerAvatar(scene, x, y, width, height) {
  const shake = scene.getAvatarShakeOffset("player");
  const drawX = x + shake.x;
  const drawY = y + shake.y;
  scene.graphics.fillStyle(0x2a1a0f, 1);
  scene.graphics.fillRoundedRect(drawX, drawY, width, height, 18);
  scene.graphics.lineStyle(1.8, 0x8a6940, 1);
  scene.graphics.strokeRoundedRect(drawX, drawY, width, height, 18);

  const inset = 8;
  const innerX = drawX + inset;
  const innerY = drawY + inset;
  const innerW = width - inset * 2;
  const innerH = height - inset * 2;
  scene.graphics.fillStyle(0x3b2718, 1);
  scene.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
  const playerTextureKey = scene.textures.exists(RUN_PLAYER_AVATAR_KEY) ? RUN_PLAYER_AVATAR_KEY : "";
  if (playerTextureKey && scene.playerPortrait) {
    if (scene.playerPortraitMaskShape) {
      scene.playerPortraitMaskShape.clear();
      scene.playerPortraitMaskShape.fillStyle(0xffffff, 1);
      scene.playerPortraitMaskShape.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
    }
    const cover = coverSizeForTexture(scene, playerTextureKey, innerW, innerH);
    scene.playerPortrait
      .setTexture(playerTextureKey)
      .setAlpha(0.75)
      .setDisplaySize(cover.width, cover.height)
      .setPosition(drawX + width * 0.5, drawY + height * 0.5)
      .setVisible(true);
    return;
  }
  if (scene.playerPortrait) {
    scene.playerPortrait.setVisible(false);
  }
  scene.graphics.fillStyle(0xcfc0a7, 1);
  scene.graphics.fillCircle(innerX + innerW * 0.5, innerY + innerH * 0.3, innerW * 0.2);
  scene.graphics.fillRoundedRect(innerX + innerW * 0.17, innerY + innerH * 0.48, innerW * 0.66, innerH * 0.44, 10);
}

function drawRunSceneEnemyAvatar(scene, enemy, x, y, width, height, options = {}) {
  const disableVisualFx = Boolean(scene.disableVisualFx);
  const defeatProgress = Phaser.Math.Clamp(Number(options?.defeatProgress) || 0, 0, 1);
  const fadeProgress = Phaser.Math.Clamp(Number(options?.fadeProgress) || 0, 0, 1);
  const avatarAlpha = Phaser.Math.Clamp(1 - fadeProgress, 0, 1);
  const shake = scene.getAvatarShakeOffset("enemy");
  const dissolveJitterX = disableVisualFx || defeatProgress <= 0
    ? 0
    : Math.sin(scene.time.now * 0.046) * (1.4 + defeatProgress * 3);
  const dissolveJitterY = disableVisualFx || defeatProgress <= 0
    ? 0
    : Math.cos(scene.time.now * 0.041) * (0.9 + defeatProgress * 2.2);
  const drawX = x + shake.x + dissolveJitterX;
  const drawY = y + shake.y + dissolveJitterY;
  if (avatarAlpha <= 0.01) {
    if (scene.enemyPortrait) {
      scene.enemyPortrait.setVisible(false);
    }
    const fallback = scene.textNodes.get("enemy-avatar-fallback");
    if (fallback) {
      fallback.setVisible(false);
    }
    return;
  }
  scene.graphics.fillStyle(0x1c2f43, 0.95 * avatarAlpha);
  scene.graphics.fillRoundedRect(drawX, drawY, width, height, 14);
  scene.graphics.lineStyle(1.8, 0x516f8f, 0.5 * avatarAlpha);
  scene.graphics.strokeRoundedRect(drawX, drawY, width, height, 14);

  const pulse = disableVisualFx ? 0.5 : Math.sin(scene.time.now * 0.004) * 0.5 + 0.5;
  scene.graphics.lineStyle(2.1, enemyAccent(enemy?.type), (0.26 + pulse * 0.22) * avatarAlpha);
  scene.graphics.strokeRoundedRect(drawX - 1, drawY - 1, width + 2, height + 2, 15);

  const innerPad = 6;
  const innerX = drawX + innerPad;
  const innerY = drawY + innerPad;
  const innerW = Math.max(12, width - innerPad * 2);
  const innerH = Math.max(12, height - innerPad * 2);

  if (scene.enemyPortraitMaskShape) {
    scene.enemyPortraitMaskShape.clear();
    scene.enemyPortraitMaskShape.fillStyle(0xffffff, 1);
    scene.enemyPortraitMaskShape.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
  }

  const fallback = scene.textNodes.get("enemy-avatar-fallback");
  if (fallback) {
    fallback.setVisible(false);
  }

  const textureKey = resolveRunSceneEnemyAvatarTexture(scene, enemy);
  if (!textureKey || !scene.enemyPortrait) {
    if (scene.enemyPortrait) {
      scene.enemyPortrait.setVisible(false);
    }
    scene.graphics.fillStyle(0x1a3146, 0.92 * avatarAlpha);
    scene.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
    const fallbackNode = scene.drawText("enemy-avatar-fallback", "?", drawX + width * 0.5, drawY + height * 0.56, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "52px",
      color: "#bed6eb",
    });
    fallbackNode.setAlpha(avatarAlpha);
    return;
  }

  const bob = disableVisualFx ? 0 : Math.sin(scene.time.now * 0.0022) * 2.2;
  scene.enemyPortrait.setTexture(textureKey);
  const cover = coverSizeForTexture(scene, textureKey, innerW, innerH);
  scene.enemyPortrait.setDisplaySize(cover.width, cover.height);
  scene.enemyPortrait.setPosition(drawX + width * 0.5, drawY + height * 0.5 + bob);
  scene.enemyPortrait.setAlpha(avatarAlpha);
  scene.enemyPortrait.setVisible(true);

  scene.graphics.fillGradientStyle(
    0xffffff,
    0xffffff,
    0xffffff,
    0xffffff,
    0.1 * avatarAlpha,
    0.1 * avatarAlpha,
    0.02 * avatarAlpha,
    0.13 * avatarAlpha
  );
  scene.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
}

function drawRunSceneHpBar(scene, keyPrefix, x, y, width, height, value, maxValue, colorHex, options = {}) {
  const compact = scene.isCompactLayout(scene.scale.gameSize.width);
  const labelWeight = compact ? "800" : "700";
  const safeMax = Math.max(1, Number(maxValue) || 1);
  const safeValue = Math.max(0, Math.min(safeMax, Number(value) || 0));
  const ratio = safeValue / safeMax;
  const trackColor = Number.isFinite(options.trackColor) ? options.trackColor : 0x11151b;
  const borderColor = Number.isFinite(options.borderColor) ? options.borderColor : 0x5f7691;
  const darkTextColor = options.darkTextColor || "#10161d";
  const lightTextColor = options.lightTextColor || "#eef5ff";
  const barRadius = Math.max(6, Math.round(height * 0.5));
  const fillColor = Phaser.Display.Color.HexStringToColor(colorHex).color;

  scene.graphics.fillStyle(trackColor, 0.94);
  scene.graphics.fillRoundedRect(x, y, width, height, barRadius);
  const fill = Math.max(0, Math.round((width - 4) * ratio));
  if (fill > 0) {
    scene.graphics.fillStyle(fillColor, 1);
    scene.graphics.fillRoundedRect(x + 2, y + 2, fill, Math.max(1, height - 4), Math.max(4, barRadius - 2));
    const glowLayers = 5;
    for (let i = glowLayers; i >= 1; i -= 1) {
      const t = i / glowLayers;
      const glowAlpha = 0.13 * Math.pow(t, 1.35);
      const expand = Math.round(t * Math.max(2, height * 0.22));
      scene.graphics.fillStyle(fillColor, glowAlpha);
      scene.graphics.fillRoundedRect(
        x + 2 - expand,
        y + 2 - expand,
        fill + expand * 2,
        Math.max(1, height - 4 + expand * 2),
        Math.max(4, barRadius - 2 + expand)
      );
    }
    scene.graphics.fillStyle(0xffffff, 0.18);
    scene.graphics.fillRoundedRect(
      x + 4,
      y + 3,
      Math.max(1, fill - 4),
      Math.max(1, Math.round((height - 4) * 0.42)),
      Math.max(3, barRadius - 4)
    );
  }
  scene.graphics.lineStyle(1.4, borderColor, 0.56);
  scene.graphics.strokeRoundedRect(x, y, width, height, barRadius);

  const labelValue = `HP ${safeValue} / ${safeMax}`;
  const textY = y + height * 0.5;
  const fontSize = `${Math.max(14, Math.round(height * 0.58))}px`;
  scene.drawText(
    `${keyPrefix}-label-dark`,
    labelValue,
    x + 10,
    textY,
    {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize,
      color: darkTextColor,
      fontStyle: labelWeight,
    },
    { x: 0, y: 0.5 }
  );
  const lightNode = scene.drawText(
    `${keyPrefix}-label-light`,
    labelValue,
    x + 10,
    textY,
    {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize,
      color: lightTextColor,
      fontStyle: labelWeight,
    },
    { x: 0, y: 0.5 }
  );

  const darkStartX = x + 2 + fill;
  const cropStart = Math.max(0, darkStartX - (x + 10));
  const cropWidth = Math.max(0, lightNode.width - cropStart);
  if (cropWidth > 0) {
    lightNode.setCrop(cropStart, 0, cropWidth, lightNode.height);
    lightNode.setVisible(true);
  } else {
    lightNode.setCrop();
    lightNode.setVisible(false);
  }
}

export function drawRunSceneEncounterPanels(
  scene,
  {
    snapshot,
    width,
    height,
    runLayout,
    transitionState = null,
  }
) {
  const enemy = snapshot?.enemy || {};
  const player = snapshot?.player || {};
  const compact = Boolean(runLayout?.compact);
  const enemyDefeatTransition = transitionState?.target === "enemy" && !transitionState?.waiting ? transitionState : null;
  const enemyFadeProgress = enemyDefeatTransition
    ? Phaser.Math.Easing.Cubic.In(Phaser.Math.Clamp((enemyDefeatTransition.progress - 0.16) / 0.84, 0, 1))
    : 0;
  const playerAvatarW = compact ? 84 : 110;
  const playerButtonH = compact ? 40 : 50;
  const playerAvatarH = Math.max(
    playerAvatarW,
    (compact ? 22 : 34) + (compact ? 24 : 28) + (compact ? 30 : 36) + Math.round(playerButtonH * 0.5)
  );
  const enemyAvatarW = compact ? playerAvatarW : 146;
  const enemyAvatarH = compact ? playerAvatarH : 176;
  const enemyAvatarX = width - runLayout.sidePad - enemyAvatarW;
  const enemyAvatarY = runLayout.arenaY + (compact ? 8 : 12);
  const enemyInfoRight = enemyAvatarX - (compact ? 10 : 14);
  const enemyInfoLeft = compact
    ? runLayout.sidePad + 2
    : enemyInfoRight - Math.max(220, Math.min(288, Math.round(width * 0.21)));
  const enemyInfoWidth = Math.max(120, enemyInfoRight - enemyInfoLeft);
  const enemyNameY = enemyAvatarY + (compact ? 12 : 14);
  const nameToHpGap = Math.round((compact ? 26 : 34) * 0.9);
  const enemyHpY = enemyNameY + nameToHpGap;
  const enemyNameSize = `${Math.round((compact ? 12 : 17) * 1.15)}px`;

  scene.drawText("enemy-name", (enemy.name || "Enemy").toUpperCase(), enemyInfoRight, enemyNameY, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: enemyNameSize,
    color: "#d8c3a0",
    fontStyle: compact ? "800" : "700",
  }, { x: 1, y: 0.5 });

  drawRunSceneHpBar(
    scene,
    "enemy-hp",
    enemyInfoLeft,
    enemyHpY,
    enemyInfoWidth,
    compact ? 24 : 28,
    enemy.hp || 0,
    enemy.maxHp || 1,
    "#e96d73",
    {
      trackColor: 0x0b1a2a,
      borderColor: 0x36516b,
      darkTextColor: "#0d141b",
      lightTextColor: "#eef6ff",
    }
  );
  drawRunSceneEnemyAvatar(scene, enemy, enemyAvatarX, enemyAvatarY, enemyAvatarW, enemyAvatarH, {
    defeatProgress: enemyDefeatTransition?.progress || 0,
    fadeProgress: enemyFadeProgress,
  });

  const playerAvatarX = runLayout.sidePad;
  const playerAvatarY = runLayout.arenaBottom - playerAvatarH - (compact ? 12 : 14);
  drawRunScenePlayerAvatar(scene, playerAvatarX, playerAvatarY, playerAvatarW, playerAvatarH);

  const playerInfoLeft = playerAvatarX + playerAvatarW + (compact ? 10 : 16);
  const playerInfoWidth = compact
    ? Math.max(130, width - playerInfoLeft - runLayout.sidePad - 4)
    : Math.max(220, Math.min(320, Math.round(width * 0.25)));
  scene.drawText(
    "player-name",
    "PLAYER",
    playerInfoLeft,
    playerAvatarY + (compact ? 10 : 16),
    {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: enemyNameSize,
      color: "#e1ccb0",
      fontStyle: compact ? "800" : "700",
    },
    { x: 0, y: 0.5 }
  );

  const playerHpY = playerAvatarY + (compact ? 22 : 34);
  const playerHpH = compact ? 24 : 28;
  drawRunSceneHpBar(scene, "player-hp", playerInfoLeft, playerHpY, playerInfoWidth, playerHpH, player.hp || 0, player.maxHp || 1, "#3ecf6c", {
    trackColor: 0x0a1f1a,
    borderColor: 0x2e5d53,
    darkTextColor: "#09140f",
    lightTextColor: "#f2f8ff",
  });

  const cardAspect = 1.42;
  const baseCardWidth = compact ? Math.round(64 * 0.85) : 88;
  const baseMessageMargin = compact ? Math.round(18 * 0.9) : 24;
  const baseMessagePanelH = compact ? Math.round(48 * 0.9) : 60;
  const baseMessagePanelW = compact
    ? Math.round(Phaser.Math.Clamp(width - runLayout.sidePad * 2 - 24, 280, 360) * 0.9)
    : Phaser.Math.Clamp(Math.round(width * 0.44), 500, 640);
  const desiredCenterY = Math.round(runLayout.arenaY + runLayout.arenaH * 0.5);
  const enemyDetailBottom = Math.max(
    enemyAvatarY + enemyAvatarH,
    enemyHpY + (compact ? 24 : 28),
    enemyNameY + Math.round((compact ? 14 : 18))
  );
  const playerDetailTop = Math.min(playerAvatarY, playerHpY);
  const topHandBound = Math.max(runLayout.arenaY + (compact ? 90 : 110), enemyDetailBottom + (compact ? 12 : 16));
  const bottomHandBound = Math.min(runLayout.arenaBottom - (compact ? 10 : 16), playerDetailTop - (compact ? 12 : 16));
  const availableSpan = Math.max(1, bottomHandBound - topHandBound);
  const handLabelScale = compact ? Phaser.Math.Clamp(width / 430, 0.68, 0.9) : 1;
  const handLabelGapEstimate = Math.max(10, Math.round((compact ? 20 : 24) * handLabelScale));
  const handLabelFontEstimate = Math.max(12, Math.round((compact ? 14 : 17) * handLabelScale));
  const handLabelReserve = handLabelGapEstimate + Math.round(handLabelFontEstimate * 0.62) + (compact ? 2 : 4);
  const baseCardHeight = Math.round(baseCardWidth * cardAspect * RUN_CARD_HEIGHT_SCALE);
  const baseTotalSpan = baseCardHeight * 2 + baseMessagePanelH + baseMessageMargin * 2 + handLabelReserve * 2;
  const mobileGroupScaleBoost = compact ? RUN_MOBILE_HAND_GROUP_SCALE_BOOST : 1;
  let stackScale = compact
    ? Phaser.Math.Clamp(
      (availableSpan / Math.max(1, baseTotalSpan)) * mobileGroupScaleBoost,
      0.56,
      mobileGroupScaleBoost
    )
    : 1;
  let cardWidth = Math.max(compact ? 38 : 72, Math.round(baseCardWidth * stackScale));
  let cardHeight = Math.round(cardWidth * cardAspect * RUN_CARD_HEIGHT_SCALE);
  let messagePanelH = Math.max(compact ? 30 : 54, Math.round(baseMessagePanelH * (compact ? stackScale : 1)));
  let messageMargin = Math.max(compact ? 8 : 18, Math.round(baseMessageMargin * (compact ? stackScale : 1)));
  let messagePanelW = compact
    ? Math.max(220, Math.round(baseMessagePanelW * Math.max(0.84, stackScale)))
    : baseMessagePanelW;
  let messageHalf = Math.round(messagePanelH * 0.5);
  let halfSpan = cardHeight + messageMargin + messageHalf + handLabelReserve;
  let minCenterY = topHandBound + halfSpan;
  let maxCenterY = bottomHandBound - halfSpan;
  if (compact && minCenterY > maxCenterY) {
    const emergencyScale = Phaser.Math.Clamp(availableSpan / Math.max(1, halfSpan * 2), 0.5, 1);
    stackScale *= emergencyScale;
    cardWidth = Math.max(34, Math.round(cardWidth * emergencyScale));
    cardHeight = Math.round(cardWidth * cardAspect * RUN_CARD_HEIGHT_SCALE);
    messagePanelH = Math.max(26, Math.round(messagePanelH * emergencyScale));
    messageMargin = Math.max(6, Math.round(messageMargin * emergencyScale));
    messagePanelW = Math.max(200, Math.round(messagePanelW * emergencyScale));
    messageHalf = Math.round(messagePanelH * 0.5);
    halfSpan = cardHeight + messageMargin + messageHalf + handLabelReserve;
    minCenterY = topHandBound + halfSpan;
    maxCenterY = bottomHandBound - halfSpan;
  }
  const groupCenterY = minCenterY <= maxCenterY
    ? Phaser.Math.Clamp(desiredCenterY, minCenterY, maxCenterY)
    : Math.round((topHandBound + bottomHandBound) * 0.5);
  const messageGap = messageMargin + messageHalf;
  const enemyRowY = Math.round(groupCenterY - messageGap - cardHeight);
  const playerRowY = Math.round(groupCenterY + messageGap);

  return {
    enemyY: enemyRowY,
    playerY: playerRowY,
    cardWidth,
    cardHeight,
    groupScale: stackScale,
    messageGap,
    enemyInfoLeft,
    enemyInfoRight,
    enemyInfoWidth,
    playerInfoLeft,
    playerInfoWidth,
    playerHpY,
    playerHpH,
    enemyHpX: enemyInfoLeft,
    enemyHpY,
    enemyHpW: enemyInfoWidth,
    enemyHpH: compact ? 24 : 28,
    enemyAvatarX,
    enemyAvatarY,
    enemyAvatarW,
    enemyAvatarH,
    enemyAvatarRect: {
      x: enemyAvatarX,
      y: enemyAvatarY,
      width: enemyAvatarW,
      height: enemyAvatarH,
    },
    playerAvatarX,
    playerAvatarY,
    playerAvatarW,
    playerAvatarH,
    messageY: groupCenterY,
    messagePanelW,
    messagePanelH,
    messageMargin,
    cardsTopBound: topHandBound,
    cardsBottomBound: bottomHandBound,
    handLabelReserve,
  };
}
