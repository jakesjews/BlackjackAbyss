import Phaser from "phaser";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "../ui/gradient-button.js";
import { createModalCloseButton, drawModalBackdrop, placeModalCloseButton } from "../ui/modal-ui.js";
import { applyBrownThemeToGraphics, toBrownThemeColorNumber, toBrownThemeColorString, toBrownThemeTextStyle } from "../ui/brown-theme.js";
import { COLLECTION_ROW_GAP, COLLECTION_ROW_HEIGHT, OVERLAY_BROWN_THEME, OVERLAY_BUTTON_STYLE } from "./overlay-scene-config.js";
import { invokeOverlayAction, setOverlayCollectionScroll } from "./overlay-scene-lifecycle.js";

export function ensureOverlayCollectionThumbTexture(scene, entry) {
  const id = String(entry?.id || "");
  const thumbUrl = entry?.thumbUrl;
  if (!id || typeof thumbUrl !== "string" || !thumbUrl.startsWith("data:image/")) {
    return null;
  }
  const textureKey = `collection-thumb-${id}`;
  if (!scene.textures.exists(textureKey)) {
    try {
      scene.textures.addBase64(textureKey, thumbUrl);
    } catch {
      return null;
    }
    return null;
  }
  const texture = scene.textures.get(textureKey);
  const source = texture?.source?.[0];
  if (!source || !source.width || !source.height) {
    return null;
  }
  return textureKey;
}

function rebuildOverlayEntryCards(scene, entries) {
  const signature = entries.map((entry) => entry.id).join("|");
  if (signature === scene.lastEntrySignature) {
    return;
  }
  scene.lastEntrySignature = signature;
  scene.entryCards.forEach((card) => card.container.destroy());
  scene.entryCards.clear();

  entries.forEach((entry) => {
    const container = scene.add.container(0, 0);
    const bg = applyBrownThemeToGraphics(scene.add.graphics(), OVERLAY_BROWN_THEME);
    const thumbFrame = applyBrownThemeToGraphics(scene.add.graphics(), OVERLAY_BROWN_THEME);
    const thumbImage = scene.add.image(29, 28, "__WHITE").setVisible(false);
    thumbImage.setDisplaySize(32, 40);
    thumbImage.setAlpha(0.98);
    const thumbGlyph = scene.add
      .text(
        29,
        28,
        "◆",
        toBrownThemeTextStyle(
          {
            fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
            fontSize: "14px",
            color: "#f0f8ff",
            stroke: "#0d1520",
            strokeThickness: 2,
            fontStyle: "700",
          },
          OVERLAY_BROWN_THEME
        )
      )
      .setOrigin(0.5, 0.5);
    const rarity = scene.add
      .text(
        0,
        0,
        "",
        toBrownThemeTextStyle(
          {
            fontFamily: '"Sora", "Segoe UI", sans-serif',
            fontSize: "9px",
            color: "#9aa9b8",
            stroke: "#0b121a",
            strokeThickness: 1,
            fontStyle: "700",
          },
          OVERLAY_BROWN_THEME
        )
      )
      .setOrigin(0.5, 0.5);
    const rarityChip = applyBrownThemeToGraphics(scene.add.graphics(), OVERLAY_BROWN_THEME);
    const name = scene.add
      .text(
        0,
        0,
        "",
        toBrownThemeTextStyle(
          {
            fontFamily: '"Chakra Petch", "Sora", sans-serif',
            fontSize: "14px",
            color: "#ecf4ff",
            stroke: "#0a121a",
            strokeThickness: 1,
          },
          OVERLAY_BROWN_THEME
        )
      )
      .setOrigin(0, 0.5)
      .setFontStyle("700");
    const desc = scene.add
      .text(
        0,
        0,
        "",
        toBrownThemeTextStyle(
          {
            fontFamily: '"Sora", "Segoe UI", sans-serif',
            fontSize: "10px",
            color: "#e2f1ff",
            stroke: "#08131d",
            strokeThickness: 1,
            align: "left",
            wordWrap: { width: 260 },
          },
          OVERLAY_BROWN_THEME
        )
      )
      .setOrigin(0, 0.5);
    const ownedChip = applyBrownThemeToGraphics(scene.add.graphics(), OVERLAY_BROWN_THEME);
    const owned = scene.add
      .text(
        0,
        0,
        "",
        toBrownThemeTextStyle(
          {
            fontFamily: '"Sora", "Segoe UI", sans-serif',
            fontSize: "10px",
            color: "#90a9bf",
            stroke: "#0a121a",
            strokeThickness: 1,
            fontStyle: "700",
          },
          OVERLAY_BROWN_THEME
        )
      )
      .setOrigin(0.5, 0.5);

    rarity.setPosition(96, 15);
    name.setPosition(128, 17);
    desc.setPosition(58, 36);
    owned.setPosition(208, 17);
    container.add([bg, thumbFrame, thumbImage, thumbGlyph, rarityChip, rarity, name, desc, ownedChip, owned]);
    if (scene.collectionListContainer) {
      scene.collectionListContainer.add(container);
    }
    scene.entryCards.set(entry.id, { container, bg, thumbFrame, thumbImage, thumbGlyph, rarityChip, rarity, name, desc, ownedChip, owned });
  });
}

