import { RUN_BOTTOM_BAR_HEIGHT, RUN_MOBILE_BUTTON_SCALE, RUN_TOP_BAR_HEIGHT } from "./run-scene-config.js";
import { coverSizeForTexture } from "../ui/texture-processing.js";

export function getRunSceneLayout(scene, width, height) {
  const compact = typeof scene?.isCompactLayout === "function"
    ? scene.isCompactLayout(width)
    : width < 760;
  const topBarH = compact ? 76 : RUN_TOP_BAR_HEIGHT;
  const compactButtonH = Math.max(36, Math.round(50 * RUN_MOBILE_BUTTON_SCALE));
  const compactRowGap = Math.max(8, Math.round(10 * RUN_MOBILE_BUTTON_SCALE));
  const bottomBarH = compact ? compactButtonH * 2 + compactRowGap : RUN_BOTTOM_BAR_HEIGHT;
  const sidePad = Math.max(compact ? 16 : 22, Math.round(width * (compact ? 0.016 : 0.02)));
  const arenaTop = topBarH;
  const arenaBottom = Math.max(arenaTop + 180, height - bottomBarH);
  const arenaH = Math.max(160, arenaBottom - arenaTop);
  return {
    compact,
    topBarH,
    bottomBarH,
    sidePad,
    arenaX: 0,
    arenaY: arenaTop,
    arenaW: Math.max(1, width),
    arenaH,
    arenaBottom,
  };
}

export function drawRunSceneBackground(scene, width, height, runLayout) {
  const watermarkTexture = scene.watermarkBackground?.texture?.key || "";
  if (scene.watermarkBackground && watermarkTexture && scene.textures.exists(watermarkTexture)) {
    const cover = coverSizeForTexture(scene, watermarkTexture, runLayout.arenaW, runLayout.arenaH);
    scene.watermarkBackground
      .setPosition(runLayout.arenaX + runLayout.arenaW * 0.5, runLayout.arenaY + runLayout.arenaH * 0.5)
      .setDisplaySize(cover.width, cover.height)
      .setAlpha(1)
      .setVisible(true);
    if (scene.watermarkMaskShape) {
      scene.watermarkMaskShape.clear();
      scene.watermarkMaskShape.fillStyle(0xffffff, 1);
      scene.watermarkMaskShape.fillRect(runLayout.arenaX, runLayout.arenaY, runLayout.arenaW, runLayout.arenaH);
    }
  } else if (scene.watermarkBackground) {
    scene.watermarkBackground.setVisible(false);
  }
  scene.graphics.fillGradientStyle(0x0f2238, 0x0f2238, 0x061524, 0x061524, 0.48);
  scene.graphics.fillRect(0, 0, width, height);
  scene.graphics.fillStyle(0x081726, 0.96);
  scene.graphics.fillRect(0, 0, width, runLayout.topBarH);
  scene.graphics.fillStyle(0x081726, 0.96);
  scene.graphics.fillRect(0, height - runLayout.bottomBarH, width, runLayout.bottomBarH);
  const centerX = runLayout.arenaX + runLayout.arenaW * 0.5;
  const centerY = runLayout.arenaY + runLayout.arenaH * 0.5;
  const glowMaxW = runLayout.arenaW * 1.28;
  const glowMaxH = runLayout.arenaH * 1.22;
  const glowMinW = runLayout.arenaW * 0.14;
  const glowMinH = runLayout.arenaH * 0.12;
  const glowLayers = 96;
  for (let i = glowLayers - 1; i >= 0; i -= 1) {
    const t = i / (glowLayers - 1);
    const falloff = 1 - t;
    const alpha = 0.033 * Math.pow(falloff, 2.25);
    const glowW = glowMinW + (glowMaxW - glowMinW) * t;
    const glowH = glowMinH + (glowMaxH - glowMinH) * t;
    scene.graphics.fillStyle(0x7b4e29, alpha);
    scene.graphics.fillEllipse(centerX, centerY, glowW, glowH);
  }
  const innerLayers = 56;
  for (let i = innerLayers - 1; i >= 0; i -= 1) {
    const t = i / (innerLayers - 1);
    const falloff = 1 - t;
    const alpha = 0.017 * Math.pow(falloff, 1.9);
    const glowW = runLayout.arenaW * (0.08 + t * 0.46);
    const glowH = runLayout.arenaH * (0.08 + t * 0.44);
    scene.graphics.fillStyle(0xa56f3c, alpha);
    scene.graphics.fillEllipse(centerX, centerY, glowW, glowH);
  }
}

