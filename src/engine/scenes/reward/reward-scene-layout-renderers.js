export function syncRewardSceneModalBlocker(scene, width, height) {
  if (!scene.modalBlocker) {
    return;
  }
  const open = Boolean(scene.logsModalOpen);
  scene.modalBlocker.setSize(width, height);
  scene.modalBlocker.setVisible(open);
  scene.modalBlocker.active = open;
}

export function drawRewardSceneBackground(scene, width, height) {
  scene.graphics.fillGradientStyle(0x0b1b2a, 0x0b1b2a, 0x060f17, 0x060f17, 1);
  scene.graphics.fillRect(0, 0, width, height);
  scene.graphics.fillStyle(0x000000, 0.26);
  scene.graphics.fillRoundedRect(10, 8, width - 20, height - 16, 18);
}

export function drawRewardSceneHeader(scene, snapshot, width) {
  const compact = width < 760;
  const titleSize = compact ? "18px" : "33px";
  const titleY = compact ? 42 : 50;
  scene.drawText("reward-title", "CHOOSE A RELIC", width * 0.5, titleY, {
    fontFamily: '"Chakra Petch", "Sora", sans-serif',
    fontSize: titleSize,
    color: "#f6e6a6",
    stroke: "#0f1b28",
    strokeThickness: 2,
  });

  const run = snapshot.run || {};
  const chipsLabel = `${run.chips || 0}`;
  const chipNode = scene.drawText("reward-chips", chipsLabel, width * 0.5, compact ? 76 : 90, {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
    fontSize: compact ? "16px" : "21px",
    color: "#f2cd88",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });

  const iconSize = compact ? 17 : 22;
  const iconGap = compact ? 8 : 10;
  const leftPad = compact ? 14 : 16;
  const rightPad = compact ? 14 : 18;
  let chipFont = compact ? 16 : 21;
  chipNode.setFontSize(chipFont);
  const maxTextW = compact ? Math.max(62, width * 0.24) : Math.max(96, width * 0.14);
  while (chipNode.width > maxTextW && chipFont > 12) {
    chipFont -= 1;
    chipNode.setFontSize(chipFont);
  }

  const pillW = compact
    ? Math.max(96, Math.round(leftPad + iconSize + iconGap + chipNode.width + rightPad))
    : Math.max(120, Math.round(leftPad + iconSize + iconGap + chipNode.width + rightPad));
  const pillH = compact ? 30 : 38;
  const pillX = Math.round(width * 0.5 - pillW * 0.5);
  const pillY = compact ? 62 : 72;

  scene.graphics.fillStyle(0x123046, 0.82);
  scene.graphics.fillRoundedRect(pillX, pillY, pillW, pillH, 19);
  scene.graphics.fillStyle(0x1f4563, 0.36);
  scene.graphics.fillRoundedRect(pillX + 1, pillY + 1, pillW - 2, Math.max(10, Math.round(pillH * 0.38)), 18);

  const iconX = pillX + leftPad + iconSize * 0.5;
  const textX = iconX + iconSize * 0.5 + iconGap;
  chipNode.setPosition(textX, pillY + pillH * 0.5);
  if (scene.chipsIcon) {
    scene.chipsIcon.setPosition(iconX, pillY + pillH * 0.5);
    scene.chipsIcon.setDisplaySize(iconSize, iconSize);
    scene.chipsIcon.clearTint();
    scene.chipsIcon.setVisible(true);
  }
}
