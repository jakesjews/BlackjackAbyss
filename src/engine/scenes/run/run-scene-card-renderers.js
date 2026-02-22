import Phaser from "phaser";
import { applyBrownThemeToGraphics, toBrownThemeColorString } from "../ui/brown-theme.js";
import {
  RUN_CARD_BACKPLATE_KEY,
  RUN_CARD_DEAL_GAP_MS,
  RUN_CARD_SHADOW_KEY,
  RUN_DEALER_CARD_ENTRY_MS,
  RUN_DEALER_CARD_FLIP_MS,
  RUN_DEALER_CARD_FLIP_STRETCH,
  RUN_PARTICLE_KEY,
  SUIT_SYMBOL,
} from "./run-scene-config.js";
import {
  hasActiveRunSceneCardDealAnimations,
  isRunSceneCompactLayout,
  playRunSceneSfx,
} from "./run-scene-runtime-helpers.js";

export function drawRunSceneCards(scene, { snapshot, width, height, layout, theme }) {
  if (snapshot?.intro?.active) {
    scene.cardAnimSeen.clear();
    scene.cardFlipStates.clear();
    scene.cardHiddenStateBySlot.clear();
    scene.rowCardCountByPrefix.clear();
    scene.cardNodes.forEach((node) => node.container.setVisible(false));
    pruneRunSceneCardAnimations(scene);
    return { deferResolutionUi: false };
  }
  const enemyY = layout?.enemyY || Math.round(height * 0.26);
  const playerY = layout?.playerY || Math.round(height * 0.59);
  const cardWidth = layout?.cardWidth || 88;
  const cardHeight = layout?.cardHeight || Math.round(cardWidth * 1.42);
  const enemyCards = Array.isArray(snapshot.cards?.dealer) ? snapshot.cards.dealer : [];
  const playerCards = Array.isArray(snapshot.cards?.player) ? snapshot.cards.player : [];
  const compact = isRunSceneCompactLayout(width);
  const computeSpacing = (count) => {
    const base = Math.max(Math.round(cardWidth * (compact ? 0.68 : 0.74)), compact ? 32 : 44);
    if (!Number.isFinite(count) || count <= 1) {
      return base;
    }
    const maxSpan = Math.max(cardWidth, width - (compact ? 84 : 220));
    const cap = Math.floor((maxSpan - cardWidth) / Math.max(1, count - 1));
    const minSpacing = Math.max(Math.round(cardWidth * 0.38), compact ? 20 : 28);
    return Phaser.Math.Clamp(Math.min(base, cap), minSpacing, base);
  };
  const enemySpacing = computeSpacing(enemyCards.length);
  const playerSpacing = computeSpacing(playerCards.length);

  const enemyCenterX = width * 0.5;
  const playerCenterX = width * 0.5;
  const deckX = width * 0.5;
  const rowDrawOptions = {
    entryFlip: true,
    dealSequenceId: scene.cardDealSequenceId,
  };
  scene.cardAnimSeen.clear();
  const playerRevealInProgress = drawRunSceneCardRow(
    scene,
    "player-card",
    playerCards,
    playerCenterX,
    playerY,
    cardWidth,
    cardHeight,
    playerSpacing,
    { x: deckX, y: Math.min(height - 84, playerY + cardHeight + 120) },
    rowDrawOptions,
    theme
  );
  const enemyRevealInProgress = drawRunSceneCardRow(
    scene,
    "enemy-card",
    enemyCards,
    enemyCenterX,
    enemyY,
    cardWidth,
    cardHeight,
    enemySpacing,
    { x: deckX, y: Math.max(84, enemyY - 120) },
    rowDrawOptions,
    theme
  );
  pruneRunSceneCardAnimations(scene);

  const totals = snapshot.totals || {};
  const cardsAnimatingInProgress = Boolean(
    enemyRevealInProgress || playerRevealInProgress || hasActiveRunSceneCardDealAnimations(scene)
  );
  const deferResolutionUi = cardsAnimatingInProgress;
  const enemyHasHidden = enemyCards.some((card) => card.hidden);
  const enemyHandValue = Number.isFinite(totals.dealer) ? String(totals.dealer) : "?";
  const enemyTotalText = enemyHasHidden && Number.isFinite(totals.dealer) ? `Hand ${enemyHandValue} + ?` : `Hand ${enemyHandValue}`;
  const playerTotalText = Number.isFinite(totals.player) ? `Hand ${totals.player}` : "Hand ?";
  const handLabelScale = compact ? Phaser.Math.Clamp(width / 430, 0.68, 0.9) : 1;
  const handLabelGap = Math.max(10, Math.round((compact ? 20 : 24) * handLabelScale));
  const handLabelFontSize = Math.max(12, Math.round((compact ? 14 : 17) * handLabelScale));
  const cardsTopBound = Number.isFinite(layout?.cardsTopBound)
    ? Math.round(layout.cardsTopBound)
    : Math.round((layout?.enemyHpY || layout?.arenaY || 0) + (layout?.enemyHpH || 24) + 12);
  const cardsBottomBound = Number.isFinite(layout?.cardsBottomBound)
    ? Math.round(layout.cardsBottomBound)
    : Math.round((layout?.arenaBottom || height) - 12);
  const enemyLabelIdealY = enemyY - handLabelGap;
  const enemyLabelMinY = Math.round(cardsTopBound + Math.max(4, Math.round(6 * handLabelScale)));
  const enemyLabelMaxY = Math.round(enemyY - Math.max(6, Math.round(10 * handLabelScale)));
  const enemyLabelY = Phaser.Math.Clamp(
    enemyLabelIdealY,
    Math.min(enemyLabelMinY, enemyLabelMaxY),
    Math.max(enemyLabelMinY, enemyLabelMaxY)
  );
  const playerLabelIdealY = playerY + cardHeight + handLabelGap;
  const playerLabelMinY = Math.round(playerY + cardHeight + Math.max(8, Math.round(10 * handLabelScale)));
  const playerLabelMaxY = Math.round(cardsBottomBound - Math.max(4, Math.round(6 * handLabelScale)));
  const playerLabelY = Phaser.Math.Clamp(
    playerLabelIdealY,
    Math.min(playerLabelMinY, playerLabelMaxY),
    Math.max(playerLabelMinY, playerLabelMaxY)
  );
  if (!deferResolutionUi) {
    scene.drawText(
      "enemy-total",
      enemyTotalText,
      width * 0.5,
      enemyLabelY,
      {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: `${handLabelFontSize}px`,
        color: "#e0ccb0",
        fontStyle: compact ? "800" : "700",
      },
      { x: 0.5, y: 0.5 }
    );
  }
  if (!deferResolutionUi) {
    scene.drawText(
      "player-total",
      playerTotalText,
      width * 0.5,
      playerLabelY,
      {
        fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
        fontSize: `${handLabelFontSize}px`,
        color: "#e0ccb0",
        fontStyle: compact ? "800" : "700",
      },
      { x: 0.5, y: 0.5 }
    );
  }
  return { deferResolutionUi };
}

