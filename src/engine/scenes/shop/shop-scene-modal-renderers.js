import Phaser from "phaser";
import { applyGradientButtonStyle } from "../ui/gradient-button.js";
import { createModalCloseButton, drawFramedModalPanel, drawModalBackdrop, placeModalCloseButton } from "../ui/modal-ui.js";
import {
  SHOP_BUTTON_STYLE,
  SHOP_MODAL_CLOSE_DEPTH,
  SHOP_MODAL_CONTENT_DEPTH,
  SHOP_PRIMARY_GOLD,
} from "./shop-scene-config.js";

const HAND_RESOLUTION_RE =
  /(?:\bhand\b|\bblackjack\b|\bbust\b|\bdouble\b|\bsplit\b|\bhit\b|\bstand\b|\bdeal\b|\bpush\b|\bwin\b|\blose\b|\bresolved?\b)/i;

export function ensureShopSceneLogsCloseButton(scene, onPress) {
  if (scene.logsCloseButton) {
    return scene.logsCloseButton;
  }
  scene.logsCloseButton = createModalCloseButton(scene, {
    id: "shop-logs-close",
    styleSet: SHOP_BUTTON_STYLE,
    onPress,
    depth: SHOP_MODAL_CLOSE_DEPTH,
    width: 42,
    height: 32,
    iconSize: 15,
  });
  return scene.logsCloseButton;
}

export function ensureShopScenePanelCloseButton(scene) {
  if (scene.shopCloseButton) {
    return scene.shopCloseButton;
  }
  scene.shopCloseButton = createModalCloseButton(scene, {
    id: "shop-panel-close",
    styleSet: SHOP_BUTTON_STYLE,
    onPress: () => scene.setShopOpen(false),
    depth: 130,
    width: 34,
    height: 30,
    iconSize: 13,
  });
  return scene.shopCloseButton;
}

export function drawShopSceneLogsModal(scene, { snapshot, width, height }) {
  if (!scene.overlayGraphics || !scene.logsModalOpen) {
    if (scene.logsCloseButton) {
      scene.logsCloseButton.container.setVisible(false);
    }
    return;
  }

  const rawLogs = Array.isArray(snapshot?.logs) ? snapshot.logs : [];
  const logs = ["Run started.", ...rawLogs.map((entry) => String(entry || ""))];
  const compact = width < 760;
  const modalW = Phaser.Math.Clamp(width - 56, 320, 720);
  const modalH = Phaser.Math.Clamp(460, 240, height - 96);
  const x = Math.round(width * 0.5 - modalW * 0.5);
  const y = Math.round(height * 0.5 - modalH * 0.5);

  drawModalBackdrop(scene.overlayGraphics, width, height, { color: 0x000000, alpha: 0.82 });
  drawFramedModalPanel(scene.overlayGraphics, {
    x,
    y,
    width: modalW,
    height: modalH,
    radius: 20,
    fillColor: 0x0f1f30,
    fillAlpha: 0.96,
    borderColor: 0x6f95b6,
    borderAlpha: 0.46,
    borderWidth: 1.4,
    headerColor: 0x0b1623,
    headerAlpha: 0.9,
    headerHeight: 52,
  });

  const title = scene.drawText("shop-logs-title", "RUN LOGS", x + 18, y + 26, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: "24px",
    color: "#f2d8a0",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });
  title.setDepth(SHOP_MODAL_CONTENT_DEPTH);

  const listX = x + 14;
  const listY = y + 60;
  const listW = modalW - 28;
  const listH = modalH - 84;
  const rowH = compact ? 34 : 38;
  const rowGap = compact ? 6 : 8;
  const bubbleAreaH = Math.max(44, listH - 24);
  const maxRows = Math.max(1, Math.floor((bubbleAreaH + rowGap) / (rowH + rowGap)));
  const visible = logs.slice(-maxRows);
  const firstY = Math.round(listY + bubbleAreaH - visible.length * (rowH + rowGap));
  const maxChars = compact ? 56 : 92;
  const absoluteStart = logs.length - visible.length;

  visible.forEach((line, index) => {
    const absIndex = absoluteStart + index;
    const isStart = absIndex === 0;
    const isHandResolution = !isStart && HAND_RESOLUTION_RE.test(line);
    const rowY = firstY + index * (rowH + rowGap);
    const bubbleFill = isStart || isHandResolution ? 0x1f364d : 0x16283a;
    const bubbleStroke = isStart || isHandResolution ? SHOP_PRIMARY_GOLD : 0x5c7d99;

    scene.overlayGraphics.fillStyle(bubbleFill, isStart || isHandResolution ? 0.92 : 0.84);
    scene.overlayGraphics.fillRoundedRect(listX, rowY, listW, rowH, 12);
    scene.overlayGraphics.lineStyle(1.1, bubbleStroke, isStart || isHandResolution ? 0.54 : 0.34);
    scene.overlayGraphics.strokeRoundedRect(listX, rowY, listW, rowH, 12);

    const normalized = String(line || "").replace(/\s+/g, " ").trim();
    const displayLine = normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1).trimEnd()}…` : normalized;
    const row = scene.drawText(`shop-logs-line-${index}`, displayLine, listX + 12, rowY + rowH * 0.5, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: compact ? "13px" : "15px",
      color: isStart || isHandResolution ? "#f2cd88" : "#d7e6f3",
      fontStyle: isStart ? "700" : "600",
    }, { x: 0, y: 0.5 });
    row.setDepth(SHOP_MODAL_CONTENT_DEPTH);
  });

  const dots = ".".repeat((Math.floor(scene.time.now / 300) % 3) + 1);
  const waiting = scene.drawText("shop-logs-waiting", `waiting${dots}`, listX + listW - 2, y + modalH - 14, {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
    fontSize: compact ? "11px" : "12px",
    color: "#f2cd88",
    fontStyle: "600",
  }, { x: 1, y: 1 });
  waiting.setDepth(SHOP_MODAL_CONTENT_DEPTH);

  const closeButton = ensureShopSceneLogsCloseButton(scene, () => {
    scene.logsModalOpen = false;
  });
  placeModalCloseButton(closeButton, {
    x: x + modalW - 26,
    y: y + 24,
    depth: SHOP_MODAL_CLOSE_DEPTH,
    width: 42,
    height: 32,
    iconSize: 15,
    enabled: true,
    visible: true,
    styleName: "idle",
    applyStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
  });
}
