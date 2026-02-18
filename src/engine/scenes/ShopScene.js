import Phaser from "phaser";
import { BASE_HEIGHT, BASE_WIDTH, SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE, CARD_BUY_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";

const CARD_STYLE = Object.freeze({
  fill: 0x22384a,
  fillSelected: 0x2c475e,
  border: 0x9ec1d8,
  borderSelected: 0xf2d38e,
});

const BUTTON_STYLE = ACTION_BUTTON_STYLE;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.shop);
    this.graphics = null;
    this.textNodes = new Map();
    this.cards = new Map();
    this.buttons = new Map();
    this.lastCardSignature = "";
    this.keyboardHandlers = [];
    this.lastSnapshot = null;
  }

  create() {
    if (this.scale.gameSize.width !== BASE_WIDTH || this.scale.gameSize.height !== BASE_HEIGHT) {
      this.scale.resize(BASE_WIDTH, BASE_HEIGHT);
    }
    this.cameras.main.setBackgroundColor("#081420");
    this.cameras.main.setAlpha(0);
    this.graphics = this.add.graphics();
    this.bindKeyboardInput();
    this.scale.on("resize", this.onResize, this);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 240,
      ease: "Sine.easeInOut",
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  teardown() {
    this.scale.off("resize", this.onResize, this);
    this.keyboardHandlers.forEach(({ eventName, handler }) => {
      this.input.keyboard?.off(eventName, handler);
    });
    this.keyboardHandlers = [];
    this.cards.forEach((card) => card.container.destroy());
    this.cards.clear();
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();
    this.textNodes.forEach((text) => text.destroy());
    this.textNodes.clear();
    this.lastCardSignature = "";
  }

  update(time, delta) {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const adapter = runtime?.legacyAdapter || null;
    if (adapter) {
      adapter.tick(delta, time);
    }
    const snapshot = this.getSnapshot();
    this.lastSnapshot = snapshot;
    this.renderSnapshot(snapshot);
  }

  onResize() {
    if (this.lastSnapshot) {
      this.renderSnapshot(this.lastSnapshot);
    }
  }

  bindKeyboardInput() {
    if (!this.input.keyboard) {
      return;
    }
    const bind = (eventName, handler) => {
      this.input.keyboard.on(eventName, handler);
      this.keyboardHandlers.push({ eventName, handler });
    };

    bind("keydown-LEFT", () => this.invokeAction("prev"));
    bind("keydown-RIGHT", () => this.invokeAction("next"));
    bind("keydown-SPACE", (event) => {
      event.preventDefault();
      this.invokeAction("buy");
    });
    bind("keydown-ENTER", (event) => {
      event.preventDefault();
      this.invokeAction("continueRun");
    });
  }

  getShopApi() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const bridge = runtime?.legacyAdapter?.bridge || null;
    if (!bridge || typeof bridge.getShopApi !== "function") {
      return null;
    }
    return bridge.getShopApi();
  }

  getSnapshot() {
    const api = this.getShopApi();
    if (!api || typeof api.getSnapshot !== "function") {
      return null;
    }
    try {
      return api.getSnapshot();
    } catch {
      return null;
    }
  }

  invokeAction(actionName, value = undefined) {
    const api = this.getShopApi();
    const action = api ? api[actionName] : null;
    if (typeof action === "function") {
      action(value);
    }
  }

  renderSnapshot(snapshot) {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    this.graphics.clear();
    this.hideAllText();
    if (!snapshot) {
      this.rebuildCards([]);
      this.rebuildButtons([]);
      return;
    }

    this.drawBackground(width, height);
    this.drawHeader(snapshot, width);
    this.renderCards(snapshot, width, height);
    this.renderButtons(snapshot, width, height);
  }

  drawBackground(width, height) {
    this.graphics.fillGradientStyle(0x081420, 0x081420, 0x040b12, 0x040b12, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x000000, 0.38);
    this.graphics.fillRoundedRect(12, 10, width - 24, height - 20, 14);
    this.graphics.lineStyle(2, 0x3c6584, 0.33);
    this.graphics.strokeRoundedRect(12, 10, width - 24, height - 20, 14);
  }

  drawHeader(snapshot, width) {
    this.drawText("shop-title", "BLACK MARKET", width * 0.5, 52, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "38px",
      color: "#f6e6a6",
      stroke: "#0f1b28",
      strokeThickness: 5,
    });
    this.drawText("shop-subtitle", "ONE PURCHASE PER MARKET. CHOOSE CAREFULLY.", width * 0.5, 90, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "18px",
      color: "#b7ddff",
    });

    const run = snapshot.run || {};
    this.graphics.fillStyle(0x10263a, 0.9);
    this.graphics.fillRoundedRect(width * 0.5 - 250, 108, 500, 48, 12);
    this.graphics.lineStyle(1.6, 0x5f88aa, 0.34);
    this.graphics.strokeRoundedRect(width * 0.5 - 250, 108, 500, 48, 12);
    this.drawText("shop-chips", `CHIPS ${run.chips || 0}`, width * 0.5 - 112, 132, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "22px",
      color: "#f6e6a6",
    });
    this.drawText("shop-hp", `HP ${run.hp || 0}/${run.maxHp || 1}`, width * 0.5 + 112, 132, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "22px",
      color: "#c8f0d7",
    });
    if (run.shopPurchaseMade) {
      this.drawText("shop-status", "PURCHASE COMPLETE. CONTINUE WHEN READY.", width * 0.5, 170, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "16px",
        color: "#f6e6a6",
      });
    }
  }

  renderCards(snapshot, width, height) {
    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    this.rebuildCards(items);
    const cardW = Math.max(216, Math.min(320, Math.round(width * 0.24)));
    const cardH = Math.max(312, Math.min(410, Math.round(height * 0.56)));
    const gap = Math.max(20, Math.round(width * 0.024));
    const totalW = items.length * cardW + Math.max(0, items.length - 1) * gap;
    const startX = width * 0.5 - totalW * 0.5;
    const y = Math.max(190, Math.round(height * 0.26));

    items.forEach((item, index) => {
      const card = this.cards.get(item.id);
      if (!card) {
        return;
      }
      const x = startX + index * (cardW + gap);
      const selected = Boolean(item.selected);
      card.currentIndex = index;
      card.container.setPosition(x, y);
      card.bg.width = cardW;
      card.bg.height = cardH;
      card.bg.radius = 16;
      card.descPanel.setSize(Math.max(130, cardW - 28), Math.max(126, cardH - 172));
      card.bg.setFillStyle(selected ? CARD_STYLE.fillSelected : CARD_STYLE.fill, selected ? 0.98 : 0.92);
      card.bg.setStrokeStyle(2.1, selected ? CARD_STYLE.borderSelected : CARD_STYLE.border, selected ? 0.82 : 0.5);
      card.type.setText(String(item.type || "SERVICE").toUpperCase());
      card.name.setText(item.name || "Item");
      card.desc.setText(item.description || "");
      card.desc.setWordWrapWidth(Math.max(130, cardW - 34));
      card.cost.setText(`COST ${item.cost || 0}`);

      const purchaseLocked = Boolean(snapshot.run?.shopPurchaseMade);
      const sold = Boolean(item.sold);
      const buyEnabled = Boolean(item.canBuy);
      card.buyEnabled = buyEnabled;
      const buyButtonWidth = Math.max(130, cardW - 26);
      setGradientButtonSize(card.buyButton, buyButtonWidth, 44);
      card.buyButton.container.setPosition(cardW * 0.5, cardH - 28);
      card.cost.setPosition(cardW * 0.5, cardH - 68);

      if (sold) {
        card.buyButton.enabled = false;
        card.buyButton.text.setText("SOLD");
        this.applyBuyButtonStyle(card.buyButton, "sold");
      } else if (purchaseLocked) {
        card.buyButton.enabled = false;
        card.buyButton.text.setText("LOCKED");
        this.applyBuyButtonStyle(card.buyButton, "locked");
      } else if (buyEnabled) {
        card.buyButton.enabled = true;
        card.buyButton.text.setText("BUY");
        this.applyBuyButtonStyle(card.buyButton, "idle");
      } else {
        card.buyButton.enabled = false;
        card.buyButton.text.setText("NEED CHIPS");
        this.applyBuyButtonStyle(card.buyButton, "warn");
      }
      card.type.setColor(selected ? "#f8e7b8" : "#cde4f6");
      card.name.setColor(sold ? "#9aa8b7" : selected ? "#f1f8ff" : "#dceefe");
      card.desc.setColor(sold ? "#a0afbe" : selected ? "#eef7ff" : "#d9ecfb");
      card.cost.setColor(sold ? "#aab6c4" : "#f8e7b8");
      card.descPanel.setFillStyle(0x0a1520, selected ? 0.42 : 0.34);
      card.container.setVisible(true);

      const accent = item.type === "RELIC" ? 0x6d9fce : 0x6ca57f;
      this.graphics.fillStyle(accent, selected ? 0.82 : 0.5);
      this.graphics.fillRoundedRect(x + 12, y + 14, cardW - 24, 8, 4);
    });

    this.cards.forEach((card, id) => {
      const exists = items.some((item) => item.id === id);
      if (!exists) {
        card.container.setVisible(false);
      }
    });
  }

  renderButtons(snapshot, width, height) {
    const hasItems = Array.isArray(snapshot.items) && snapshot.items.length > 0;
    const actions = [
      { id: "prev", label: "LEFT", enabled: hasItems },
      { id: "next", label: "RIGHT", enabled: hasItems },
      { id: "buy", label: "BUY", enabled: Boolean(snapshot.canBuySelected) },
      { id: "continueRun", label: "CONTINUE", enabled: true },
    ];
    this.rebuildButtons(actions);
    const buttonW = Math.max(150, Math.min(220, Math.round(width * 0.16)));
    const buttonH = Math.max(56, Math.min(68, Math.round(height * 0.09)));
    const gap = Math.max(12, Math.round(width * 0.015));
    const totalW = actions.length * buttonW + (actions.length - 1) * gap;
    const startX = width * 0.5 - totalW * 0.5 + buttonW * 0.5;
    const y = Math.min(height - 36, height * 0.91);

    actions.forEach((action, index) => {
      const button = this.buttons.get(action.id);
      if (!button) {
        return;
      }
      button.container.setPosition(startX + index * (buttonW + gap), y);
      setGradientButtonSize(button, buttonW, buttonH);
      button.text.setFontSize(Math.max(22, Math.round(buttonH * 0.4)));
      button.text.setText(action.label);
      button.enabled = action.enabled;
      this.applyButtonStyle(button, action.enabled ? "idle" : "disabled");
      button.container.setVisible(true);
    });
  }

  rebuildCards(items) {
    const signature = items.map((item) => item.id).join("|");
    if (signature === this.lastCardSignature) {
      return;
    }
    this.lastCardSignature = signature;
    this.cards.forEach((card) => card.container.destroy());
    this.cards.clear();

    items.forEach((item, index) => {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 250, 340, CARD_STYLE.fill, 0.94).setOrigin(0, 0);
      bg.setStrokeStyle(2, CARD_STYLE.border, 0.52);
      const type = this.add
        .text(14, 24, "SERVICE", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "17px",
          color: "#cde4f6",
          stroke: "#09121a",
          strokeThickness: 2,
        })
        .setOrigin(0, 0.5);
      const name = this.add
        .text(14, 58, item.name || "Item", {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "29px",
          color: "#dceefe",
          stroke: "#08131d",
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5);
      const descPanel = this.add.rectangle(14, 92, 222, 174, 0x0a1520, 0.34).setOrigin(0, 0);
      descPanel.setStrokeStyle(1.2, 0x88acc4, 0.24);
      const desc = this.add
        .text(14, 96, item.description || "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "20px",
          color: "#d9ecfb",
          stroke: "#08121a",
          strokeThickness: 1,
          wordWrap: { width: 220 },
          lineSpacing: 7,
        })
        .setOrigin(0, 0);
      const cost = this.add
        .text(125, 270, `COST ${item.cost || 0}`, {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "18px",
          color: "#f8e7b8",
          stroke: "#09121a",
          strokeThickness: 2,
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
        buyEnabled: false,
      };
      const buyButton = createGradientButton(this, {
        id: `buy-${item.id}`,
        label: "BUY",
        styleSet: CARD_BUY_BUTTON_STYLE,
        onPress: () => {
          if (!card.buyEnabled) {
            return;
          }
          this.invokeAction("buy", card.currentIndex);
        },
        width: 220,
        height: 44,
        fontSize: 20,
      });
      buyButton.container.setPosition(125, 310);
      card.buyButton = buyButton;

      container.add([bg, type, name, descPanel, desc, cost, buyButton.container]);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.invokeAction("selectIndex", card.currentIndex));

      this.cards.set(item.id, card);
    });
  }

  rebuildButtons(actions) {
    const expected = new Set(actions.map((entry) => entry.id));
    this.buttons.forEach((button, id) => {
      if (!expected.has(id)) {
        button.container.destroy();
        this.buttons.delete(id);
      }
    });

    actions.forEach((action) => {
      if (this.buttons.has(action.id)) {
        return;
      }
      const button = createGradientButton(this, {
        id: action.id,
        label: action.label,
        styleSet: BUTTON_STYLE,
        onPress: () => this.invokeAction(action.id),
        width: 210,
        height: 64,
        fontSize: 28,
      });
      this.buttons.set(action.id, button);
    });
  }

  applyButtonStyle(button, styleName) {
    applyGradientButtonStyle(button, styleName);
  }

  applyBuyButtonStyle(button, styleName) {
    applyGradientButtonStyle(button, styleName);
  }

  hideAllText() {
    this.textNodes.forEach((text) => text.setVisible(false));
  }

  drawText(key, value, x, y, style, origin = { x: 0.5, y: 0.5 }) {
    let node = this.textNodes.get(key);
    if (!node) {
      node = this.add.text(x, y, value, style).setOrigin(origin.x, origin.y);
      this.textNodes.set(key, node);
    } else {
      node.setStyle(style);
      node.setOrigin(origin.x, origin.y);
    }
    node.setPosition(x, y);
    node.setText(value);
    node.setVisible(true);
    return node;
  }
}