function drawRunSceneCardRow(
  scene,
  prefix,
  cards,
  centerX,
  y,
  cardW,
  cardH,
  spacing,
  spawn = null,
  options = null,
  theme = null
) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const used = new Set();
  const now = scene.time.now;
  const isDealerRow = prefix.startsWith("enemy");
  const rowDirection = isDealerRow ? -1 : 1;
  const baseSpawnX = Number.isFinite(spawn?.x) ? spawn.x : centerX;
  const baseSpawnY = Number.isFinite(spawn?.y) ? spawn.y : y + rowDirection * -104;
  const previousCount = Math.max(0, Math.round(scene.rowCardCountByPrefix.get(prefix) || 0));
  const customEntryDelayMs =
    options && typeof options.customEntryDelayMs === "function" ? options.customEntryDelayMs : null;
  const entryFlip = options?.entryFlip === undefined ? true : Boolean(options.entryFlip);
  const dealSequenceId = Number.isFinite(options?.dealSequenceId) ? Math.max(0, Math.round(options.dealSequenceId)) : 0;
  let rowRevealInProgress = false;
  const rowEntries = [];

  safeCards.forEach((card, idx) => {
    const key = `${prefix}-${idx}`;
    const currentlyHidden = Boolean(card.hidden);
    const previouslyHidden = scene.cardHiddenStateBySlot.get(key);
    if (isDealerRow && previouslyHidden === true && !currentlyHidden && !scene.cardFlipStates.has(key)) {
      const flipStart = Math.max(now, Number(scene.nextGlobalDealStartAt) || now);
      scene.cardFlipStates.set(key, {
        start: flipStart,
        duration: RUN_DEALER_CARD_FLIP_MS,
        cardSfxPlayed: false,
      });
      scene.nextGlobalDealStartAt = flipStart + RUN_DEALER_CARD_FLIP_MS + RUN_CARD_DEAL_GAP_MS;
    }
    scene.cardHiddenStateBySlot.set(key, currentlyHidden);
    const dealtAt = Number(card?.dealtAt);
    const dealtStamp = Number.isFinite(dealtAt) ? Math.max(0, Math.floor(dealtAt)) : -1;
    const animKey = `${prefix}-${idx}-${card.rank || "?"}-${card.suit || ""}-${card.hidden ? 1 : 0}-${dealSequenceId}-${dealtStamp}`;
    let anim = scene.cardAnimStates.get(animKey);
    if (!anim) {
      const isNewCard = idx >= previousCount;
      const customDelay = customEntryDelayMs ? Number(customEntryDelayMs(idx, card, prefix)) : NaN;
      let startTime = now;
      if (isNewCard) {
        const requested = Number.isFinite(customDelay) ? now + Math.max(0, customDelay) : now;
        const queuedStart = Math.max(requested, Number(scene.nextGlobalDealStartAt) || now);
        startTime = queuedStart;
        const queueGap = RUN_DEALER_CARD_ENTRY_MS + RUN_CARD_DEAL_GAP_MS;
        scene.nextGlobalDealStartAt = startTime + queueGap;
      } else if (Number.isFinite(customDelay)) {
        startTime = now + Math.max(0, customDelay);
      } else {
        // Existing cards should stay settled; only explicit flip states animate.
        startTime = now - RUN_DEALER_CARD_ENTRY_MS;
      }
      anim = {
        start: startTime,
        fromX: baseSpawnX + rowDirection * 14,
        fromY: baseSpawnY + idx * rowDirection * 5,
        entryFlip,
        cardSfxPlayed: false,
        lastSeen: now,
      };
      scene.cardAnimStates.set(animKey, anim);
    }
    anim.lastSeen = now;
    scene.cardAnimSeen.add(animKey);
    rowEntries.push({ card, idx, key, currentlyHidden, anim });
  });

  const startedEntries = rowEntries.filter((entry) => now >= entry.anim.start);
  const startedOrderByIdx = new Map();
  startedEntries.forEach((entry, order) => {
    startedOrderByIdx.set(entry.idx, order);
  });
  const displayCount = startedEntries.length;
  const displayWidth = displayCount > 0 ? cardW + Math.max(0, displayCount - 1) * spacing : cardW;
  const displayStartX = centerX - displayWidth * 0.5;

  rowEntries.forEach(({ card, idx, key, currentlyHidden, anim }) => {
    const startedOrder = startedOrderByIdx.get(idx);
    if (startedOrder === undefined) {
      rowRevealInProgress = true;
      used.add(key);
      const pendingNode = getRunSceneCardNode(scene, key, theme);
      pendingNode.container.setVisible(false);
      return;
    }

    const targetX = displayStartX + startedOrder * spacing;
    const targetCenterX = targetX + cardW * 0.5;
    const targetCenterY = y + cardH * 0.5;
    if (!anim.cardSfxPlayed) {
      playRunSceneSfx(scene, "card");
      anim.cardSfxPlayed = true;
    }

    const entryDurationMs = isDealerRow || anim.entryFlip ? RUN_DEALER_CARD_ENTRY_MS : 220;
    const progress = Phaser.Math.Clamp((now - anim.start) / entryDurationMs, 0, 1);
    if (progress < 1) {
      rowRevealInProgress = true;
    }
    const eased = Phaser.Math.Easing.Cubic.Out(progress);
    const arc = Math.sin(progress * Math.PI) * 16 * (rowDirection === -1 ? 1 : -1);
    const scale = 0.66 + Phaser.Math.Easing.Back.Out(progress) * 0.34;
    const drawCenterX = Phaser.Math.Linear(anim.fromX, targetCenterX, eased);
    const drawCenterY = Phaser.Math.Linear(anim.fromY, targetCenterY, eased) + arc * (1 - progress * 0.72);
    const baseDrawW = cardW * scale;
    const baseDrawH = cardH * scale;
    const flipState = isDealerRow ? scene.cardFlipStates.get(key) : null;
    const entryFlipActive = Boolean(anim.entryFlip && !(isDealerRow && currentlyHidden));
    let flipWidthScale = 1;
    let flipHeightScale = 1;
    let showBackHalf = false;
    let flipOffsetX = 0;
    let flipOffsetY = 0;
    let flipTilt = 0;
    if (entryFlipActive) {
      const flipStart = 0.22;
      const flipEnd = 0.8;
      if (progress < flipStart) {
        showBackHalf = true;
      } else if (progress < flipEnd) {
        const flipT = Phaser.Math.Clamp((progress - flipStart) / Math.max(0.001, flipEnd - flipStart), 0, 1);
        const flipEase = Phaser.Math.Easing.Sine.InOut(flipT);
        const flipWave = Math.sin(flipEase * Math.PI);
        const flipCos = Math.cos(flipEase * Math.PI);
        const side = idx % 2 === 0 ? 1 : -1;
        flipWidthScale *= Math.max(0.012, Math.abs(flipCos));
        flipHeightScale *= 1 + flipWave * 0.05;
        flipOffsetX += flipWave * (cardW * 0.07) * side;
        flipOffsetY += -flipWave * (cardH * (RUN_DEALER_CARD_FLIP_STRETCH * 0.42));
        flipTilt += flipWave * 0.14 * side;
        showBackHalf = flipEase < 0.5;
      }
    }
    if (flipState) {
      if (!flipState.cardSfxPlayed && now >= flipState.start) {
        playRunSceneSfx(scene, "card");
        flipState.cardSfxPlayed = true;
      }
      const duration = Math.max(120, Number(flipState.duration) || RUN_DEALER_CARD_FLIP_MS);
      const t = Phaser.Math.Clamp((now - flipState.start) / duration, 0, 1);
      if (t >= 1) {
        scene.cardFlipStates.delete(key);
      } else {
        rowRevealInProgress = true;
        const easedFlip = Phaser.Math.Easing.Sine.InOut(t);
        const wave = Math.sin(easedFlip * Math.PI);
        const flipCos = Math.cos(easedFlip * Math.PI);
        const side = idx % 2 === 0 ? 1 : -1;
        flipWidthScale = Math.max(0.012, Math.abs(flipCos));
        flipHeightScale = 1 + wave * 0.06;
        flipOffsetX = Math.sin(easedFlip * Math.PI) * (cardW * 0.08) * side;
        flipOffsetY = -wave * (cardH * (RUN_DEALER_CARD_FLIP_STRETCH * 0.5));
        flipTilt = Math.sin(easedFlip * Math.PI) * 0.16 * side;
        showBackHalf = easedFlip < 0.5;
      }
    }
    const drawW = Math.max(2, baseDrawW * flipWidthScale);
    const drawH = Math.max(12, baseDrawH * flipHeightScale);
    const cardCornerRadius = Math.max(4, Math.min(10 * scale * 0.75, drawW * 0.5, drawH * 0.5));
    const showBackFace = (currentlyHidden && isDealerRow) || showBackHalf;
    const drawAsHidden = currentlyHidden || showBackHalf;
    const node = getRunSceneCardNode(scene, key, theme);
    node.container.setDepth((isDealerRow ? 44 : 56) + idx);
    let finalCenterX = drawCenterX + flipOffsetX;
    let finalCenterY = drawCenterY + flipOffsetY;
    const settledCard = progress >= 1 && !flipState;
    if (settledCard && node.container.visible) {
      const previousX = Number(node.container.x);
      const previousY = Number(node.container.y);
      if (Number.isFinite(previousX) && Number.isFinite(previousY)) {
        const deltaRatio = Phaser.Math.Clamp((Number(scene.game?.loop?.delta) || 16.67) / 16.67, 0.5, 2);
        const moveLerp = Phaser.Math.Clamp(0.22 * deltaRatio, 0.12, 0.38);
        finalCenterX = Phaser.Math.Linear(previousX, finalCenterX, moveLerp);
        finalCenterY = Phaser.Math.Linear(previousY, finalCenterY, moveLerp);
      }
    }
    node.container.setPosition(finalCenterX, finalCenterY);
    node.container.setRotation(flipTilt);
    node.shadow.setDisplaySize(drawW * 1.1, drawH * 1.08);
    node.shadow.setPosition(-drawW * 0.25, 0);
    node.shadow.setAlpha(0.26 + (flipState ? 0.08 : 0));
    node.face.clear();
    const useDealerBackplate = showBackFace && scene.textures.exists(RUN_CARD_BACKPLATE_KEY);
    node.face.fillStyle(drawAsHidden ? (useDealerBackplate ? 0x17100a : 0x2a445c) : 0xf7fbff, 1);
    node.face.fillRoundedRect(-drawW * 0.5, -drawH * 0.5, drawW, drawH, cardCornerRadius);
    if (node.backplate) {
      if (useDealerBackplate) {
        node.backplate
          .setTexture(RUN_CARD_BACKPLATE_KEY)
          .setCrop()
          .setDisplaySize(drawW, drawH)
          .setPosition(0, 0)
          .setOrigin(0.5, 0.5)
          .setVisible(true);
        if (node.backMaskShape) {
          node.backMaskShape.clear();
          node.backMaskShape.fillStyle(0xffffff, 1);
          node.backMaskShape.fillRoundedRect(
            finalCenterX - drawW * 0.5,
            finalCenterY - drawH * 0.5,
            drawW,
            drawH,
            cardCornerRadius
          );
        }
      } else {
        node.backplate.setVisible(false);
        node.backplate.setCrop();
        if (node.backMaskShape) {
          node.backMaskShape.clear();
        }
      }
    }
    node.label.setFontSize(Math.max(12, Math.round(baseDrawW * 0.33)));
    node.label.setStyle({
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      align: "center",
      lineSpacing: 5,
      color: "#231f1b",
    });
    used.add(key);
    node.container.setVisible(true);

    const suitKey = card.suit || "";
    const suitSymbol = SUIT_SYMBOL[suitKey] || suitKey || "";
    const text = drawAsHidden ? "?" : `${card.rank || "?"}\n${suitSymbol}`;
    const suit = card.suit || "";
    const red = suit === "H" || suit === "D";
    const color = drawAsHidden ? "#d6e9f8" : red ? "#b44c45" : "#231f1b";
    if (useDealerBackplate) {
      node.label.setText("");
      node.label.setVisible(false);
    } else {
      node.label.setText(text);
      node.label.setColor(toBrownThemeColorString(color, theme));
      node.label.setVisible(true);
    }
  });

  scene.cardNodes.forEach((node, key) => {
    if (key.startsWith(prefix) && !used.has(key)) {
      node.container.setVisible(false);
    }
  });
  scene.rowCardCountByPrefix.set(prefix, safeCards.length);
  scene.cardFlipStates.forEach((_, key) => {
    if (key.startsWith(prefix) && !used.has(key)) {
      scene.cardFlipStates.delete(key);
    }
  });
  scene.cardHiddenStateBySlot.forEach((_, key) => {
    if (key.startsWith(prefix) && !used.has(key)) {
      scene.cardHiddenStateBySlot.delete(key);
    }
  });
  return rowRevealInProgress;
}

