import Phaser from "phaser";
import { createModalCloseButton, drawFramedModalPanel, drawModalBackdrop, placeModalCloseButton } from "../ui/modal-ui.js";
import {
  RUN_MODAL_BASE_DEPTH,
  RUN_MODAL_CLOSE_OFFSET,
  RUN_MODAL_CONTENT_OFFSET,
  RUN_MODAL_LAYER_STEP,
  RUN_PRIMARY_GOLD,
} from "./run-scene-config.js";
import { setRunSceneModalOpen } from "./run-scene-modals.js";

function ensureRunSceneModalCloseButton(scene, kind, onPress, styleSet) {
  if (kind === "logs-close" && scene.logsCloseButton) {
    return scene.logsCloseButton;
  }
  if (kind === "relic-close" && scene.relicCloseButton) {
    return scene.relicCloseButton;
  }
  const button = createModalCloseButton(scene, {
    id: kind,
    styleSet,
    onPress,
    depth: RUN_MODAL_CLOSE_OFFSET + RUN_MODAL_BASE_DEPTH,
    width: 42,
    height: 32,
    iconSize: 15,
  });
  if (kind === "logs-close") {
    scene.logsCloseButton = button;
  } else {
    scene.relicCloseButton = button;
  }
  return button;
}

export function drawRunSceneLogsModal(
  scene,
  {
    snapshot,
    width,
    height,
    runLayout,
    layerIndex = -1,
    styleSet,
    applyButtonStyle,
  }
) {
  if (!scene?.overlayGraphics) {
    return;
  }
  if (!scene.logsModalOpen || layerIndex < 0) {
    if (scene.logsCloseButton) {
      scene.logsCloseButton.container.setVisible(false);
    }
    return;
  }

  const modalContentDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CONTENT_OFFSET;
  const modalCloseDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CLOSE_OFFSET;
  const rawLogs = Array.isArray(snapshot?.logs) ? snapshot.logs : [];
  const logs = ["Run started.", ...rawLogs.map((entry) => String(entry || ""))];
  const compact = Boolean(runLayout?.compact);
  const modalW = Phaser.Math.Clamp(width - 56, 320, 720);
  const preferredModalH = 460;
  const modalH = Phaser.Math.Clamp(preferredModalH, 240, height - 96);
  const x = Math.round(width * 0.5 - modalW * 0.5);
  const y = Math.round(runLayout.topBarH + 20);

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

  const title = scene.drawText("logs-title", "RUN LOGS", x + 18, y + 26, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: "24px",
    color: "#f2d8a0",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });
  title.setDepth(modalContentDepth);

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
    const isHandResolution = !isStart &&
      /(?:\bhand\b|\bblackjack\b|\bbust\b|\bdouble\b|\bsplit\b|\bhit\b|\bstand\b|\bdeal\b|\bpush\b|\bwin\b|\blose\b|\bresolved?\b)/i.test(line);
    const rowY = firstY + index * (rowH + rowGap);
    const bubbleFill = isStart || isHandResolution ? 0x1f364d : 0x16283a;
    const bubbleStroke = isStart || isHandResolution ? RUN_PRIMARY_GOLD : 0x5c7d99;
    const bubbleAlpha = isStart || isHandResolution ? 0.92 : 0.84;
    scene.overlayGraphics.fillStyle(bubbleFill, bubbleAlpha);
    scene.overlayGraphics.fillRoundedRect(listX, rowY, listW, rowH, 12);
    scene.overlayGraphics.lineStyle(1.1, bubbleStroke, isStart || isHandResolution ? 0.54 : 0.34);
    scene.overlayGraphics.strokeRoundedRect(listX, rowY, listW, rowH, 12);
    const normalized = String(line || "").replace(/\s+/g, " ").trim();
    const displayLine = normalized.length > maxChars ? `${normalized.slice(0, maxChars - 1).trimEnd()}...` : normalized;
    const row = scene.drawText(`logs-line-${index}`, displayLine, listX + 12, rowY + rowH * 0.5, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: compact ? "13px" : "15px",
      color: isStart || isHandResolution ? "#f2cd88" : "#d7e6f3",
      fontStyle: isStart ? "700" : "600",
    }, { x: 0, y: 0.5 });
    row.setDepth(modalContentDepth);
  });

  const closeButton = ensureRunSceneModalCloseButton(
    scene,
    "logs-close",
    () => {
      setRunSceneModalOpen(scene, "logs", false);
    },
    styleSet
  );
  placeModalCloseButton(closeButton, {
    x: x + modalW - 26,
    y: y + 24,
    depth: modalCloseDepth,
    width: 42,
    height: 32,
    iconSize: 15,
    enabled: true,
    visible: true,
    styleName: "idle",
    applyStyle: applyButtonStyle,
  });
}

