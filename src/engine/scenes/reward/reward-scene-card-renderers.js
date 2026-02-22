import Phaser from "phaser";
import { applyBrownThemeToGraphics, toBrownThemeColorNumber, toBrownThemeColorString } from "../ui/brown-theme.js";
import { REWARD_BROWN_THEME, REWARD_CARD_STYLE } from "./reward-scene-config.js";

export function rebuildRewardSceneCards(scene, options) {
  const signature = options.map((option) => option.id).join("|");
  if (signature === scene.lastSignature) {
    return;
  }
  scene.lastSignature = signature;

  scene.cards.forEach((card) => card.container.destroy());
  scene.cards.clear();

  options.forEach((option, index) => {
    const container = scene.add.container(0, 0);
    const bg = scene.add.graphics();
    applyBrownThemeToGraphics(bg, REWARD_BROWN_THEME);
    const thumbFrame = scene.add.graphics();
    applyBrownThemeToGraphics(thumbFrame, REWARD_BROWN_THEME);
    const thumbImage = scene.add.image(0, 0, "__WHITE").setVisible(false);
    const thumbGlyph = scene.add
      .text(0, 0, "◆", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "18px",
        color: toBrownThemeColorString("#cde4f6", REWARD_BROWN_THEME),
        fontStyle: "700",
      })
      .setOrigin(0.5, 0.5);
    const hitZone = scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    hitZone.setInteractive({ useHandCursor: true });
    const rarity = scene.add
      .text(14, 24, "COMMON", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "12px",
        color: toBrownThemeColorString("#cde4f6", REWARD_BROWN_THEME),
        fontStyle: "700",
      })
      .setOrigin(0, 0.5);
    const rarityPill = scene.add.graphics();
    applyBrownThemeToGraphics(rarityPill, REWARD_BROWN_THEME);
    const name = scene.add
      .text(14, 56, option.name || "Relic", {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "24px",
        color: toBrownThemeColorString("#dbeefd", REWARD_BROWN_THEME),
        fontStyle: "700",
      })
      .setOrigin(0, 0.5);
    const desc = scene.add
      .text(14, 98, option.description || "", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "16px",
        color: toBrownThemeColorString("#d9ecfb", REWARD_BROWN_THEME),
        wordWrap: { width: 220 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    const claimPill = scene.add.graphics();
    applyBrownThemeToGraphics(claimPill, REWARD_BROWN_THEME);
    const claimHit = scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    claimHit.setInteractive({ useHandCursor: true });
    const claimText = scene.add
      .text(0, 0, "CLAIM", {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "21px",
        color: toBrownThemeColorString("#2b1f11", REWARD_BROWN_THEME),
        fontStyle: "700",
      })
      .setOrigin(0.5, 0.5);

    const card = {
      container,
      bg,
      thumbFrame,
      thumbImage,
      thumbGlyph,
      hitZone,
      rarityPill,
      rarity,
      name,
      desc,
      claimPill,
      claimHit,
      claimText,
      claimEnabled: true,
    };

    hitZone.on("pointerdown", () => scene.invokeAction("selectIndex", index));
    claimHit.on("pointerdown", () => {
      scene.invokeAction("selectIndex", index);
      if (!card.claimEnabled) {
        return;
      }
      scene.invokeAction("claim");
    });

    container.add([
      bg,
      thumbFrame,
      thumbImage,
      thumbGlyph,
      rarityPill,
      rarity,
      name,
      desc,
      claimPill,
      claimText,
      hitZone,
      claimHit,
    ]);
    scene.cards.set(option.id, card);
  });
}