function rebuildOverlayButtons(scene, actions) {
  const expected = new Set(actions.map((entry) => entry.id));
  scene.buttons.forEach((button, id) => {
    if (!expected.has(id)) {
      button.container.destroy();
      scene.buttons.delete(id);
    }
  });

  actions.forEach((action) => {
    if (scene.buttons.has(action.id)) {
      return;
    }
    const button = action.modalClose
      ? createModalCloseButton(scene, {
          id: action.id,
          styleSet: OVERLAY_BUTTON_STYLE,
          onPress: () => invokeOverlayAction(scene, action.id),
          depth: 220,
          width: 42,
          height: 32,
          iconSize: 15,
        })
      : createGradientButton(scene, {
          id: action.id,
          label: action.label,
          styleSet: OVERLAY_BUTTON_STYLE,
          onPress: () => invokeOverlayAction(scene, action.id),
          width: 210,
          height: 64,
          fontSize: 28,
        });
    scene.buttons.set(action.id, button);
  });
}

function renderOverlayCollection(scene, snapshot, width, height) {
  scene.graphics.fillGradientStyle(0x0a1d2c, 0x0a1d2c, 0x06121d, 0x06121d, 1);
  scene.graphics.fillRect(0, 0, width, height);
  drawModalBackdrop(scene.graphics, width, height, { color: 0x000000, alpha: 0.82 });

  const panelInsetX = 6;
  const panelInsetY = 8;
  const panelX = panelInsetX;
  const panelY = panelInsetY;
  const panelW = Math.max(320, width - panelInsetX * 2);
  const panelH = Math.max(240, height - panelInsetY * 2);
  const panelRadius = 20;

  scene.graphics.fillGradientStyle(0x112435, 0x112435, 0x0d1d2c, 0x0d1d2c, 0.97);
  scene.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, panelRadius);
  scene.graphics.lineStyle(1, 0xd2e6f7, 0.18);
  scene.graphics.strokeRoundedRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2, panelRadius - 2);

  scene.drawText("collection-title", "COLLECTIONS", width * 0.5, panelY + 34, {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: "34px",
    color: "#f2d8a0",
    stroke: "#0a1118",
    strokeThickness: 2,
    fontStyle: "700",
  });
  scene.drawText("collection-summary", snapshot.summary || "", width * 0.5, panelY + 62, {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
    fontSize: "15px",
    color: "#bdd5e8",
  });

  const viewportPadX = 12;
  const viewportY = panelY + 78;
  const viewportH = panelH - 90;
  const scrollBarW = 14;
  const viewportX = panelX + viewportPadX;
  const viewportW = panelW - viewportPadX * 2 - scrollBarW - 8;

  scene.graphics.fillStyle(0x0d1b29, 0.4);
  scene.graphics.fillRoundedRect(viewportX, viewportY, viewportW, viewportH, 16);
  scene.graphics.lineStyle(1, 0xa8c6db, 0.22);
  scene.graphics.strokeRoundedRect(viewportX, viewportY, viewportW, viewportH, 16);

  const entries = Array.isArray(snapshot.entries)
    ? snapshot.entries
    : Array.isArray(snapshot.pageEntries)
      ? snapshot.pageEntries
      : [];
  const signature = entries.map((entry) => entry.id).join("|");
  if (signature !== scene.collectionSignature) {
    scene.collectionSignature = signature;
    scene.collectionScroll = 0;
    scene.collectionScrollTarget = 0;
  }
  rebuildOverlayEntryCards(scene, entries);
  scene.collectionViewport = { x: viewportX, y: viewportY, width: viewportW, height: viewportH };
  if (scene.collectionMaskShape) {
    scene.collectionMaskShape.clear();
    scene.collectionMaskShape.fillStyle(0xffffff, 1);
    scene.collectionMaskShape.fillRoundedRect(viewportX, viewportY, viewportW, viewportH, 14);
  }

  const cardW = viewportW - 12;
  const cardH = COLLECTION_ROW_HEIGHT;
  const contentH = Math.max(0, entries.length * (cardH + COLLECTION_ROW_GAP) - COLLECTION_ROW_GAP);
  scene.collectionScrollMax = Math.max(0, contentH - viewportH);
  setOverlayCollectionScroll(scene, scene.collectionScrollTarget);
  scene.collectionScroll = Phaser.Math.Linear(scene.collectionScroll, scene.collectionScrollTarget, 0.34);
  const listStartX = viewportX + 6;
  const listStartY = viewportY + 6 - scene.collectionScroll;

  entries.forEach((entry, index) => {
    const card = scene.entryCards.get(entry.id);
    if (!card) {
      return;
    }
    const x = listStartX;
    const y = listStartY + index * (cardH + COLLECTION_ROW_GAP);
    const bottom = y + cardH;
    const visible = bottom >= viewportY - 24 && y <= viewportY + viewportH + 24;
    card.container.setPosition(x, y);
    card.bg.clear();
    card.bg.fillStyle(entry.unlocked ? 0x203447 : 0x172634, entry.unlocked ? 0.92 : 0.82);
    card.bg.fillRoundedRect(0, 0, cardW, cardH, 12);

    card.thumbFrame.clear();
    card.thumbFrame.fillStyle(0x0f1f2d, 0.95);
    card.thumbFrame.fillRoundedRect(12, 7, 34, 42, 10);
    const thumbBorderColor = toBrownThemeColorNumber(
      Phaser.Display.Color.HexStringToColor(entry.rarityColor || "#8ca4ba").color,
      OVERLAY_BROWN_THEME
    );
    card.thumbFrame.lineStyle(1, thumbBorderColor, entry.unlocked ? 0.42 : 0.22);
    card.thumbFrame.strokeRoundedRect(12, 7, 34, 42, 10);

    const thumbTextureKey = ensureOverlayCollectionThumbTexture(scene, entry);
    if (thumbTextureKey) {
      if (card.thumbImage.texture?.key !== thumbTextureKey) {
        card.thumbImage.setTexture(thumbTextureKey);
      }
      card.thumbImage.setPosition(29, 28);
      card.thumbImage.setDisplaySize(32, 40);
      card.thumbImage.setVisible(true);
      card.thumbGlyph.setVisible(false);
    } else {
      card.thumbImage.setPosition(29, 28);
      card.thumbImage.setDisplaySize(32, 40);
      card.thumbImage.setVisible(false);
      card.thumbGlyph.setVisible(true);
    }

    card.rarity.setText((entry.rarityLabel || "").toUpperCase());
    const ownedText = entry.copies > 0 ? `OWNED ${entry.copies > 99 ? "99+" : entry.copies}` : "NONE";
    card.owned.setText(ownedText);
    const ownedChipW = Phaser.Math.Clamp(Math.round(card.owned.width + 14), 50, 94);
    const rarityChipW = Phaser.Math.Clamp(Math.round(card.rarity.width + 14), 48, 98);
    const badgeGap = 8;
    const badgeTop = 8;
    const rarityChipLeft = cardW - 12 - rarityChipW;
    const ownedChipLeft = rarityChipLeft - badgeGap - ownedChipW;
    const ownedChipX = ownedChipLeft + ownedChipW * 0.5;
    card.ownedChip.clear();
    card.ownedChip.fillStyle(entry.copies > 0 ? 0x3b2d16 : 0x243240, entry.copies > 0 ? 0.96 : 0.78);
    card.ownedChip.fillRoundedRect(ownedChipLeft, badgeTop, ownedChipW, 18, 9);
    card.owned.setPosition(ownedChipX, badgeTop + 9);

    card.rarityChip.clear();
    card.rarityChip.fillStyle(0x123046, entry.unlocked ? 0.88 : 0.58);
    card.rarityChip.fillRoundedRect(rarityChipLeft, badgeTop, rarityChipW, 18, 9);
    card.rarity.setPosition(rarityChipLeft + rarityChipW * 0.5, badgeTop + 9);
    card.rarity.setColor(
      toBrownThemeColorString(entry.unlocked ? entry.rarityColor || "#b7c9d8" : "#96a7b5", OVERLAY_BROWN_THEME)
    );

    const nameX = 58;
    const nameSpace = Math.max(100, ownedChipLeft - 10 - nameX);
    const rawName = String(entry.name || "LOCKED").replace(/\s+/g, " ").trim();
    const nameCharCap = Math.max(10, Math.floor(nameSpace / 8.6));
    const compactName = rawName.length > nameCharCap ? `${rawName.slice(0, nameCharCap - 1).trimEnd()}…` : rawName;
    card.name.setText(compactName);
    card.name.setPosition(nameX, 17);

    const descW = Math.max(140, cardW - 76);
    const rawDesc = String(entry.description || "").replace(/\s+/g, " ").trim();
    const descCharCap = Math.max(24, Math.floor((descW - 8) / 6.2));
    const compactDesc = rawDesc.length > descCharCap ? `${rawDesc.slice(0, descCharCap - 1).trimEnd()}…` : rawDesc;
    card.desc.setText(compactDesc);
    card.desc.setWordWrapWidth(descW, false);
    card.desc.setPosition(58, 36);
    card.name.setColor(toBrownThemeColorString(entry.unlocked ? "#eef6ff" : "#b5c2cf", OVERLAY_BROWN_THEME));
    card.desc.setColor(toBrownThemeColorString(entry.unlocked ? "#c6d8e8" : "#96a8b7", OVERLAY_BROWN_THEME));
    card.owned.setColor(toBrownThemeColorString(entry.copies > 0 ? "#f4d598" : "#8ea4b8", OVERLAY_BROWN_THEME));
    card.thumbGlyph.setColor(toBrownThemeColorString(entry.unlocked ? "#f0f8ff" : "#8ea3b7", OVERLAY_BROWN_THEME));
    card.container.setVisible(visible);
  });

  scene.entryCards.forEach((card, id) => {
    const exists = entries.some((entry) => entry.id === id);
    if (!exists) {
      card.container.setVisible(false);
    }
  });

  if (scene.collectionListContainer) {
    scene.collectionListContainer.setVisible(true);
  }

  const actions = [{ id: "closeCollection", label: "", enabled: true, modalClose: true }];
  rebuildOverlayButtons(scene, actions);
  const closeButton = scene.buttons.get("closeCollection");
  if (closeButton) {
    placeModalCloseButton(closeButton, {
      x: panelX + panelW - 28,
      y: panelY + 26,
      depth: 220,
      width: 42,
      height: 32,
      iconSize: 15,
      enabled: true,
      visible: true,
      styleName: "idle",
      applyStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
    });
  }

  const scrollTrackX = viewportX + viewportW + 4;
  const scrollTrackY = viewportY;
  const scrollTrackH = viewportH;
  scene.graphics.fillStyle(0x102233, 0.74);
  scene.graphics.fillRoundedRect(scrollTrackX, scrollTrackY, scrollBarW, scrollTrackH, 6);
  if (scene.collectionScrollMax > 0) {
    const thumbMin = 40;
    const thumbH = Math.max(thumbMin, Math.round((viewportH / contentH) * viewportH));
    const scrollRatio = scene.collectionScrollMax > 0 ? scene.collectionScroll / scene.collectionScrollMax : 0;
    const thumbY = scrollTrackY + Math.round((scrollTrackH - thumbH) * scrollRatio);
    const thumbX = scrollTrackX + 1;
    const thumbW = scrollBarW - 2;
    scene.graphics.fillStyle(0xf2c56d, 0.98);
    scene.graphics.fillRoundedRect(thumbX, thumbY, thumbW, thumbH, 6);
  } else {
    scene.graphics.fillStyle(0xf2c56d, 0.44);
    scene.graphics.fillRoundedRect(scrollTrackX + 1, scrollTrackY + 1, scrollBarW - 2, scrollTrackH - 2, 6);
  }
}

