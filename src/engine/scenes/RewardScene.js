import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";

const CARD_STYLE = Object.freeze({
  fill: 0x22384a,
  fillSelected: 0x2c475e,
  border: 0x9ec1d8,
  borderSelected: 0xf2d38e,
});

const BUTTON_STYLE = ACTION_BUTTON_STYLE;

export class RewardScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.reward);
    this.graphics = null;
    this.textNodes = new Map();
    this.cards = new Map();
    this.buttons = new Map();
    this.lastSignature = "";
    this.keyboardHandlers = [];
    this.lastSnapshot = null;
  }

  create() {
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
    this.lastSignature = "";
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
    bind("keydown-ENTER", () => this.invokeAction("claim"));
    bind("keydown-SPACE", (event) => {
      event.preventDefault();
      this.invokeAction("claim");
    });
  }

  getRewardApi() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const bridge = runtime?.legacyAdapter?.bridge || null;
    if (!bridge || typeof bridge.getRewardApi !== "function") {
      return null;
    }
    return bridge.getRewardApi();
  }

  getSnapshot() {
    const api = this.getRewardApi();
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
    const api = this.getRewardApi();
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
    this.graphics.fillStyle(0x000000, 0.36);
    this.graphics.fillRoundedRect(12, 10, width - 24, height - 20, 14);
    this.graphics.lineStyle(2, 0x3c6584, 0.33);
    this.graphics.strokeRoundedRect(12, 10, width - 24, height - 20, 14);
  }

  drawHeader(snapshot, width) {
    this.drawText("reward-title", "CHOOSE A RELIC", width * 0.5, 52, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "36px",
      color: "#f6e6a6",
      stroke: "#0f1b28",
      strokeThickness: 5,
    });
    const run = snapshot.run || {};
    this.drawText("reward-chips", `CHIPS ${run.chips || 0}`, width * 0.5, 90, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "22px",
      color: "#dbeaf7",
    });
  }

  renderCards(snapshot, width, height) {
    const options = Array.isArray(snapshot.options) ? snapshot.options : [];
    this.rebuildCards(options);
    const cardW = Math.max(220, Math.min(320, Math.round(width * 0.24)));
    const cardH = Math.max(280, Math.min(390, Math.round(height * 0.54)));
    const gap = Math.max(24, Math.round(width * 0.03));
    const totalW = options.length * cardW + Math.max(0, options.length - 1) * gap;
    const startX = width * 0.5 - totalW * 0.5;
    const y = Math.max(128, Math.round(height * 0.18));

    options.forEach((option, index) => {
      const card = this.cards.get(option.id);
      if (!card) {
        return;
      }
      const x = startX + index * (cardW + gap);
      card.container.setPosition(x, y);
      card.bg.width = cardW;
      card.bg.height = cardH;
      card.bg.radius = 16;
      card.descPanel.setSize(Math.max(140, cardW - 28), Math.max(120, cardH - 116));
      const selected = Boolean(option.selected);
      card.bg.setFillStyle(selected ? CARD_STYLE.fillSelected : CARD_STYLE.fill, selected ? 0.98 : 0.92);
      card.bg.setStrokeStyle(2.2, selected ? CARD_STYLE.borderSelected : CARD_STYLE.border, selected ? 0.82 : 0.48);
      card.name.setText(option.name || "Relic");
      card.rarity.setText((option.rarityLabel || "COMMON").toUpperCase());
      card.desc.setText(option.description || "");
      card.desc.setWordWrapWidth(Math.max(120, cardW - 34));
      card.name.setColor(selected ? "#f3f9ff" : "#dbeefd");
      card.rarity.setColor(selected ? "#f8e7b8" : "#cde4f6");
      card.desc.setColor(selected ? "#eef7ff" : "#d9ecfb");
      card.descPanel.setFillStyle(0x0a1520, selected ? 0.42 : 0.34);
      card.container.setVisible(true);

      const accentColor = Phaser.Display.Color.HexStringToColor(option.color || "#c8d7a1").color;
      this.graphics.fillStyle(accentColor, selected ? 0.88 : 0.52);
      this.graphics.fillRoundedRect(x + 12, y + 14, cardW - 24, 8, 4);
    });

    this.cards.forEach((card, id) => {
      const exists = options.some((option) => option.id === id);
      if (!exists) {
        card.container.setVisible(false);
      }
    });
  }

  renderButtons(snapshot, width, height) {
    const hasOptions = Array.isArray(snapshot.options) && snapshot.options.length > 0;
    const actions = [
      { id: "prev", label: "LEFT", enabled: hasOptions },
      { id: "next", label: "RIGHT", enabled: hasOptions },
      { id: "claim", label: "CLAIM", enabled: Boolean(snapshot.canClaim) },
    ];
    this.rebuildButtons(actions);
    const buttonW = Math.max(170, Math.min(230, Math.round(width * 0.17)));
    const buttonH = Math.max(58, Math.min(72, Math.round(height * 0.1)));
    const gap = Math.max(16, Math.round(width * 0.02));
    const totalW = actions.length * buttonW + (actions.length - 1) * gap;
    const startX = width * 0.5 - totalW * 0.5 + buttonW * 0.5;
    const y = Math.min(height - 40, height * 0.88);

    actions.forEach((action, index) => {
      const button = this.buttons.get(action.id);
      if (!button) {
        return;
      }
      button.container.setPosition(startX + index * (buttonW + gap), y);
      setGradientButtonSize(button, buttonW, buttonH);
      button.text.setFontSize(Math.max(24, Math.round(buttonH * 0.42)));
      button.text.setText(action.label);
      button.enabled = action.enabled;
      this.applyButtonStyle(button, action.enabled ? "idle" : "disabled");
      button.container.setVisible(true);
    });
  }

  rebuildCards(options) {
    const signature = options.map((option) => option.id).join("|");
    if (signature === this.lastSignature) {
      return;
    }
    this.lastSignature = signature;
    this.cards.forEach((card) => card.container.destroy());
    this.cards.clear();

    options.forEach((option, index) => {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 250, 340, CARD_STYLE.fill, 0.94).setOrigin(0, 0);
      bg.setStrokeStyle(2, CARD_STYLE.border, 0.52);
      const rarity = this.add
        .text(14, 24, "COMMON", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "18px",
          color: "#cde4f6",
          stroke: "#09121a",
          strokeThickness: 2,
        })
        .setOrigin(0, 0.5);
      const name = this.add
        .text(14, 56, option.name || "Relic", {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "31px",
          color: "#dbeefd",
          stroke: "#08131d",
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5);
      const descPanel = this.add.rectangle(14, 94, 222, 220, 0x0a1520, 0.34).setOrigin(0, 0);
      descPanel.setStrokeStyle(1.2, 0x88acc4, 0.24);
      const desc = this.add
        .text(14, 98, option.description || "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "21px",
          color: "#d9ecfb",
          stroke: "#08121a",
          strokeThickness: 1,
          wordWrap: { width: 220 },
          lineSpacing: 7,
        })
        .setOrigin(0, 0);
      container.add([bg, rarity, name, descPanel, desc]);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.invokeAction("selectIndex", index));
      this.cards.set(option.id, { container, bg, rarity, name, descPanel, desc });
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
