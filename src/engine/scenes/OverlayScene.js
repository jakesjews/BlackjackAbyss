import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";

const BUTTON_STYLE = ACTION_BUTTON_STYLE;

export class OverlayScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.overlay);
    this.graphics = null;
    this.textNodes = new Map();
    this.entryCards = new Map();
    this.buttons = new Map();
    this.lastEntrySignature = "";
    this.keyboardHandlers = [];
    this.lastSnapshot = null;
    this.currentMode = null;
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
    this.entryCards.forEach((card) => card.container.destroy());
    this.entryCards.clear();
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();
    this.textNodes.forEach((text) => text.destroy());
    this.textNodes.clear();
    this.lastEntrySignature = "";
    this.currentMode = null;
  }

  update(time, delta) {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const adapter = runtime?.legacyAdapter || null;
    if (adapter) {
      adapter.tick(delta, time);
    }
    const snapshot = this.getSnapshot();
    this.lastSnapshot = snapshot;
    this.currentMode = snapshot?.mode || null;
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

    bind("keydown-LEFT", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("prevPage");
      }
    });
    bind("keydown-RIGHT", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("nextPage");
      }
    });
    bind("keydown-ENTER", (event) => {
      event.preventDefault();
      this.invokeAction("confirm");
    });
    bind("keydown-SPACE", (event) => {
      event.preventDefault();
      this.invokeAction("confirm");
    });
    bind("keydown-ESC", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("backToMenu");
      }
    });
    bind("keydown-A", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("backToMenu");
      }
    });
    bind("keydown-R", () => {
      if (this.currentMode === "collection") {
        this.invokeAction("backToMenu");
      }
    });
  }

  getOverlayApi() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const bridge = runtime?.legacyAdapter?.bridge || null;
    if (!bridge || typeof bridge.getOverlayApi !== "function") {
      return null;
    }
    return bridge.getOverlayApi();
  }

  getSnapshot() {
    const api = this.getOverlayApi();
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
    const api = this.getOverlayApi();
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
      this.rebuildEntryCards([]);
      this.rebuildButtons([]);
      return;
    }

    if (snapshot.mode === "collection") {
      this.renderCollection(snapshot, width, height);
      return;
    }
    this.rebuildEntryCards([]);
    this.renderEndOverlay(snapshot, width, height);
  }

  renderCollection(snapshot, width, height) {
    this.graphics.fillGradientStyle(0x081420, 0x081420, 0x040b12, 0x040b12, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x000000, 0.42);
    this.graphics.fillRoundedRect(16, 12, width - 32, height - 24, 16);
    this.graphics.lineStyle(2, 0x3c6584, 0.33);
    this.graphics.strokeRoundedRect(16, 12, width - 32, height - 24, 16);

    const panelW = Math.max(760, Math.min(width - 60, 1120));
    const panelH = Math.max(520, Math.min(height - 110, 604));
    const panelX = width * 0.5 - panelW * 0.5;
    const panelY = Math.max(60, Math.min(80, height * 0.12));

    this.graphics.fillStyle(0x0f1e2d, 0.95);
    this.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, 22);
    this.graphics.lineStyle(1.8, 0xa6d0ec, 0.34);
    this.graphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 22);

    this.drawText("collection-title", "COLLECTIONS", width * 0.5, panelY + 44, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "40px",
      color: "#f6e6a6",
      stroke: "#0f1b28",
      strokeThickness: 4,
    });
    this.drawText("collection-summary", snapshot.summary || "", width * 0.5, panelY + 76, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "16px",
      color: "#bed8ec",
    });
    this.drawText("collection-page", `PAGE ${(snapshot.page || 0) + 1}/${snapshot.pageCount || 1}`, width * 0.5, panelY + 100, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "14px",
      color: "#9ac0dc",
    });

    const layout = snapshot.layout || {};
    const cols = Math.max(1, Number(layout.cols) || 1);
    const rows = Math.max(1, Number(layout.rows) || 1);
    const gridPadX = 20;
    const gridPadTop = 120;
    const gridPadBottom = 116;
    const gridX = panelX + gridPadX;
    const gridY = panelY + gridPadTop;
    const gridW = panelW - gridPadX * 2;
    const gridH = panelH - gridPadTop - gridPadBottom;
    const gapX = 12;
    const gapY = 12;
    const cardW = (gridW - gapX * (cols - 1)) / cols;
    const cardH = (gridH - gapY * (rows - 1)) / rows;
    const entries = Array.isArray(snapshot.pageEntries) ? snapshot.pageEntries : [];
    this.rebuildEntryCards(entries);

    entries.forEach((entry, index) => {
      const card = this.entryCards.get(entry.id);
      if (!card) {
        return;
      }
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = gridX + col * (cardW + gapX);
      const y = gridY + row * (cardH + gapY);
      card.container.setPosition(x, y);
      card.bg.width = cardW;
      card.bg.height = cardH;
      card.bg.radius = 14;
      card.descPanel.setSize(Math.max(96, cardW - 16), Math.max(26, cardH - 96));
      card.bg.setFillStyle(entry.unlocked ? 0x223648 : 0x1a242d, 0.94);
      card.bg.setStrokeStyle(1.4, Phaser.Display.Color.HexStringToColor(entry.rarityColor || "#91a7bb").color, entry.unlocked ? 0.72 : 0.34);

      card.rarity.setText((entry.rarityLabel || "").toUpperCase());
      card.name.setText(entry.name || "LOCKED");
      card.desc.setText(entry.description || "");
      card.desc.setWordWrapWidth(Math.max(120, cardW - 22));
      card.owned.setText(entry.copies > 0 ? `OWNED ${entry.copies > 99 ? "99+" : entry.copies}` : "NONE");
      card.owned.setPosition(cardW * 0.5, cardH - 14);

      card.rarity.setColor(entry.unlocked ? (entry.rarityColor || "#b7c9d8") : "#9aa9b8");
      card.name.setColor(entry.unlocked ? "#f1f8ff" : "#bac8d6");
      card.desc.setColor(entry.unlocked ? "#e2f1ff" : "#b4c0cc");
      card.owned.setColor(entry.copies > 0 ? "#f8e7b8" : "#9eb6cb");
      card.descPanel.setFillStyle(0x0a1520, entry.unlocked ? 0.34 : 0.26);
      card.container.setVisible(true);
    });

    this.entryCards.forEach((card, id) => {
      const exists = entries.some((entry) => entry.id === id);
      if (!exists) {
        card.container.setVisible(false);
      }
    });

    const actions = [
      { id: "prevPage", label: "PREV", enabled: Boolean(snapshot.canPrev) },
      { id: "nextPage", label: "NEXT", enabled: Boolean(snapshot.canNext) },
      { id: "backToMenu", label: "BACK", enabled: true },
    ];
    this.rebuildButtons(actions);
    const leftButton = this.buttons.get("prevPage");
    const rightButton = this.buttons.get("nextPage");
    const backButton = this.buttons.get("backToMenu");
    const arrowY = gridY + gridH * 0.5;
    if (leftButton) {
      leftButton.container.setPosition(panelX + 34, arrowY);
      setGradientButtonSize(leftButton, 96, 44);
      leftButton.text.setFontSize(20);
      leftButton.text.setText("PREV");
      leftButton.enabled = Boolean(snapshot.canPrev);
      this.applyButtonStyle(leftButton, leftButton.enabled ? "idle" : "disabled");
      leftButton.container.setVisible(true);
    }
    if (rightButton) {
      rightButton.container.setPosition(panelX + panelW - 34, arrowY);
      setGradientButtonSize(rightButton, 96, 44);
      rightButton.text.setFontSize(20);
      rightButton.text.setText("NEXT");
      rightButton.enabled = Boolean(snapshot.canNext);
      this.applyButtonStyle(rightButton, rightButton.enabled ? "idle" : "disabled");
      rightButton.container.setVisible(true);
    }
    if (backButton) {
      backButton.container.setPosition(width * 0.5, panelY + panelH - 50);
      setGradientButtonSize(backButton, Math.min(280, panelW - 36), 48);
      backButton.text.setFontSize(24);
      backButton.text.setText("BACK");
      backButton.enabled = true;
      this.applyButtonStyle(backButton, "idle");
      backButton.container.setVisible(true);
    }
  }

  renderEndOverlay(snapshot, width, height) {
    this.graphics.fillStyle(0x050a10, 0.78);
    this.graphics.fillRect(0, 0, width, height);
    const panelW = Math.max(660, Math.min(width - 70, 780));
    const panelH = Math.max(370, Math.min(height - 80, 430));
    const panelX = width * 0.5 - panelW * 0.5;
    const panelY = height * 0.5 - panelH * 0.5;

    this.graphics.fillStyle(0x0e1c2a, 0.95);
    this.graphics.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
    this.graphics.lineStyle(2, 0xb2d8f5, 0.25);
    this.graphics.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    this.drawText("overlay-title", snapshot.title || "", width * 0.5, panelY + 84, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "56px",
      color: "#f6e6a6",
    });
    this.drawText("overlay-subtitle", snapshot.subtitle || "", width * 0.5, panelY + 126, {
      fontFamily: '"Sora", "Segoe UI", sans-serif',
      fontSize: "22px",
      color: "#c0d9ec",
    });

    const stats = Array.isArray(snapshot.stats) ? snapshot.stats : [];
    stats.slice(0, 6).forEach((line, index) => {
      this.drawText(`overlay-stat-${index}`, line, width * 0.5, panelY + 178 + index * 32, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "20px",
        color: "#dbe9f7",
      });
    });
    this.drawText("overlay-prompt", snapshot.prompt || "", width * 0.5, panelY + panelH - 64, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "23px",
      color: "#f8d37b",
    });

    const actions = [{ id: "restart", label: "NEW RUN", enabled: Boolean(snapshot.canRestart) }];
    this.rebuildButtons(actions);
    const button = this.buttons.get("restart");
    if (!button) {
      return;
    }
    button.container.setPosition(width * 0.5, panelY + panelH - 24);
    setGradientButtonSize(button, Math.min(300, panelW - 120), 52);
    button.text.setFontSize(24);
    button.text.setText("NEW RUN");
    button.enabled = Boolean(snapshot.canRestart);
    this.applyButtonStyle(button, button.enabled ? "idle" : "disabled");
    button.container.setVisible(true);
  }

  rebuildEntryCards(entries) {
    const signature = entries.map((entry) => entry.id).join("|");
    if (signature === this.lastEntrySignature) {
      return;
    }
    this.lastEntrySignature = signature;
    this.entryCards.forEach((card) => card.container.destroy());
    this.entryCards.clear();

    entries.forEach((entry) => {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 250, 140, 0x223648, 0.94).setOrigin(0, 0);
      bg.setStrokeStyle(1.4, 0x91a7bb, 0.72);
      const rarity = this.add
        .text(0, 0, "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "12px",
          color: "#9aa9b8",
          stroke: "#09131c",
          strokeThickness: 1,
        })
        .setOrigin(0.5, 0.5);
      const name = this.add
        .text(0, 0, "", {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "22px",
          color: "#ecf4ff",
          stroke: "#08131d",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5);
      const desc = this.add
        .text(0, 0, "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "15px",
          color: "#e2f1ff",
          stroke: "#08131d",
          strokeThickness: 1,
          align: "center",
          wordWrap: { width: 220 },
        })
        .setOrigin(0.5, 0);
      const descPanel = this.add.rectangle(8, 68, 234, 42, 0x0a1520, 0.34).setOrigin(0, 0);
      descPanel.setStrokeStyle(1, 0x789bb4, 0.24);
      const owned = this.add
        .text(0, 0, "", {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: "13px",
          color: "#90a9bf",
        })
        .setOrigin(0.5, 0.5);

      rarity.setPosition(125, 20);
      name.setPosition(125, 48);
      desc.setPosition(125, 72);
      owned.setPosition(125, 126);
      container.add([bg, rarity, name, descPanel, desc, owned]);
      this.entryCards.set(entry.id, { container, bg, rarity, name, descPanel, desc, owned });
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
