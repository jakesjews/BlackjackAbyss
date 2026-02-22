import Phaser from "phaser";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "../ui/gradient-button.js";
import { placeModalCloseButton } from "../ui/modal-ui.js";
import {
  applyBrownThemeToGraphics,
  toBrownThemeColorNumber,
  toBrownThemeColorString,
} from "../ui/brown-theme.js";
import { resolveDarkIconTexture } from "../ui/texture-processing.js";
import {
  SHOP_BROWN_THEME,
  SHOP_BUTTON_STYLE,
  SHOP_BUY_ICON_KEY,
  SHOP_CARD_STYLE,
  SHOPKEEPER_DIALOGUE_VARIANTS,
} from "./shop-scene-config.js";
import { ensureShopScenePanelCloseButton } from "./shop-scene-modal-renderers.js";

export function rebuildShopSceneCards(scene, items) {
  const signature = items.map((item) => item.id).join("|");
  if (signature === scene.lastCardSignature) {
    return;
  }
  scene.lastCardSignature = signature;

  scene.cards.forEach((card) => card.container.destroy());
  scene.cards.clear();

  items.forEach((item, index) => {
    const container = scene.add.container(0, 0);
    const bg = scene.add.graphics();
    applyBrownThemeToGraphics(bg, SHOP_BROWN_THEME);

    const type = scene.add
      .text(14, 24, "SERVICE", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "17px",
        color: toBrownThemeColorString("#cde4f6", SHOP_BROWN_THEME),
      })
      .setOrigin(0, 0.5);

    const name = scene.add
      .text(14, 58, item.name || "Item", {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "29px",
        color: toBrownThemeColorString("#dceefe", SHOP_BROWN_THEME),
      })
      .setOrigin(0, 0.5);

    const descPanel = scene.add
      .rectangle(14, 92, 222, 174, toBrownThemeColorNumber(0x0a1520, SHOP_BROWN_THEME), 0.34)
      .setOrigin(0, 0);

    const desc = scene.add
      .text(14, 96, item.description || "", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "20px",
        color: toBrownThemeColorString("#d9ecfb", SHOP_BROWN_THEME),
        wordWrap: { width: 220 },
        lineSpacing: 7,
      })
      .setOrigin(0, 0);

    const cost = scene.add
      .text(125, 270, `${item.cost || 0}`, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "20px",
        color: toBrownThemeColorString("#f8e7b8", SHOP_BROWN_THEME),
        fontStyle: "700",
      })
      .setOrigin(0.5, 0.5);

    const card = {
      id: item.id,
      currentIndex: index,
      container,
      bg,
      type,
      name,
      descPanel,
      desc,
      cost,
      buyButton: null,
      buyIcon: null,
      buyShortcut: null,
      buyEnabled: false,
    };

    const buyButton = createGradientButton(scene, {
      id: `buy-${item.id}`,
      label: "BUY",
      styleSet: SHOP_BUTTON_STYLE,
      onPress: () => {
        if (!card.buyEnabled) {
          return;
        }
        scene.invokeAction("buy", card.currentIndex);
      },
      width: 220,
      height: 50,
      fontSize: 18,
    });
    buyButton.hitZone.on("pointerover", () => scene.handleCardHover(card.currentIndex));
    buyButton.hitZone.on("pointerdown", () => scene.handleCardHover(card.currentIndex));
    buyButton.container.setPosition(125, 310);

    const buyIcon = scene.add
      .image(0, 0, resolveDarkIconTexture(scene, SHOP_BUY_ICON_KEY, scene.darkIconTextureBySource))
      .setDisplaySize(33, 33)
      .setAlpha(0.92);

    const buyShortcut = scene.add
      .text(0, 0, "Z", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "13px",
        color: "#000000",
        fontStyle: "700",
      })
      .setOrigin(1, 0.5)
      .setAlpha(0.58);

    buyButton.container.add([buyIcon, buyShortcut]);
    card.buyIcon = buyIcon;
    card.buyShortcut = buyShortcut;
    card.buyButton = buyButton;

    container.add([bg, type, name, descPanel, desc, cost]);

    const cardHit = scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    cardHit.on("pointerover", () => scene.handleCardHover(card.currentIndex));
    cardHit.on("pointerdown", () => scene.invokeAction("selectIndex", card.currentIndex));
    container.add(cardHit);
    container.add(buyButton.container);
    card.hitZone = cardHit;

    scene.cards.set(item.id, card);
  });
}