function drawRunSceneChipIcon(scene, x, y, radius) {
  const safeRadius = Math.max(3, Number(radius) || 8);
  scene.graphics.fillStyle(0xe0ba74, 0.92);
  scene.graphics.fillCircle(x, y, safeRadius);
  scene.graphics.lineStyle(1.4, 0x8f6a34, 0.8);
  scene.graphics.strokeCircle(x, y, safeRadius);
  scene.graphics.fillStyle(0x6b4d24, 0.52);
  scene.graphics.fillCircle(x, y, safeRadius * 0.42);
  scene.graphics.lineStyle(1, 0xf4d89f, 0.42);
  scene.graphics.strokeCircle(x, y, safeRadius * 0.74);
}

export function drawRunSceneHud(scene, snapshot, width, runLayout) {
  const run = snapshot.run || {};
  const chips = Number.isFinite(run.chips)
    ? run.chips
    : Number.isFinite(run.player?.gold)
      ? run.player.gold
      : 0;
  const floor = Number.isFinite(run.floor) ? run.floor : 1;
  const maxFloor = Number.isFinite(run.maxFloor) ? run.maxFloor : 3;
  const room = Number.isFinite(run.room) ? run.room : 1;
  const roomsPerFloor = Number.isFinite(run.roomsPerFloor) ? run.roomsPerFloor : 5;
  const compact = Boolean(runLayout.compact);
  if (compact) {
    const rowY = Math.round(runLayout.topBarH * 0.5);
    const leftStartX = runLayout.sidePad + 8;
    if (scene.hudChipsIcon) {
      scene.hudChipsIcon.setPosition(leftStartX, rowY);
      scene.hudChipsIcon.setDisplaySize(18, 18);
      scene.hudChipsIcon.clearTint();
      scene.hudChipsIcon.setVisible(true);
    } else {
      drawRunSceneChipIcon(scene, leftStartX, rowY, 7);
    }
    const chipsNode = scene.drawText("hud-chips", String(chips), leftStartX + 20, rowY, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "16px",
      color: "#f2cd88",
      fontStyle: "800",
    }, { x: 0, y: 0.5 });
    const floorRoomX = chipsNode.x + chipsNode.width + 26;
    scene.drawText("hud-floor-room", `Floor ${floor}/${maxFloor}  Room ${room}/${roomsPerFloor}`, floorRoomX, rowY, {
      fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
      fontSize: "15px",
      color: "#e2d0af",
      fontStyle: "800",
    }, { x: 0, y: 0.5 });
    return;
  }

  const hudY = Math.round(runLayout.topBarH * 0.48);
  const leftStartX = runLayout.sidePad + 8;
  if (scene.hudChipsIcon) {
    scene.hudChipsIcon.setPosition(leftStartX, hudY);
    scene.hudChipsIcon.setDisplaySize(20, 20);
    scene.hudChipsIcon.clearTint();
    scene.hudChipsIcon.setVisible(true);
  } else {
    drawRunSceneChipIcon(scene, leftStartX, hudY, 8);
  }
  scene.drawText("hud-chips", String(chips), leftStartX + 22, hudY, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: "17px",
    color: "#f2cd88",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });
  scene.drawText("hud-floor-room", `Floor ${floor}/${maxFloor}  Room ${room}/${roomsPerFloor}`, width * 0.5, hudY, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: "16px",
    color: "#e2d0af",
    fontStyle: "700",
  }, { x: 0.5, y: 0.5 });
}
