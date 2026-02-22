import Phaser from "phaser";
import { SHOP_CAMP_BACKGROUND_KEY } from "./shop-scene-config.js";

export function coverSizeForShopSceneTexture(scene, textureKey, boundsW, boundsH) {
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

export function drawShopSceneBackground(scene, width, height) {
  const compact = scene.isCompactLayout(width);
  if (scene.campBackground && scene.textures.exists(SHOP_CAMP_BACKGROUND_KEY)) {
    const cover = coverSizeForShopSceneTexture(scene, SHOP_CAMP_BACKGROUND_KEY, width, height);
    scene.campBackground
      .setPosition(width * 0.5, height * 0.5)
      .setDisplaySize(cover.width, cover.height)
      .setAlpha(0.82)
      .setVisible(true);
  } else if (scene.campBackground) {
    scene.campBackground.setVisible(false);
  }

  scene.graphics.fillStyle(0x060303, 0.62);
  scene.graphics.fillRect(0, 0, width, height);
  scene.graphics.fillGradientStyle(0x120c07, 0x120c07, 0x060403, 0x060403, 0.78);
  scene.graphics.fillRect(0, 0, width, height);
  scene.graphics.fillStyle(0x000000, 0.3);
  scene.graphics.fillRoundedRect(12, 10, width - 24, height - 20, 16);

  const bottomBarH = compact
    ? Phaser.Math.Clamp(Math.round(height * 0.19), 108, 146)
    : Math.max(74, Math.round(height * 0.115));
  const bottomBarY = height - bottomBarH - 12;
  scene.graphics.fillStyle(0x120b07, 0.94);
  scene.graphics.fillRoundedRect(12, bottomBarY, width - 24, bottomBarH, 16);
  scene.graphics.lineStyle(1.2, 0x5d4a34, 0.42);
  scene.graphics.strokeRoundedRect(12, bottomBarY, width - 24, bottomBarH, 16);

  scene.bottomBarRect = {
    x: 12,
    y: bottomBarY,
    width: width - 24,
    height: bottomBarH,
  };
}

export function drawShopSceneHeader(scene, snapshot, width) {
  const run = snapshot.run || {};
  const compact = scene.isCompactLayout(width);
  const topBarH = compact ? 76 : 74;
  const sidePad = Math.max(compact ? 16 : 22, Math.round(width * (compact ? 0.016 : 0.02)));

  scene.graphics.fillStyle(0x140d07, 0.94);
  scene.graphics.fillRect(0, 0, width, topBarH);
  scene.graphics.fillStyle(0x000000, 0.24);
  scene.graphics.fillRect(0, topBarH - 1, width, 1);

  const topY = compact ? Math.round(topBarH * 0.5) : Math.round(topBarH * 0.48);
  const leftStartX = sidePad + 8;
  if (scene.chipsIcon) {
    scene.chipsIcon.setPosition(leftStartX, topY);
    scene.chipsIcon.setDisplaySize(compact ? 18 : 20, compact ? 18 : 20);
    scene.chipsIcon.clearTint();
    scene.chipsIcon.setVisible(true);
  }

  const chipsNode = scene.drawText("shop-top-chips", `${run.chips || 0}`, leftStartX + (compact ? 20 : 22), topY, {
    fontFamily: '"Chakra Petch", "Sora", sans-serif',
    fontSize: compact ? "16px" : "17px",
    color: "#f6e6a6",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });

  const progressLabel = `Floor ${run.floor || 1}/${run.roomsPerFloor || 5}  Room ${run.room || 1}`;
  const progressX = compact ? chipsNode.x + chipsNode.width + 26 : width * 0.5;
  scene.drawText("shop-top-progress", progressLabel, progressX, topY, {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
    fontSize: compact ? "15px" : "16px",
    color: "#e0cfb0",
    fontStyle: "700",
  }, { x: compact ? 0 : 0.5, y: 0.5 });

  scene.drawText("shop-title", "CAMP", width * 0.5, 108, {
    fontFamily: '"Chakra Petch", "Sora", sans-serif',
    fontSize: "38px",
    color: "#f6e6a6",
    stroke: "#0f1b28",
    strokeThickness: 5,
  });

  if (scene.shopOpen) {
    scene.drawText("shop-subtitle", "ONE PURCHASE PER CAMP. CHOOSE CAREFULLY.", width * 0.5, 142, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "18px",
      color: "#d7e6f3",
    });
  }
}

export function syncShopSceneModalBlocker(scene, width, height) {
  if (!scene.modalBlocker) {
    return;
  }
  const open = Boolean(scene.logsModalOpen);
  scene.modalBlocker.setSize(width, height);
  scene.modalBlocker.setVisible(open);
  scene.modalBlocker.active = open;
}