export function renderShopSceneCards(scene, { snapshot, width, height }) {
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  rebuildShopSceneCards(scene, items);
  const showKeyboardHints = scene.shouldShowKeyboardHints(width);

  if (!scene.shopOpen) {
    scene.cards.forEach((card) => card.container.setVisible(false));
    if (scene.shopCloseButton) {
      scene.shopCloseButton.container.setVisible(false);
    }
    if (scene.shopListMaskShape) {
      scene.shopListMaskShape.clear();
    }
    scene.cards.forEach((card) => {
      card.container.clearMask();
    });
    return;
  }

  if (!scene.shopDialogueText) {
    scene.pickShopDialogue();
  }

  const compact = scene.isCompactLayout(width);
  const bottomLimit = (scene.bottomBarRect?.y || (height - 90)) - 10;
  const panelX = compact ? 12 : 16;
  const panelY = compact ? Math.max(142, Math.round(height * 0.19)) : Math.max(154, Math.round(height * 0.205));
  const maxPanelW = Math.max(220, width - panelX * 2);
  const panelW = compact
    ? maxPanelW
    : Phaser.Math.Clamp(Math.round(width * 0.335), Math.min(308, maxPanelW), Math.min(460, maxPanelW));
  const panelH = Math.max(120, bottomLimit - panelY);
  const panelRadius = 18;

  scene.graphics.fillStyle(0x100906, 0.94);
  scene.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, panelRadius);
  scene.graphics.lineStyle(1.35, 0x6a5238, 0.56);
  scene.graphics.strokeRoundedRect(panelX, panelY, panelW, panelH, panelRadius);
  scene.graphics.fillStyle(0x000000, 0.22);
  scene.graphics.fillRoundedRect(panelX + 1, panelY + 1, panelW - 2, 46, panelRadius - 2);

  const panelTitleFont = compact ? "22px" : "27px";
  scene.drawText("shop-panel-title", "CAMP STORE", panelX + 16, panelY + 24, {
    fontFamily: '"Chakra Petch", "Sora", sans-serif',
    fontSize: panelTitleFont,
    color: "#f6e6a6",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });

  const shopCloseButton = ensureShopScenePanelCloseButton(scene);
  placeModalCloseButton(shopCloseButton, {
    x: panelX + panelW - 20,
    y: panelY + 24,
    depth: 130,
    width: 34,
    height: 30,
    iconSize: 13,
    enabled: true,
    visible: true,
    styleName: "idle",
    applyStyle: (button, styleName) => applyGradientButtonStyle(button, styleName),
  });

  const rightColumnX = panelX + panelW + 16;
  const rightColumnW = Math.max(0, width - rightColumnX - 16);
  const dialogueInsidePanel = compact || rightColumnW < 180;
  const dialogueX = dialogueInsidePanel ? panelX + 12 : rightColumnX;
  const dialogueW = dialogueInsidePanel
    ? Math.max(140, panelW - 24)
    : Phaser.Math.Clamp(rightColumnW, 160, 420);
  const dialogueY = dialogueInsidePanel ? panelY + 54 : panelY + 10;
  const dialogueH = dialogueInsidePanel
    ? Phaser.Math.Clamp(Math.round(panelH * (compact ? 0.22 : 0.18)), 74, 112)
    : Math.min(124, Math.max(90, Math.round(panelH * 0.25)));

  scene.graphics.fillStyle(0x110a07, 0.9);
  scene.graphics.fillRoundedRect(dialogueX, dialogueY, dialogueW, dialogueH, 14);
  scene.graphics.lineStyle(1.2, 0x614b34, 0.5);
  scene.graphics.strokeRoundedRect(dialogueX, dialogueY, dialogueW, dialogueH, 14);

  scene.drawText("shopkeeper-label", "SHOPKEEPER", dialogueX + 14, dialogueY + 18, {
    fontFamily: '"Chakra Petch", "Sora", sans-serif',
    fontSize: compact ? "14px" : "16px",
    color: "#f2cd88",
    fontStyle: "700",
  }, { x: 0, y: 0.5 });

  scene.drawText("shopkeeper-dialogue", scene.shopDialogueText || SHOPKEEPER_DIALOGUE_VARIANTS[0], dialogueX + 14, dialogueY + 32, {
    fontFamily: '"Sora", "Segoe UI", sans-serif',
    fontSize: compact ? "13px" : "16px",
    color: "#dcc7a6",
    lineSpacing: compact ? 2 : 4,
    wordWrap: { width: Math.max(120, dialogueW - 28) },
  }, { x: 0, y: 0 });

  const listPadX = compact ? 10 : 12;
  const listTop = dialogueInsidePanel ? dialogueY + dialogueH + 10 : panelY + 56;
  const listBottom = panelY + panelH - 12;
  const listH = Math.max(96, listBottom - listTop);
  const cardW = panelW - listPadX * 2;
  const listX = panelX + listPadX;
  if (scene.shopListMaskShape) {
    scene.shopListMaskShape.clear();
    scene.shopListMaskShape.fillStyle(0xffffff, 1);
    scene.shopListMaskShape.fillRect(listX, listTop, cardW, listH);
  }

  let gap = compact ? 8 : 10;
  const count = Math.max(1, items.length);
  let cardH = Math.floor((listH - gap * Math.max(0, count - 1)) / count);
  cardH = Phaser.Math.Clamp(cardH, compact ? 88 : 104, compact ? 168 : 188);
  let stackH = count * cardH + Math.max(0, count - 1) * gap;
  if (stackH > listH) {
    cardH = Math.max(compact ? 68 : 84, Math.floor((listH - gap * Math.max(0, count - 1)) / count));
    stackH = count * cardH + Math.max(0, count - 1) * gap;
  }
  if (stackH > listH && gap > 4) {
    gap = 4;
    cardH = Math.max(compact ? 66 : 80, Math.floor((listH - gap * Math.max(0, count - 1)) / count));
    stackH = count * cardH + Math.max(0, count - 1) * gap;
  }
  const startY = listTop + Math.max(0, Math.round((listH - stackH) * 0.5));

  items.forEach((item, index) => {
    const card = scene.cards.get(item.id);
    if (!card) {
      return;
    }
    const x = listX;
    const y = startY + index * (cardH + gap);
    const selectedIndex = scene.resolveSelectedIndex(snapshot);
    const selected = index === selectedIndex;
    card.currentIndex = index;
    card.container.setPosition(x, y);
    card.bg.clear();
    card.bg.fillStyle(
      toBrownThemeColorNumber(selected ? SHOP_CARD_STYLE.fillSelected : SHOP_CARD_STYLE.fill, SHOP_BROWN_THEME),
      selected ? 0.98 : 0.9
    );
    card.bg.fillRoundedRect(0, 0, cardW, cardH, 18);
    card.bg.fillStyle(0xffffff, selected ? 0.06 : 0.03);
    card.bg.fillRoundedRect(1, 1, cardW - 2, Math.max(30, Math.round(cardH * 0.22)), 18);

    const cardPadX = Phaser.Math.Clamp(Math.round(cardW * 0.045), 12, 18);
    const buttonH = Phaser.Math.Clamp(Math.round(cardH * 0.3), compact ? 34 : 40, 52);
    const buttonBottomPad = Phaser.Math.Clamp(Math.round(cardH * 0.07), 6, 12);
    const buttonY = cardH - Math.round(buttonH * 0.5) - buttonBottomPad;
    const costGap = Phaser.Math.Clamp(Math.round(cardH * 0.08), 10, 18);
    const costY = buttonY - Math.round(buttonH * 0.5) - costGap;
    const typeY = Phaser.Math.Clamp(Math.round(cardH * 0.13), 16, 26);
    const nameY = typeY + Phaser.Math.Clamp(Math.round(cardH * 0.15), 20, 36);
    const descTop = nameY + Phaser.Math.Clamp(Math.round(cardH * 0.09), 10, 16);
    const descBottom = costY - Phaser.Math.Clamp(Math.round(cardH * 0.07), 8, 14);
    const descHeight = Math.max(20, descBottom - descTop);
    const descPanelW = Math.max(120, cardW - cardPadX * 2);

    card.descPanel.setPosition(cardPadX, descTop);
    card.descPanel.setSize(descPanelW, descHeight);
    card.descPanel.setFillStyle(toBrownThemeColorNumber(0x0b1622, SHOP_BROWN_THEME), selected ? 0.26 : 0.2);
    card.desc.setPosition(cardPadX, descTop + 4);
    card.type.setText(String(item.type || "SERVICE").toUpperCase());
    card.type.setPosition(cardPadX, typeY);
    card.name.setText(item.name || "Item");
    card.name.setPosition(cardPadX, nameY);
    card.desc.setText(item.description || "");
    card.desc.setWordWrapWidth(Math.max(120, descPanelW - 8));

    const typeFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.11), 12, 17);
    const nameFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.145), 18, 30);
    const descFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.098), 12, 19);
    const costFontSize = Phaser.Math.Clamp(Math.round(cardH * 0.112), 14, 22);
    card.type.setFontSize(typeFontSize);
    card.type.setFontStyle("700");
    card.name.setFontSize(nameFontSize);
    card.name.setFontStyle("700");
    card.desc.setFontSize(descFontSize);
    card.desc.setLineSpacing(Math.max(2, Math.round(descFontSize * 0.2)));
    card.cost.setFontSize(costFontSize);
    card.cost.setText(`${item.cost || 0}`);
    card.cost.setPosition(cardW * 0.5, costY);

    const purchaseLocked = Boolean(snapshot.run?.shopPurchaseMade);
    const sold = Boolean(item.sold);
    const buyEnabled = Boolean(item.canBuy);
    card.buyEnabled = buyEnabled;
    const buyButtonWidth = Math.max(128, cardW - cardPadX * 2);
    const buyButtonHeight = buttonH;
    setGradientButtonSize(card.buyButton, buyButtonWidth, buyButtonHeight);
    card.buyButton.container.setPosition(cardW * 0.5, buttonY);

    if (sold) {
      card.buyButton.enabled = false;
      card.buyButton.text.setText("SOLD");
      applyGradientButtonStyle(card.buyButton, "disabled");
    } else if (purchaseLocked) {
      card.buyButton.enabled = false;
      card.buyButton.text.setText("LOCKED");
      applyGradientButtonStyle(card.buyButton, "disabled");
    } else if (buyEnabled) {
      card.buyButton.enabled = true;
      card.buyButton.text.setText("BUY");
      applyGradientButtonStyle(card.buyButton, "idle");
    } else {
      card.buyButton.enabled = false;
      card.buyButton.text.setText("NEED CHIPS");
      applyGradientButtonStyle(card.buyButton, "disabled");
    }

    card.buyButton.container.setAlpha(card.buyButton.enabled ? 1 : 0.86);
    const buyLabelFontSize = Phaser.Math.Clamp(Math.round(buyButtonHeight * 0.36), 13, 18);
    card.buyButton.text.setFontSize(buyLabelFontSize);
    card.buyButton.text.setOrigin(0, 0.5);
    card.buyButton.text.setAlign("left");
    card.buyButton.text.setPosition(-buyButtonWidth * 0.5 + Math.max(34, Math.round(buyButtonHeight * 0.9)), 0);

    if (card.buyIcon) {
      card.buyIcon.setTexture(resolveDarkIconTexture(scene, SHOP_BUY_ICON_KEY, scene.darkIconTextureBySource));
      const buyIconSize = Phaser.Math.Clamp(Math.round(buyButtonHeight * 0.66), 18, 33);
      card.buyIcon.setDisplaySize(buyIconSize, buyIconSize);
      card.buyIcon.setPosition(-buyButtonWidth * 0.5 + Math.max(16, Math.round(buyButtonHeight * 0.44)), 0);
      card.buyIcon.setVisible(true);
    }

    if (card.buyShortcut) {
      card.buyShortcut.setText("Z");
      card.buyShortcut.setFontSize(Phaser.Math.Clamp(Math.round(buyButtonHeight * 0.24), 10, 13));
      card.buyShortcut.setColor("#000000");
      card.buyShortcut.setAlpha(card.buyButton.enabled ? 0.58 : 0.46);
      card.buyShortcut.setPosition(buyButtonWidth * 0.5 - Math.max(12, Math.round(buyButtonHeight * 0.3)), 0);
      card.buyShortcut.setVisible(showKeyboardHints);
    }

    card.type.setColor(toBrownThemeColorString(selected ? "#f8e7b8" : "#cde4f6", SHOP_BROWN_THEME));
    card.name.setColor(toBrownThemeColorString(sold ? "#9aa8b7" : selected ? "#f1f8ff" : "#dceefe", SHOP_BROWN_THEME));
    card.desc.setColor(toBrownThemeColorString(sold ? "#a0afbe" : selected ? "#eef7ff" : "#d9ecfb", SHOP_BROWN_THEME));
    card.cost.setColor(toBrownThemeColorString(sold ? "#aab6c4" : "#f8e7b8", SHOP_BROWN_THEME));

    if (card.hitZone) {
      card.hitZone.setPosition(0, 0);
      card.hitZone.setSize(cardW, cardH);
      const hitArea = card.hitZone.input?.hitArea;
      if (hitArea && typeof hitArea.setTo === "function") {
        hitArea.setTo(0, 0, cardW, cardH);
      }
    }

    if (scene.shopListMask) {
      card.container.setMask(scene.shopListMask);
    } else {
      card.container.clearMask();
    }
    card.container.setVisible(true);
  });

  scene.cards.forEach((card, id) => {
    const exists = items.some((item) => item.id === id);
    if (!exists) {
      card.container.clearMask();
      card.container.setVisible(false);
    }
  });
}