export function renderRewardSceneCards(scene, { snapshot, width, height }) {
  const options = Array.isArray(snapshot.options) ? snapshot.options : [];
  rebuildRewardSceneCards(scene, options);
  const compact = width < 760;

  let cardW = Math.max(212, Math.min(332, Math.round(width * 0.245)));
  let cardH = Math.max(278, Math.min(392, Math.round(height * 0.52)));
  let gapX = Math.max(16, Math.round(width * 0.018));
  let gapY = gapX;
  let startX = 0;
  let startY = Math.max(120, Math.round(height * 0.165));

  if (compact) {
    gapY = 10;
    startY = 102;
    cardW = Math.max(220, Math.min(width - 24, 460));
    const availableH = Math.max(260, height - startY - 14);
    cardH = Phaser.Math.Clamp(
      Math.floor((availableH - gapY * Math.max(0, options.length - 1)) / Math.max(1, options.length)),
      170,
      264
    );
    startX = Math.round(width * 0.5 - cardW * 0.5);
  } else {
    const totalW = options.length * cardW + Math.max(0, options.length - 1) * gapX;
    startX = width * 0.5 - totalW * 0.5;
  }

  options.forEach((option, index) => {
    const card = scene.cards.get(option.id);
    if (!card) {
      return;
    }
    const x = compact ? startX : startX + index * (cardW + gapX);
    const y = compact ? startY + index * (cardH + gapY) : startY;
    card.container.setPosition(x, y);
    const selected = Boolean(option.selected);
    const accentColor = toBrownThemeColorNumber(
      Phaser.Display.Color.HexStringToColor(option.color || "#9ec3df").color,
      REWARD_BROWN_THEME
    );
    const claimEnabled = Boolean(snapshot.canClaim);

    card.bg.clear();
    card.bg.fillStyle(selected ? REWARD_CARD_STYLE.fillSelected : REWARD_CARD_STYLE.fill, selected ? 0.97 : 0.9);
    card.bg.fillRoundedRect(0, 0, cardW, cardH, 24);
    card.bg.fillStyle(0xffffff, selected ? 0.06 : 0.03);
    card.bg.fillRoundedRect(1, 1, cardW - 2, Math.max(40, Math.round(cardH * 0.2)), 23);
    card.bg.lineStyle(1.1, selected ? REWARD_CARD_STYLE.edgeSelected : REWARD_CARD_STYLE.edge, selected ? 0.72 : 0.44);
    card.bg.strokeRoundedRect(0.5, 0.5, cardW - 1, cardH - 1, 24);

    const thumbSize = compact
      ? Math.max(38, Math.min(54, Math.round(cardW * 0.18)))
      : Math.max(46, Math.min(72, Math.round(cardW * 0.22)));
    const thumbX = compact ? 12 : 16;
    const thumbY = compact ? 12 : 16;
    card.thumbFrame.clear();
    card.thumbFrame.fillStyle(0x0d1f2f, 0.92);
    card.thumbFrame.fillRoundedRect(thumbX, thumbY, thumbSize, thumbSize, 13);
    card.thumbFrame.lineStyle(1, accentColor, selected ? 0.68 : 0.4);
    card.thumbFrame.strokeRoundedRect(thumbX, thumbY, thumbSize, thumbSize, 13);
    const thumbTextureKey = scene.ensureRewardThumbTexture(option);
    if (thumbTextureKey) {
      if (card.thumbImage.texture?.key !== thumbTextureKey) {
        card.thumbImage.setTexture(thumbTextureKey);
      }
      card.thumbImage.setPosition(thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5);
      card.thumbImage.setDisplaySize(thumbSize - 8, thumbSize - 8);
      card.thumbImage.setVisible(true);
      card.thumbGlyph.setVisible(false);
    } else {
      card.thumbImage.setVisible(false);
      card.thumbGlyph.setVisible(true);
      card.thumbGlyph.setPosition(thumbX + thumbSize * 0.5, thumbY + thumbSize * 0.5);
      card.thumbGlyph.setColor(toBrownThemeColorString(selected ? "#d8ecfd" : "#a9c1d4", REWARD_BROWN_THEME));
    }

    const textLeft = thumbX + thumbSize + 12;
    const rawName = String(option.name || "Relic").replace(/\s+/g, " ").trim();
    const nameSpace = Math.max(96, cardW - textLeft - 14);
    const nameCap = Math.max(10, Math.floor(nameSpace / 10.4));
    const compactName = rawName.length > nameCap ? `${rawName.slice(0, nameCap - 1).trimEnd()}…` : rawName;
    const nameFontSize = compact
      ? Phaser.Math.Clamp(Math.round(cardW * 0.064), 16, 22)
      : Phaser.Math.Clamp(Math.round(cardW * 0.075), 21, 28);
    card.name.setText(compactName);
    card.name.setFontSize(nameFontSize);
    card.rarity.setText((option.rarityLabel || "COMMON").toUpperCase());

    const rawDesc = String(option.description || "").replace(/\s+/g, " ").trim();
    const descTop = thumbY + thumbSize + (compact ? 10 : 14);
    const descW = Math.max(120, cardW - (compact ? 24 : 30));
    const claimH = compact ? 34 : 42;
    const claimY = cardH - claimH - (compact ? 10 : 16);
    const descFontSize = compact
      ? Phaser.Math.Clamp(Math.round(cardW * 0.042), 12, 14)
      : Phaser.Math.Clamp(Math.round(cardW * 0.046), 14, 17);
    const descLineHeight = descFontSize + (compact ? 3 : 4);
    const maxDescLines = Math.max(2, Math.floor((claimY - descTop - 12) / descLineHeight));
    const descCap = Math.max(36, Math.floor((descW / (descFontSize * 0.54)) * maxDescLines));
    const compactDesc = rawDesc.length > descCap ? `${rawDesc.slice(0, descCap - 1).trimEnd()}…` : rawDesc;
    card.desc.setText(compactDesc);
    card.desc.setFontSize(descFontSize);
    card.desc.setWordWrapWidth(descW, true);
    card.name.setColor(toBrownThemeColorString(selected ? "#f3f9ff" : "#dbeefd", REWARD_BROWN_THEME));
    card.rarity.setColor(toBrownThemeColorString(selected ? "#d9ecfb" : "#bfd7ea", REWARD_BROWN_THEME));
    card.desc.setColor(toBrownThemeColorString(selected ? "#d8e8f5" : "#c3d7ea", REWARD_BROWN_THEME));
    card.rarityPill.clear();
    card.rarityPill.fillStyle(selected ? REWARD_CARD_STYLE.pillSelected : REWARD_CARD_STYLE.pill, selected ? 0.9 : 0.75);
    const rarityW = Phaser.Math.Clamp(Math.round(card.rarity.width + 16), 64, compact ? 108 : 122);
    const rarityH = compact ? 18 : 22;
    card.rarityPill.fillRoundedRect(textLeft, thumbY + 3, rarityW, rarityH, Math.round(rarityH * 0.5));
    card.rarity.setPosition(textLeft + 10, thumbY + 14);
    card.rarity.setFontSize(compact ? 11 : 12);
    card.name.setPosition(textLeft, thumbY + (compact ? 33 : 42));
    card.desc.setPosition(compact ? 12 : 15, descTop);

    const claimX = compact ? 10 : 14;
    const claimW = cardW - (compact ? 20 : 28);
    const claimRadius = compact ? 17 : 21;
    card.claimPill.clear();
    card.claimPill.fillStyle(selected ? REWARD_CARD_STYLE.claimSelected : REWARD_CARD_STYLE.claim, claimEnabled ? 0.97 : 0.52);
    card.claimPill.fillRoundedRect(claimX, claimY, claimW, claimH, claimRadius);
    card.claimPill.fillStyle(0xffffff, claimEnabled ? 0.16 : 0.08);
    card.claimPill.fillRoundedRect(claimX + 1, claimY + 1, claimW - 2, compact ? 11 : 14, Math.max(10, claimRadius - 1));
    card.claimPill.lineStyle(1, 0x3e2a12, claimEnabled ? 0.36 : 0.16);
    card.claimPill.strokeRoundedRect(claimX, claimY, claimW, claimH, claimRadius);
    card.claimText.setPosition(claimX + claimW * 0.5, claimY + claimH * 0.5);
    card.claimText.setFontSize(compact ? 14 : 21);
    card.claimText.setColor(toBrownThemeColorString(claimEnabled ? "#2b1f11" : "#6f5f48", REWARD_BROWN_THEME));
    card.claimText.setText(claimEnabled ? "CLAIM" : "LOCKED");
    card.claimHit.setPosition(claimX, claimY);
    card.claimHit.setSize(claimW, claimH);
    card.claimEnabled = claimEnabled;

    if (card.claimHit.input) {
      card.claimHit.input.cursor = card.claimEnabled ? "pointer" : "default";
    }
    if (card.hitZone.input) {
      card.hitZone.input.cursor = "pointer";
    }
    card.hitZone.setSize(cardW, cardH);
    card.container.setVisible(true);
  });

  scene.cards.forEach((card, id) => {
    const exists = options.some((option) => option.id === id);
    if (!exists) {
      card.container.setVisible(false);
    }
  });
}