export function drawRunSceneRelicsModal(
  scene,
  {
    snapshot,
    width,
    height,
    runLayout,
    layerIndex = -1,
    styleSet,
    applyButtonStyle,
  }
) {
  if (!scene?.overlayGraphics) {
    return;
  }
  if (!scene.relicModalOpen || layerIndex < 0) {
    if (scene.relicCloseButton) {
      scene.relicCloseButton.container.setVisible(false);
    }
    return;
  }

  const modalContentDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CONTENT_OFFSET;
  const modalCloseDepth = RUN_MODAL_BASE_DEPTH + layerIndex * RUN_MODAL_LAYER_STEP + RUN_MODAL_CLOSE_OFFSET;
  const entries = Array.isArray(snapshot?.passives) ? snapshot.passives : [];
  const modalW = Phaser.Math.Clamp(width - 56, 340, 760);
  const modalH = Phaser.Math.Clamp(height - 128, 260, 520);
  const x = Math.round(width * 0.5 - modalW * 0.5);
  const y = Math.round(runLayout.topBarH + 16);

  drawModalBackdrop(scene.overlayGraphics, width, height, { color: 0x000000, alpha: 0.82 });
  drawFramedModalPanel(scene.overlayGraphics, {
    x,
    y,
    width: modalW,
    height: modalH,
    radius: 20,
    fillColor: 0x0f1f30,
    fillAlpha: 0.97,
    borderColor: 0x6f95b6,
    borderAlpha: 0.5,
    borderWidth: 1.4,
    headerColor: 0x0b1623,
    headerAlpha: 0.9,
    headerHeight: 52,
  });
  const totalRelicCount = entries.reduce((acc, entry) => acc + Math.max(1, Number(entry?.count) || 1), 0);
  const title = scene.drawText("relics-title", "RELICS", x + 18, y + 26, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: "24px",
    color: "#f2d8a0",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });
  title.setDepth(modalContentDepth);
  const summary = scene.drawText("relics-summary", `${entries.length} relics • ${totalRelicCount} total`, x + modalW - 62, y + 26, {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
    fontSize: "14px",
    color: "#b7cadb",
    fontStyle: "700",
  }, { x: 1, y: 0.5 });
  summary.setDepth(modalContentDepth);
  if (!entries.length) {
    const emptyNode = scene.drawText("relics-empty", "No relics collected yet.", x + 18, y + 82, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "16px",
      color: "#b7cadb",
    }, { x: 0, y: 0 });
    emptyNode.setDepth(modalContentDepth);
    return;
  }

  const listX = x + 14;
  const listY = y + 58;
  const listW = modalW - 28;
  const listH = modalH - 72;
  const gap = 8;
  let rowH = Math.floor((listH - gap * Math.max(0, entries.length - 1)) / Math.max(1, entries.length));
  let visibleCount = entries.length;
  if (rowH < 34) {
    rowH = 34;
    visibleCount = Math.max(1, Math.floor((listH + gap) / (rowH + gap)));
  }
  rowH = Phaser.Math.Clamp(rowH, 34, 58);
  const visibleEntries = entries.slice(0, visibleCount);
  visibleEntries.forEach((entry, index) => {
    const rowY = listY + index * (rowH + gap);
    scene.overlayGraphics.fillStyle(0x203447, 0.9);
    scene.overlayGraphics.fillRoundedRect(listX, rowY, listW, rowH, 12);
    const thumbSize = Math.min(rowH - 10, 42);
    const thumbX = listX + 8;
    const thumbY = rowY + Math.round((rowH - thumbSize) * 0.5);
    const thumbTexture = typeof entry?.thumbUrl === "string" && entry.thumbUrl.startsWith("data:image/")
      ? `run-relic-thumb-${entry.id}`
      : "";
    if (thumbTexture && !scene.textures.exists(thumbTexture)) {
      try {
        scene.textures.addBase64(thumbTexture, entry.thumbUrl);
      } catch {
        // Ignore bad thumb payloads.
      }
    }
    scene.overlayGraphics.fillStyle(0x102233, 0.96);
    scene.overlayGraphics.fillRoundedRect(thumbX, thumbY, thumbSize, thumbSize, 9);
    if (thumbTexture && scene.textures.exists(thumbTexture)) {
      const imageKey = `relic-thumb-img-${index}`;
      let imageNode = scene.textNodes.get(imageKey);
      if (!imageNode) {
        imageNode = scene.add.image(0, 0, thumbTexture).setDepth(modalContentDepth + 2);
        scene.textNodes.set(imageKey, imageNode);
      } else if (imageNode.texture?.key !== thumbTexture) {
        imageNode.setTexture(thumbTexture);
      }
      imageNode.setPosition(thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5);
      imageNode.setDisplaySize(thumbSize - 4, thumbSize - 4);
      imageNode.setVisible(true);
    } else {
      const glyph = scene.drawText(`relic-thumb-glyph-${index}`, "◆", thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5, {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: "15px",
        color: "#d8e8f7",
        fontStyle: "700",
      });
      glyph.setDepth(modalContentDepth + 2);
    }

    const nameX = thumbX + thumbSize + 10;
    const nameY = rowY + Math.max(16, rowH * 0.36);
    const descY = rowY + Math.max(26, rowH * 0.68);
    const rightX = listX + listW - 10;
    const rarity = String(entry?.rarityLabel || "").toUpperCase();
    const rarityNode = scene.drawText(`relic-rarity-${index}`, rarity, rightX, nameY, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "11px",
      color: "#9fb4c7",
      fontStyle: "700",
    }, { x: 1, y: 0.5 });
    rarityNode.setDepth(modalContentDepth + 2);
    const nameNode = scene.drawText(`relic-name-${index}`, String(entry?.name || "RELIC"), nameX, nameY, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "14px",
      color: "#eef6ff",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    nameNode.setDepth(modalContentDepth + 2);
    const countValue = Number(entry?.count) || 1;
    const countText = countValue > 1 ? `x${countValue > 99 ? "99+" : countValue}` : "";
    const countNode = scene.drawText(`relic-count-${index}`, countText, nameX + nameNode.width + 8, nameY, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "11px",
      color: "#f4d598",
      fontStyle: "700",
    }, { x: 0, y: 0.5 });
    countNode.setDepth(modalContentDepth + 2);
    const descNode = scene.drawText(`relic-desc-${index}`, String(entry?.description || ""), nameX, descY, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "12px",
      color: "#c6d8e8",
    }, { x: 0, y: 0.5 });
    descNode.setDepth(modalContentDepth + 2);
  });

  if (visibleCount < entries.length) {
    const moreNode = scene.drawText("relics-more", `+${entries.length - visibleCount} more`, x + modalW - 18, y + modalH - 14, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "12px",
      color: "#b7cadb",
      fontStyle: "700",
    }, { x: 1, y: 1 });
    moreNode.setDepth(modalContentDepth + 2);
  }

  const closeButton = ensureRunSceneModalCloseButton(
    scene,
    "relic-close",
    () => {
      setRunSceneModalOpen(scene, "relics", false);
    },
    styleSet
  );
  placeModalCloseButton(closeButton, {
    x: x + modalW - 26,
    y: y + 24,
    depth: modalCloseDepth,
    width: 42,
    height: 32,
    iconSize: 15,
    enabled: true,
    visible: true,
    styleName: "idle",
    applyStyle: applyButtonStyle,
  });
}