function getRunSceneCardNode(scene, key, theme = null) {
  let node = scene.cardNodes.get(key);
  if (node) {
    return node;
  }
  const container = scene.add.container(0, 0);
  const shadow = scene.add
    .image(0, 0, RUN_CARD_SHADOW_KEY)
    .setOrigin(0.5, 0.5)
    .setBlendMode(Phaser.BlendModes.NORMAL)
    .setAlpha(0.24);
  const face = applyBrownThemeToGraphics(scene.add.graphics(), theme);
  const backplate = scene.add
    .image(0, 0, scene.textures.exists(RUN_CARD_BACKPLATE_KEY) ? RUN_CARD_BACKPLATE_KEY : RUN_PARTICLE_KEY)
    .setVisible(false);
  const backMaskShape = scene.make.graphics({ x: 0, y: 0, add: false });
  const backMask = backMaskShape.createGeometryMask();
  backplate.setMask(backMask);
  const label = scene.add
    .text(0, 0, "", {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "28px",
      color: "#231f1b",
      align: "center",
      lineSpacing: 5,
    })
    .setOrigin(0.5, 0.5);
  container.add([shadow, face, backplate, label]);
  node = { container, shadow, face, backplate, label, backMaskShape, backMask };
  scene.cardNodes.set(key, node);
  return node;
}

export function pruneRunSceneCardAnimations(scene) {
  const now = scene.time.now;
  scene.cardAnimStates.forEach((state, key) => {
    if (!scene.cardAnimSeen.has(key) && now - (state.lastSeen || 0) > 80) {
      scene.cardAnimStates.delete(key);
    }
  });
}
