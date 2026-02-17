import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { ACTION_BUTTON_STYLE } from "./ui/button-styles.js";
import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "./ui/gradient-button.js";

const BUTTON_STYLES = ACTION_BUTTON_STYLE;
const RUN_PARTICLE_KEY = "__run-particle__";
const ENEMY_AVATAR_TEXTURE_PREFIX = "__enemy-avatar__";
const SUIT_SYMBOL = Object.freeze({
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
});

const ENEMY_AVATAR_KEY_BY_NAME = Object.freeze({
  "Pit Croupier": "pit-croupier",
  "Tin Dealer": "tin-dealer",
  "Shiv Shark": "shiv-shark",
  "Brick Smiler": "brick-smiler",
  "Card Warden": "card-warden",
  "Ash Gambler": "ash-gambler",
  "Velvet Reaper": "velvet-reaper",
  "Latch Queen": "latch-queen",
  "Bone Accountant": "bone-accountant",
  "Stack Baron": "stack-baron",
  "The House": "the-house",
  "Abyss Banker": "abyss-banker",
  "Null Dealer": "null-dealer",
});

function sanitizeEnemyAvatarKey(name) {
  if (typeof name !== "string") {
    return "";
  }
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class RunScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.run);
    this.graphics = null;
    this.textNodes = new Map();
    this.cardTextNodes = new Map();
    this.buttons = new Map();
    this.keyboardHandlers = [];
    this.buttonSignature = "";
    this.lastSnapshot = null;
    this.enemyPortrait = null;
    this.enemyPortraitMaskShape = null;
    this.enemyPortraitMask = null;
    this.introPortrait = null;
    this.introPortraitMaskShape = null;
    this.introPortraitMask = null;
    this.introButtonLayout = null;
    this.resultEmitter = null;
    this.lastResultSignature = "";
    this.introOverlayProgress = 0;
    this.cardAnimStates = new Map();
    this.cardAnimSeen = new Set();
  }

  preload() {
    const avatarKeys = new Set(Object.values(ENEMY_AVATAR_KEY_BY_NAME));
    avatarKeys.forEach((avatarKey) => {
      const textureKey = `${ENEMY_AVATAR_TEXTURE_PREFIX}${avatarKey}`;
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, `/images/avatars/${avatarKey}.png`);
      }
    });
  }

  create() {
    this.cameras.main.setBackgroundColor("#081420");
    this.cameras.main.setAlpha(0);
    this.graphics = this.add.graphics();
    this.ensureRunParticleTexture();

    this.enemyPortrait = this.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(16);
    this.enemyPortraitMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
    this.enemyPortraitMask = this.enemyPortraitMaskShape.createGeometryMask();
    this.enemyPortrait.setMask(this.enemyPortraitMask);
    this.introPortrait = this.add.image(0, 0, RUN_PARTICLE_KEY).setVisible(false).setDepth(116);
    this.introPortraitMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
    this.introPortraitMask = this.introPortraitMaskShape.createGeometryMask();
    this.introPortrait.setMask(this.introPortraitMask);

    this.resultEmitter = this.add
      .particles(0, 0, RUN_PARTICLE_KEY, {
        frequency: -1,
        quantity: 28,
        lifespan: { min: 460, max: 980 },
        speed: { min: 96, max: 280 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.34, end: 0.02 },
        alpha: { start: 0.94, end: 0 },
        tint: [0xf6e3ac, 0xffcb7f, 0xff8f59],
      })
      .setDepth(130)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.resultEmitter.stop();

    this.bindKeyboardInput();
    this.scale.on("resize", this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 260,
      ease: "Sine.easeInOut",
    });
  }

  teardown() {
    this.scale.off("resize", this.onResize, this);
    this.keyboardHandlers.forEach(({ eventName, handler }) => {
      this.input.keyboard?.off(eventName, handler);
    });
    this.keyboardHandlers = [];
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();
    this.buttonSignature = "";
    this.textNodes.forEach((node) => node.destroy());
    this.textNodes.clear();
    this.cardTextNodes.forEach((node) => node.destroy());
    this.cardTextNodes.clear();
    this.cardAnimStates.clear();
    this.cardAnimSeen.clear();
    if (this.enemyPortrait) {
      this.enemyPortrait.destroy();
      this.enemyPortrait = null;
    }
    if (this.enemyPortraitMaskShape) {
      this.enemyPortraitMaskShape.destroy();
      this.enemyPortraitMaskShape = null;
      this.enemyPortraitMask = null;
    }
    if (this.introPortrait) {
      this.introPortrait.destroy();
      this.introPortrait = null;
    }
    if (this.introPortraitMaskShape) {
      this.introPortraitMaskShape.destroy();
      this.introPortraitMaskShape = null;
      this.introPortraitMask = null;
    }
    this.introButtonLayout = null;
    if (this.resultEmitter) {
      this.resultEmitter.destroy();
      this.resultEmitter = null;
    }
  }

  ensureRunParticleTexture() {
    if (this.textures.exists(RUN_PARTICLE_KEY)) {
      return;
    }
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture(RUN_PARTICLE_KEY, 16, 16);
    gfx.destroy();
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

    bind("keydown-A", () => this.invokeAction("hit"));
    bind("keydown-B", () => this.invokeAction("stand"));
    bind("keydown-S", () => this.invokeAction("split"));
    bind("keydown-SPACE", (event) => {
      event.preventDefault();
      this.invokeAction("doubleDown");
    });
    bind("keydown-ENTER", (event) => {
      event.preventDefault();
      if (this.lastSnapshot?.intro?.active) {
        this.invokeAction("confirmIntro");
      } else {
        this.invokeAction("deal");
      }
    });
  }

  getRunApi() {
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    const bridge = runtime?.legacyAdapter?.bridge || null;
    if (!bridge || typeof bridge.getRunApi !== "function") {
      return null;
    }
    return bridge.getRunApi();
  }

  getSnapshot() {
    const api = this.getRunApi();
    if (!api || typeof api.getSnapshot !== "function") {
      return null;
    }
    try {
      return api.getSnapshot();
    } catch {
      return null;
    }
  }

  invokeAction(actionName) {
    const api = this.getRunApi();
    const action = api ? api[actionName] : null;
    if (typeof action === "function") {
      action();
    }
  }

  renderSnapshot(snapshot) {
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    this.graphics.clear();
    this.hideAllText();
    this.introButtonLayout = null;
    if (!snapshot) {
      this.rebuildButtons([]);
      this.lastResultSignature = "";
      this.cardAnimStates.clear();
      this.cardAnimSeen.clear();
      this.introOverlayProgress = Phaser.Math.Linear(this.introOverlayProgress, 0, 0.2);
      if (this.enemyPortrait) {
        this.enemyPortrait.setVisible(false);
      }
      if (this.introPortrait) {
        this.introPortrait.setVisible(false);
      }
      return;
    }

    this.drawBackground(width, height);
    this.drawHud(snapshot, width);
    const layout = this.drawEncounterPanels(snapshot, width, height);
    this.drawCards(snapshot, width, height, layout);
    this.drawRunMessages(snapshot, width, height);
    this.renderButtons(snapshot, width, height);
    this.positionPassiveRail(width, height);
  }

  drawBackground(width, height) {
    const pulse = Math.sin(this.time.now * 0.00032) * 0.5 + 0.5;
    this.graphics.fillGradientStyle(0x120e0a, 0x120e0a, 0x060504, 0x060504, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(0x8c5d26, 0.07 + pulse * 0.06);
    this.graphics.fillCircle(width * 0.5, height * 0.34, height * 0.44);

    this.graphics.lineStyle(1, 0x8f6d43, 0.08);
    for (let y = 96; y < height - 110; y += 42) {
      this.graphics.beginPath();
      this.graphics.moveTo(24, y);
      this.graphics.lineTo(width - 24, y);
      this.graphics.strokePath();
    }

    const arenaX = 18;
    const arenaY = 58;
    const arenaW = width - 36;
    const arenaH = height - 126;
    this.graphics.lineStyle(2, 0x6b4a28, 0.35);
    this.graphics.strokeRoundedRect(arenaX, arenaY, arenaW, arenaH, 24);
    this.graphics.lineStyle(1, 0xc39a65, 0.16);
    this.graphics.strokeRoundedRect(arenaX + 4, arenaY + 4, arenaW - 8, arenaH - 8, 22);
  }

  drawHud(snapshot, width) {
    const run = snapshot.run || {};
    const leftLabel = `CHIPS ${run.chips || 0}   STREAK ${run.streak || 0}   GUARDS ${run.bustGuardsLeft || 0}`;
    const rightLabel = `FLOOR ${run.floor || 1}   ROOM ${run.room || 1}/${run.roomsPerFloor || 5}`;
    this.drawText(
      "hud-left",
      leftLabel,
      42,
      28,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "31px",
        color: "#e2ccb0",
      },
      { x: 0, y: 0.5 }
    );
    this.drawText(
      "hud-right",
      rightLabel,
      width - 274,
      28,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "31px",
        color: "#d8c6ac",
      },
      { x: 1, y: 0.5 }
    );
  }

  drawEncounterPanels(snapshot, width, height) {
    const enemy = snapshot.enemy || {};
    const player = snapshot.player || {};
    const enemyAvatarW = 130;
    const enemyAvatarH = 160;
    const enemyAvatarX = width - 42 - enemyAvatarW;
    const enemyAvatarY = 78;
    const enemyInfoWidth = Math.max(220, Math.min(300, Math.round(width * 0.22)));
    const enemyInfoRight = enemyAvatarX - 18;
    const enemyInfoLeft = enemyInfoRight - enemyInfoWidth;

    this.drawText("enemy-name", (enemy.name || "Enemy").toUpperCase(), enemyInfoRight, enemyAvatarY + 14, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "44px",
      color: "#d9c7ac",
    }, { x: 1, y: 0.5 });
    this.drawText(
      "enemy-type",
      `${String(enemy.type || "normal").toUpperCase()} ENCOUNTER`,
      enemyInfoRight,
      enemyAvatarY + 38,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "29px",
        color: "#dbc6a8",
      },
      { x: 1, y: 0.5 }
    );

    this.drawHpBar(
      "enemy-hp",
      enemyInfoLeft,
      enemyAvatarY + 54,
      enemyInfoWidth,
      20,
      enemy.hp || 0,
      enemy.maxHp || 1,
      "#d78b65"
    );
    this.drawEnemyAvatar(enemy, enemyAvatarX, enemyAvatarY, enemyAvatarW, enemyAvatarH);

    const playerAvatarW = 92;
    const playerAvatarH = 112;
    const playerAvatarX = 42;
    const playerAvatarY = height - 170;
    this.drawPlayerAvatar(playerAvatarX, playerAvatarY, playerAvatarW, playerAvatarH);

    const playerInfoLeft = playerAvatarX + playerAvatarW + 16;
    const playerInfoWidth = Math.max(220, Math.min(320, Math.round(width * 0.24)));
    this.drawText(
      "player-name",
      "PLAYER",
      playerInfoLeft,
      playerAvatarY + 18,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "43px",
        color: "#e2ccb0",
      },
      { x: 0, y: 0.5 }
    );

    this.drawHpBar("player-hp", playerInfoLeft, playerAvatarY + 38, playerInfoWidth, 20, player.hp || 0, player.maxHp || 1, "#83d0ac");

    const cardWidth = 92;
    const cardHeight = Math.round(cardWidth * 1.42);
    const enemyRowY = Math.round(height * 0.26);
    const playerRowY = Math.round(height * 0.58);

    return {
      enemyY: enemyRowY,
      playerY: playerRowY,
      cardWidth,
      cardHeight,
      enemyInfoLeft,
      enemyInfoRight,
      enemyInfoWidth,
      playerInfoLeft,
      playerInfoWidth,
      messageY: Math.round((enemyRowY + playerRowY + cardHeight) * 0.5),
    };
  }

  drawPlayerAvatar(x, y, width, height) {
    this.graphics.fillStyle(0x2b1f18, 0.94);
    this.graphics.fillRoundedRect(x, y, width, height, 18);
    this.graphics.lineStyle(1.8, 0xa98358, 0.44);
    this.graphics.strokeRoundedRect(x, y, width, height, 18);

    const inset = 10;
    const innerX = x + inset;
    const innerY = y + inset;
    const innerW = width - inset * 2;
    const innerH = height - inset * 2;
    this.graphics.fillStyle(0xcdbb9d, 0.82);
    this.graphics.fillCircle(innerX + innerW * 0.5, innerY + innerH * 0.3, innerW * 0.2);
    this.graphics.fillRoundedRect(innerX + innerW * 0.17, innerY + innerH * 0.48, innerW * 0.66, innerH * 0.44, 10);
  }

  resolveEnemyAvatarTexture(enemy) {
    const explicitKey = typeof enemy?.avatarKey === "string" && enemy.avatarKey.trim().length > 0 ? enemy.avatarKey.trim() : "";
    const mappedKey = ENEMY_AVATAR_KEY_BY_NAME[enemy?.name] || "";
    const safeKey = explicitKey || mappedKey || sanitizeEnemyAvatarKey(enemy?.name);
    if (!safeKey) {
      return "";
    }
    const textureKey = `${ENEMY_AVATAR_TEXTURE_PREFIX}${safeKey}`;
    return this.textures.exists(textureKey) ? textureKey : "";
  }

  enemyAccent(type) {
    if (type === "boss") {
      return 0xffab84;
    }
    if (type === "elite") {
      return 0xffdf9d;
    }
    return 0xaed2f0;
  }

  drawEnemyAvatar(enemy, x, y, width, height) {
    this.graphics.fillStyle(0x10243a, 0.96);
    this.graphics.fillRoundedRect(x, y, width, height, 14);
    this.graphics.lineStyle(1.8, 0xaed0e8, 0.45);
    this.graphics.strokeRoundedRect(x, y, width, height, 14);

    const pulse = Math.sin(this.time.now * 0.004) * 0.5 + 0.5;
    this.graphics.lineStyle(2.1, this.enemyAccent(enemy?.type), 0.3 + pulse * 0.24);
    this.graphics.strokeRoundedRect(x - 1, y - 1, width + 2, height + 2, 15);

    const innerPad = 6;
    const innerX = x + innerPad;
    const innerY = y + innerPad;
    const innerW = Math.max(12, width - innerPad * 2);
    const innerH = Math.max(12, height - innerPad * 2);

    if (this.enemyPortraitMaskShape) {
      this.enemyPortraitMaskShape.clear();
      this.enemyPortraitMaskShape.fillStyle(0xffffff, 1);
      this.enemyPortraitMaskShape.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
    }

    const fallback = this.textNodes.get("enemy-avatar-fallback");
    if (fallback) {
      fallback.setVisible(false);
    }

    const textureKey = this.resolveEnemyAvatarTexture(enemy);
    if (!textureKey || !this.enemyPortrait) {
      if (this.enemyPortrait) {
        this.enemyPortrait.setVisible(false);
      }
      this.graphics.fillStyle(0x1a3146, 0.92);
      this.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
      this.drawText("enemy-avatar-fallback", "?", x + width * 0.5, y + height * 0.56, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "52px",
        color: "#bed6eb",
      });
      return;
    }

    const bob = Math.sin(this.time.now * 0.0022) * 2.2;
    this.enemyPortrait.setTexture(textureKey);
    this.enemyPortrait.setDisplaySize(innerW, innerH);
    this.enemyPortrait.setPosition(x + width * 0.5, y + height * 0.5 + bob);
    this.enemyPortrait.setVisible(true);

    this.graphics.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.12, 0.12, 0.02, 0.16);
    this.graphics.fillRoundedRect(innerX, innerY, innerW, innerH, 10);
  }

  drawHpBar(keyPrefix, x, y, width, height, value, maxValue, colorHex) {
    const safeMax = Math.max(1, Number(maxValue) || 1);
    const safeValue = Math.max(0, Math.min(safeMax, Number(value) || 0));
    const ratio = safeValue / safeMax;
    this.graphics.fillStyle(0x0f1116, 0.95);
    this.graphics.fillRoundedRect(x, y, width, height, 8);
    const fill = Math.max(0, Math.round((width - 4) * ratio));
    if (fill > 0) {
      const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
      this.graphics.fillStyle(color, 0.98);
      this.graphics.fillRoundedRect(x + 2, y + 2, fill, Math.max(1, height - 4), 6);
    }
    this.graphics.lineStyle(1.6, 0x7694b1, 0.38);
    this.graphics.strokeRoundedRect(x, y, width, height, 8);
    this.drawText(
      `${keyPrefix}-label`,
      `HP ${safeValue} / ${safeMax}`,
      x + 10,
      y + height * 0.5,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "31px",
        color: "#171515",
      },
      { x: 0, y: 0.5 }
    );
  }

  drawCards(snapshot, width, height, layout) {
    const enemyY = layout?.enemyY || Math.round(height * 0.26);
    const playerY = layout?.playerY || Math.round(height * 0.58);
    const cardWidth = layout?.cardWidth || 92;
    const cardHeight = layout?.cardHeight || Math.round(cardWidth * 1.42);
    const spacing = Math.max(50, Math.round(cardWidth * 0.58));

    const enemyCards = Array.isArray(snapshot.cards?.dealer) ? snapshot.cards.dealer : [];
    const playerCards = Array.isArray(snapshot.cards?.player) ? snapshot.cards.player : [];

    const enemyCenterX = width * 0.5;
    const playerCenterX = width * 0.5;
    const deckX = width * 0.5;
    this.cardAnimSeen.clear();
    this.drawCardRow(
      "enemy-card",
      enemyCards,
      enemyCenterX,
      enemyY,
      cardWidth,
      cardHeight,
      spacing,
      { x: deckX, y: Math.max(84, enemyY - 120) }
    );
    this.drawCardRow(
      "player-card",
      playerCards,
      playerCenterX,
      playerY,
      cardWidth,
      cardHeight,
      spacing,
      { x: deckX, y: Math.min(height - 84, playerY + cardHeight + 120) }
    );
    this.pruneCardAnimations();

    const totals = snapshot.totals || {};
    const enemyHasHidden = enemyCards.some((card) => card.hidden);
    const enemyHandValue = Number.isFinite(totals.dealer) ? String(totals.dealer) : "?";
    const enemyTotalText = enemyHasHidden && Number.isFinite(totals.dealer) ? `HAND ${enemyHandValue}+?` : `HAND ${enemyHandValue}`;
    const playerTotalText = Number.isFinite(totals.player) ? `HAND ${totals.player}` : "HAND ?";
    this.drawText(
      "enemy-total",
      enemyTotalText,
      width * 0.5,
      enemyY - 18,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "37px",
        color: "#ddd0bc",
      },
      { x: 0.5, y: 0.5 }
    );
    this.drawText(
      "player-total",
      playerTotalText,
      width * 0.5,
      playerY + cardHeight + 20,
      {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: "37px",
        color: "#ddd0bc",
      },
      { x: 0.5, y: 0.5 }
    );
  }

  drawCardRow(prefix, cards, centerX, y, cardW, cardH, spacing, spawn = null) {
    const safeCards = Array.isArray(cards) ? cards : [];
    const totalWidth = safeCards.length > 0 ? cardW + Math.max(0, safeCards.length - 1) * spacing : cardW;
    const startX = centerX - totalWidth * 0.5;
    const used = new Set();
    const now = this.time.now;
    const rowDirection = prefix.startsWith("enemy") ? -1 : 1;
    const baseSpawnX = Number.isFinite(spawn?.x) ? spawn.x : centerX;
    const baseSpawnY = Number.isFinite(spawn?.y) ? spawn.y : y + rowDirection * -120;

    safeCards.forEach((card, idx) => {
      const key = `${prefix}-${idx}`;
      const targetX = startX + idx * spacing;
      const targetCenterX = targetX + cardW * 0.5;
      const targetCenterY = y + cardH * 0.5;
      const animKey = `${prefix}-${idx}-${card.rank || "?"}-${card.suit || ""}-${card.hidden ? 1 : 0}`;
      let anim = this.cardAnimStates.get(animKey);
      if (!anim) {
        anim = {
          start: now + idx * 65,
          fromX: baseSpawnX + rowDirection * 18,
          fromY: baseSpawnY,
          lastSeen: now,
        };
        this.cardAnimStates.set(animKey, anim);
      }
      anim.lastSeen = now;
      this.cardAnimSeen.add(animKey);

      const progress = Phaser.Math.Clamp((now - anim.start) / 320, 0, 1);
      const eased = Phaser.Math.Easing.Cubic.Out(progress);
      const scale = 0.78 + Phaser.Math.Easing.Sine.Out(progress) * 0.22;
      const alpha = 0.22 + progress * 0.78;
      const drawCenterX = Phaser.Math.Linear(anim.fromX, targetCenterX, eased);
      const drawCenterY = Phaser.Math.Linear(anim.fromY, targetCenterY, eased);
      const drawW = cardW * scale;
      const drawH = cardH * scale;
      const drawX = drawCenterX - drawW * 0.5;
      const drawY = drawCenterY - drawH * 0.5;

      this.graphics.fillStyle(card.hidden ? 0x28425a : 0xf6f9fd, 0.2 + alpha * 0.76);
      this.graphics.fillRoundedRect(drawX, drawY, drawW, drawH, 9 * scale);
      this.graphics.lineStyle(1.5, card.hidden ? 0x8db4cf : 0x9bb1c4, 0.3 + alpha * 0.58);
      this.graphics.strokeRoundedRect(drawX, drawY, drawW, drawH, 9 * scale);

      used.add(key);
      const suitKey = card.suit || "";
      const suitSymbol = SUIT_SYMBOL[suitKey] || suitKey || "";
      const text = card.hidden ? "?" : `${card.rank || "?"}\n${suitSymbol}`;
      const suit = card.suit || "";
      const red = suit === "H" || suit === "D";
      const color = card.hidden ? "#d6e9f8" : red ? "#b44c45" : "#231f1b";
      this.drawCardText(key, text, drawCenterX, drawCenterY, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        align: "center",
        lineSpacing: -8,
        fontSize: `${Math.max(27, Math.round(cardW * 0.31))}px`,
        color,
      }, alpha);
    });

    this.cardTextNodes.forEach((node, key) => {
      if (key.startsWith(prefix) && !used.has(key)) {
        node.setVisible(false);
      }
    });
  }

  pruneCardAnimations() {
    const now = this.time.now;
    this.cardAnimStates.forEach((state, key) => {
      if (!this.cardAnimSeen.has(key) && now - (state.lastSeen || 0) > 80) {
        this.cardAnimStates.delete(key);
      }
    });
  }

  drawRunMessages(snapshot, width, height) {
    const intro = snapshot.intro || {};
    const enemy = snapshot.enemy || {};
    const introTarget = intro.active ? 1 : 0;
    this.introOverlayProgress = Phaser.Math.Linear(this.introOverlayProgress, introTarget, 0.2);

    if (this.introOverlayProgress > 0.02) {
      const overlayAlpha = 0.42 * this.introOverlayProgress;
      this.graphics.fillStyle(0x060d16, overlayAlpha);
      this.graphics.fillRect(0, 0, width, height);
    }

    if (intro.active || this.introOverlayProgress > 0.02) {
      const modalW = Math.max(760, Math.min(1080, Math.round(width * 0.86)));
      const modalH = Math.max(238, Math.min(336, Math.round(height * 0.41)));
      const eased = Phaser.Math.Easing.Sine.InOut(this.introOverlayProgress);
      const x = width * 0.5 - modalW * 0.5;
      const y = height * 0.5 - modalH * 0.5 + (1 - eased) * 20;
      const alpha = Math.min(1, this.introOverlayProgress + 0.02);

      this.graphics.fillStyle(0x050b14, 0.48 * alpha);
      this.graphics.fillRoundedRect(x + 2, y + 4, modalW, modalH, 24);
      this.graphics.fillGradientStyle(0x1b2f47, 0x1c324a, 0x0f1f33, 0x102033, 0.96 * alpha, 0.96 * alpha, 0.96 * alpha, 0.96 * alpha);
      this.graphics.fillRoundedRect(x, y, modalW, modalH, 22);
      this.graphics.lineStyle(2.2, 0x7097bb, 0.56 * alpha);
      this.graphics.strokeRoundedRect(x, y, modalW, modalH, 22);
      this.graphics.lineStyle(1.3, 0xc9def1, 0.2 * alpha);
      this.graphics.strokeRoundedRect(x + 4, y + 4, modalW - 8, modalH - 8, 18);

      const avatarOuter = Math.max(142, Math.min(196, modalH - 48));
      const avatarOuterX = x + 24;
      const avatarOuterY = y + (modalH - avatarOuter) * 0.5;
      this.graphics.fillStyle(0x223953, 0.96 * alpha);
      this.graphics.fillRoundedRect(avatarOuterX, avatarOuterY, avatarOuter, avatarOuter, 22);
      this.graphics.lineStyle(2.2, 0x6d95ba, 0.68 * alpha);
      this.graphics.strokeRoundedRect(avatarOuterX, avatarOuterY, avatarOuter, avatarOuter, 22);

      const avatarPad = 8;
      const avatarInnerX = avatarOuterX + avatarPad;
      const avatarInnerY = avatarOuterY + avatarPad;
      const avatarInnerW = avatarOuter - avatarPad * 2;
      const avatarInnerH = avatarOuter - avatarPad * 2;

      if (this.introPortraitMaskShape) {
        this.introPortraitMaskShape.clear();
        this.introPortraitMaskShape.fillStyle(0xffffff, 1);
        this.introPortraitMaskShape.fillRoundedRect(avatarInnerX, avatarInnerY, avatarInnerW, avatarInnerH, 14);
      }

      const introAvatarTexture = this.resolveEnemyAvatarTexture(enemy);
      if (introAvatarTexture && this.introPortrait) {
        this.introPortrait.setTexture(introAvatarTexture);
        this.introPortrait.setDisplaySize(avatarInnerW, avatarInnerH);
        this.introPortrait.setPosition(avatarOuterX + avatarOuter * 0.5, avatarOuterY + avatarOuter * 0.5);
        this.introPortrait.setVisible(true);
        this.introPortrait.setAlpha(alpha);
        const fallbackNode = this.textNodes.get("intro-avatar-fallback");
        if (fallbackNode) {
          fallbackNode.setVisible(false);
        }
      } else {
        if (this.introPortrait) {
          this.introPortrait.setVisible(false);
        }
        this.graphics.fillStyle(0x1a3146, 0.94 * alpha);
        this.graphics.fillRoundedRect(avatarInnerX, avatarInnerY, avatarInnerW, avatarInnerH, 14);
        this.drawText("intro-avatar-fallback", "?", avatarOuterX + avatarOuter * 0.5, avatarOuterY + avatarOuter * 0.56, {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: "64px",
          color: "#bed6eb",
        });
      }

      const textX = avatarOuterX + avatarOuter + 24;
      const textW = modalW - (textX - x) - 26;
      const title = String(enemy.name || "ENEMY").toUpperCase();
      const encounterType = `${String(enemy.type || "normal").toUpperCase()} ENCOUNTER`;
      const bodyText = intro.text || "";
      const typeCursor = !intro.ready && Math.floor(this.time.now / 220) % 2 === 0 ? "|" : "";
      const titleSize = Math.round(Phaser.Math.Clamp(modalH * 0.17, 40, 58));
      const typeSize = Math.round(Phaser.Math.Clamp(modalH * 0.09, 24, 34));
      const bodySize = Math.round(Phaser.Math.Clamp(modalH * 0.085, 22, 32));

      if (intro.active) {
        this.drawText("intro-title", title, textX, y + 58, {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: `${titleSize}px`,
          color: "#84b7f8",
          fontStyle: "700",
        }, { x: 0, y: 0.5 });
        this.drawText("intro-type", encounterType, textX, y + 96, {
          fontFamily: '"Chakra Petch", "Sora", sans-serif',
          fontSize: `${typeSize}px`,
          color: "#9ab5d2",
          fontStyle: "600",
        }, { x: 0, y: 0.5 });
        this.drawText("intro-body", `${bodyText}${typeCursor}`, textX, y + 126, {
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontSize: `${bodySize}px`,
          color: "#d8e5f4",
          align: "left",
          lineSpacing: 2,
          wordWrap: { width: textW },
        }, { x: 0, y: 0 });
      }

      const buttonW = Math.max(168, Math.min(260, Math.round(modalW * 0.23)));
      const buttonH = 58;
      this.introButtonLayout = {
        x: x + modalW - buttonW * 0.5 - 26,
        y: y + modalH - buttonH * 0.5 - 24,
        width: buttonW,
        height: buttonH,
      };
      return;
    }

    if (this.introPortrait) {
      this.introPortrait.setVisible(false);
    }
    const introFallback = this.textNodes.get("intro-avatar-fallback");
    if (introFallback) {
      introFallback.setVisible(false);
    }

    const resultText = snapshot.resultText || snapshot.announcement || "";
    if (!resultText) {
      this.lastResultSignature = "";
      return;
    }

    const tone = snapshot.resultTone || "neutral";
    const panelY = Math.round(height * 0.5);
    const panelW = Phaser.Math.Clamp(300 + resultText.length * 11, 360, 700);
    const panelH = 54;
    const toneFill =
      tone === "good" || tone === "win"
        ? 0x184b3d
        : tone === "bad" || tone === "loss"
          ? 0x4a2323
          : 0x3f3321;
    const toneStroke =
      tone === "good" || tone === "win"
        ? 0x76cfad
        : tone === "bad" || tone === "loss"
          ? 0xd98b8a
          : 0xd8b780;
    this.graphics.fillStyle(toneFill, 0.95);
    this.graphics.fillRoundedRect(width * 0.5 - panelW * 0.5, panelY - panelH * 0.5, panelW, panelH, 16);
    this.graphics.lineStyle(2.2, toneStroke, 0.85);
    this.graphics.strokeRoundedRect(width * 0.5 - panelW * 0.5, panelY - panelH * 0.5, panelW, panelH, 16);
    const node = this.drawText("run-result", resultText.toUpperCase(), width * 0.5, panelY + 1, {
      fontFamily: '"Chakra Petch", "Sora", sans-serif',
      fontSize: "40px",
      color: "#e8e2d2",
    });

    const signature = `${tone}|${resultText}`;
    if (signature !== this.lastResultSignature) {
      this.lastResultSignature = signature;
      this.animateResultMessage(node, tone);
    }
  }

  tonePalette(tone) {
    if (tone === "good") {
      return [0xd9ffd5, 0x9be68f, 0x66c66b, 0x9be68f];
    }
    if (tone === "bad") {
      return [0xffe2d8, 0xffb088, 0xff8156, 0xffb088];
    }
    return [0xf6e3ac, 0xffcb7f, 0xff8f59, 0xffcb7f];
  }

  animateResultMessage(node, tone) {
    if (!node) {
      return;
    }
    const palette = this.tonePalette(tone);
    if (this.resultEmitter) {
      if (typeof this.resultEmitter.setParticleTint === "function") {
        this.resultEmitter.setParticleTint(palette[1]);
      }
      this.resultEmitter.explode(28, node.x, node.y + 12);
    }

    node.setScale(0.84);
    node.setAlpha(0.44);
    this.tweens.add({
      targets: node,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 260,
      ease: "Sine.easeInOut",
    });

    this.cameras.main.shake(120, 0.0014, true);
  }

  renderButtons(snapshot, width, height) {
    const actions = [];
    const introActive = Boolean(snapshot.intro?.active);
    const status = snapshot.status || {};

    if (introActive) {
      actions.push({ id: "confirmIntro", label: snapshot.intro?.ready ? "Let's go!" : "Skip", enabled: true });
    } else if (status.canDeal) {
      actions.push({ id: "deal", label: "DEAL", enabled: true });
    } else {
      actions.push({ id: "hit", label: "HIT", enabled: Boolean(status.canHit) });
      actions.push({ id: "stand", label: "STAND", enabled: Boolean(status.canStand) });
      actions.push({ id: "split", label: "SPLIT", enabled: Boolean(status.canSplit) });
      actions.push({ id: "doubleDown", label: "DOUBLE", enabled: Boolean(status.canDouble) });
    }

    this.rebuildButtons(actions);
    const count = actions.length;
    const spacing = 18;
    const singleWide = count === 1;
    const introLayout = introActive ? this.introButtonLayout : null;
    const buttonW = singleWide
      ? Math.max(360, width - 42)
      : Math.max(150, Math.min(220, Math.round(width * 0.16)));
    const buttonH = singleWide
      ? 54
      : Math.max(54, Math.min(66, Math.round(height * 0.088)));
    const totalW = buttonW * count + spacing * Math.max(0, count - 1);
    const startX = width * 0.5 - totalW * 0.5 + buttonW * 0.5;
    const tunedY = singleWide ? height - 30 : Math.min(height - buttonH * 0.72, height * 0.9);

    actions.forEach((action, index) => {
      const button = this.buttons.get(action.id);
      if (!button) {
        return;
      }
      let x = startX + index * (buttonW + spacing);
      let y = tunedY;
      let resolvedW = buttonW;
      let resolvedH = buttonH;
      if (introLayout && action.id === "confirmIntro") {
        x = introLayout.x;
        y = introLayout.y;
        resolvedW = introLayout.width;
        resolvedH = introLayout.height;
      }
      button.container.setPosition(x, y);
      setGradientButtonSize(button, resolvedW, resolvedH);
      const label = action.id === "deal" ? "DEAL  (ENTER)" : action.label;
      button.text.setText(label);
      const fontSize = action.id === "confirmIntro"
        ? Math.max(24, Math.round(resolvedH * 0.48))
        : Math.max(24, Math.round(resolvedH * 0.42));
      button.text.setFontSize(fontSize);
      this.setButtonVisual(button, action.enabled ? "idle" : "disabled");
      button.enabled = action.enabled;
      button.container.setVisible(true);
    });
  }

  rebuildButtons(actions) {
    const signature = actions.map((entry) => `${entry.id}:${entry.label}`).join("|");
    if (signature === this.buttonSignature) {
      return;
    }
    this.buttonSignature = signature;
    this.buttons.forEach((button) => button.container.destroy());
    this.buttons.clear();

    actions.forEach((action) => {
      const button = createGradientButton(this, {
        id: action.id,
        label: action.label,
        styleSet: BUTTON_STYLES,
        onPress: () => this.invokeAction(action.id),
        width: 210,
        height: 64,
        fontSize: 28,
      });
      this.buttons.set(action.id, button);
    });
  }

  setButtonVisual(button, styleName) {
    applyGradientButtonStyle(button, styleName);
  }

  hideAllText() {
    this.textNodes.forEach((node) => node.setVisible(false));
    this.cardTextNodes.forEach((node) => node.setVisible(false));
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

  drawCardText(key, value, x, y, style, alpha = 1) {
    let node = this.cardTextNodes.get(key);
    if (!node) {
      node = this.add.text(x, y, value, style).setOrigin(0.5, 0.5);
      this.cardTextNodes.set(key, node);
    } else {
      node.setStyle(style);
    }
    node.setPosition(x, y);
    node.setText(value);
    node.setAlpha(alpha);
    node.setVisible(true);
    return node;
  }

  positionPassiveRail(width, height) {
    const passiveRail = document.getElementById("passive-rail");
    if (!passiveRail || !passiveRail.children || passiveRail.children.length === 0) {
      return;
    }
    passiveRail.style.left = `${Math.max(6, Math.round(width * 0.07))}px`;
    passiveRail.style.top = `${Math.max(88, Math.round(height * 0.67))}px`;
    passiveRail.style.transform = "";
  }
}