function renderOverlayEnd(scene, snapshot, width, height) {
  if (scene.collectionListContainer) {
    scene.collectionListContainer.setVisible(false);
  }
  drawModalBackdrop(scene.graphics, width, height, { color: 0x000000, alpha: 0.82 });
  const panelW = Math.max(660, Math.min(width - 70, 780));
  const panelH = Math.max(370, Math.min(height - 80, 430));
  const panelX = width * 0.5 - panelW * 0.5;
  const panelY = height * 0.5 - panelH * 0.5;

  scene.graphics.fillStyle(0x0e1c2a, 0.95);
  scene.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
  scene.graphics.lineStyle(2, 0xb2d8f5, 0.25);
  scene.graphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

  scene.drawText("overlay-title", snapshot.title || "", width * 0.5, panelY + 84, {
    fontFamily: '"Chakra Petch", "Sora", sans-serif',
    fontSize: "56px",
    color: "#f6e6a6",
  });
  scene.drawText("overlay-subtitle", snapshot.subtitle || "", width * 0.5, panelY + 126, {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
    fontSize: "22px",
    color: "#c0d9ec",
  });

  const stats = Array.isArray(snapshot.stats) ? snapshot.stats : [];
  stats.slice(0, 6).forEach((line, index) => {
    scene.drawText(`overlay-stat-${index}`, line, width * 0.5, panelY + 178 + index * 32, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "20px",
      color: "#dbe9f7",
    });
  });
  scene.drawText("overlay-prompt", snapshot.prompt || "", width * 0.5, panelY + panelH - 64, {
    fontFamily: '"Chakra Petch", "Sora", sans-serif',
    fontSize: "23px",
    color: "#f8d37b",
  });

  const actions = [{ id: "restart", label: "NEW RUN", enabled: Boolean(snapshot.canRestart) }];
  rebuildOverlayButtons(scene, actions);
  const button = scene.buttons.get("restart");
  if (!button) {
    return;
  }
  button.container.setPosition(width * 0.5, panelY + panelH - 24);
  setGradientButtonSize(button, Math.min(300, panelW - 120), 52);
  button.text.setFontSize(24);
  button.text.setText("NEW RUN");
  button.enabled = Boolean(snapshot.canRestart);
  applyGradientButtonStyle(button, button.enabled ? "idle" : "disabled");
  button.container.setVisible(true);
}

export function renderOverlaySceneSnapshot(scene, snapshot) {
  const width = scene.scale.gameSize.width;
  const height = scene.scale.gameSize.height;
  scene.graphics.clear();
  scene.hideAllText();
  if (!snapshot) {
    if (scene.collectionListContainer) {
      scene.collectionListContainer.setVisible(false);
    }
    rebuildOverlayEntryCards(scene, []);
    rebuildOverlayButtons(scene, []);
    return;
  }

  if (snapshot.mode === "collection") {
    renderOverlayCollection(scene, snapshot, width, height);
    return;
  }
  if (scene.collectionListContainer) {
    scene.collectionListContainer.setVisible(false);
  }
  rebuildOverlayEntryCards(scene, []);
  renderOverlayEnd(scene, snapshot, width, height);
}
