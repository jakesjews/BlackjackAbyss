import { applyGradientButtonStyle, createGradientButton, setGradientButtonSize } from "../ui/gradient-button.js";
import { resolveDarkIconTexture } from "../ui/texture-processing.js";
import {
  SHOP_BUTTON_STYLE,
  SHOP_DEAL_ICON_KEY,
  SHOP_TOP_ACTION_ICON_KEYS,
} from "./shop-scene-config.js";

export function rebuildShopSceneButtons(scene, actions) {
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
    const button = createGradientButton(scene, {
      id: action.id,
      label: action.label,
      styleSet: SHOP_BUTTON_STYLE,
      onPress: () => {
        if (action.id === "openShop") {
          scene.setShopOpen(!scene.shopOpen);
          return;
        }
        scene.invokeAction(action.id);
      },
      width: 210,
      height: 64,
      fontSize: 28,
    });
    const icon = scene.add
      .image(0, 0, resolveDarkIconTexture(scene, SHOP_DEAL_ICON_KEY, scene.darkIconTextureBySource))
      .setDisplaySize(20, 20)
      .setAlpha(0.92);
    const shortcut = scene.add
      .text(0, 0, "ENTER", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "12px",
        color: "#000000",
        fontStyle: "700",
      })
      .setOrigin(1, 0.5)
      .setAlpha(0.5);
    button.container.add([icon, shortcut]);
    button.icon = icon;
    button.shortcut = shortcut;
    scene.buttons.set(action.id, button);
  });
}

export function renderShopSceneButtons(scene, { width, height }) {
  const actions = [
    { id: "openShop", label: scene.shopOpen ? "Close Shop" : "Shop", enabled: true },
    { id: "continueRun", label: "LEAVE CAMP", enabled: true },
  ];
  rebuildShopSceneButtons(scene, actions);

  const compact = scene.isCompactLayout(width);
  const bar = scene.bottomBarRect || {
    x: 12,
    y: height - 88,
    width: width - 24,
    height: 76,
  };
  const sidePad = 16;
  const shopButton = scene.buttons.get("openShop");
  const showKeyboardHints = scene.shouldShowKeyboardHints(width);

  if (compact) {
    const rowGap = 10;
    const verticalPad = 10;
    const buttonH = Math.max(38, Math.floor((bar.height - verticalPad * 2 - rowGap) * 0.5));
    const buttonW = Math.max(156, bar.width - sidePad * 2);
    const centerX = bar.x + bar.width * 0.5;
    const firstY = bar.y + verticalPad + buttonH * 0.5;
    const secondY = firstY + buttonH + rowGap;

    if (shopButton) {
      shopButton.container.setPosition(centerX, firstY);
      setGradientButtonSize(shopButton, buttonW, buttonH);
      shopButton.text.setFontSize(Math.max(14, Math.round(buttonH * 0.34)));
      shopButton.text.setText(scene.shopOpen ? "Close Shop" : "Shop");
      shopButton.text.setOrigin(0.5, 0.5);
      shopButton.text.setAlign("center");
      shopButton.text.setPosition(0, 0);
      if (shopButton.icon) {
        shopButton.icon.setVisible(false);
      }
      if (shopButton.shortcut) {
        shopButton.shortcut.setVisible(false);
      }
      shopButton.enabled = true;
      applyGradientButtonStyle(shopButton, "idle");
      shopButton.container.setAlpha(1);
      shopButton.container.setVisible(true);
    }

    const continueButton = scene.buttons.get("continueRun");
    if (continueButton) {
      continueButton.container.setPosition(centerX, secondY);
      setGradientButtonSize(continueButton, buttonW, buttonH);
      continueButton.text.setFontSize(Math.max(14, Math.round(buttonH * 0.34)));
      continueButton.text.setText("LEAVE CAMP");
      continueButton.text.setOrigin(0, 0.5);
      continueButton.text.setAlign("left");
      continueButton.text.setPosition(-buttonW * 0.5 + 18, 0);
      if (continueButton.icon) {
        continueButton.icon.setVisible(false);
      }
      if (continueButton.shortcut) {
        continueButton.shortcut.setText("ENTER");
        continueButton.shortcut.setPosition(buttonW * 0.5 - 14, 0);
        continueButton.shortcut.setVisible(showKeyboardHints);
      }
      continueButton.enabled = true;
      applyGradientButtonStyle(continueButton, "idle");
      continueButton.container.setAlpha(1);
      continueButton.container.setVisible(true);
    }
    return;
  }

  const buttonH = Math.max(50, Math.min(62, Math.round(bar.height * 0.72)));
  const shopButtonW = Math.max(170, Math.min(230, Math.round(width * 0.17)));
  const leaveButtonW = Math.max(220, Math.min(320, Math.round(width * 0.24)));
  const y = bar.y + bar.height * 0.5;

  if (shopButton) {
    shopButton.container.setPosition(bar.x + sidePad + shopButtonW * 0.5, y);
    setGradientButtonSize(shopButton, shopButtonW, buttonH);
    shopButton.text.setFontSize(Math.max(17, Math.round(buttonH * 0.34)));
    shopButton.text.setText(scene.shopOpen ? "Close Shop" : "Shop");
    shopButton.text.setOrigin(0.5, 0.5);
    shopButton.text.setAlign("center");
    shopButton.text.setPosition(0, 0);
    if (shopButton.icon) {
      shopButton.icon.setVisible(false);
    }
    if (shopButton.shortcut) {
      shopButton.shortcut.setVisible(false);
    }
    shopButton.enabled = true;
    applyGradientButtonStyle(shopButton, "idle");
    shopButton.container.setAlpha(1);
    shopButton.container.setVisible(true);
  }

  const continueButton = scene.buttons.get("continueRun");
  if (continueButton) {
    continueButton.container.setPosition(bar.x + bar.width - sidePad - leaveButtonW * 0.5, y);
    setGradientButtonSize(continueButton, leaveButtonW, buttonH);
    continueButton.text.setFontSize(Math.max(17, Math.round(buttonH * 0.34)));
    continueButton.text.setText("LEAVE CAMP");
    continueButton.text.setOrigin(0, 0.5);
    continueButton.text.setAlign("left");
    continueButton.text.setPosition(-leaveButtonW * 0.5 + 22, 0);
    if (continueButton.icon) {
      continueButton.icon.setVisible(false);
    }
    if (continueButton.shortcut) {
      continueButton.shortcut.setText("ENTER");
      continueButton.shortcut.setPosition(leaveButtonW * 0.5 - 16, 0);
      continueButton.shortcut.setVisible(showKeyboardHints);
    }
    continueButton.enabled = true;
    applyGradientButtonStyle(continueButton, "idle");
    continueButton.container.setAlpha(1);
    continueButton.container.setVisible(true);
  }
}

export function renderShopSceneTopActions(scene, { width }) {
  if (!scene.topButtons.size) {
    const entries = [
      {
        id: "logs",
        iconKey: SHOP_TOP_ACTION_ICON_KEYS.logs,
        onPress: () => {
          scene.logsModalOpen = !scene.logsModalOpen;
        },
      },
      {
        id: "home",
        iconKey: SHOP_TOP_ACTION_ICON_KEYS.home,
        onPress: () => {
          scene.logsModalOpen = false;
          scene.invokeAction("goHome");
        },
      },
    ];

    entries.forEach((entry) => {
      const button = createGradientButton(scene, {
        id: `shop-top-${entry.id}`,
        label: "",
        styleSet: SHOP_BUTTON_STYLE,
        onPress: entry.onPress,
        width: 42,
        height: 42,
        fontSize: 14,
        hoverScale: 1,
        pressedScale: 0.98,
      });
      button.text.setVisible(false);
      const icon = scene.add
        .image(0, 0, resolveDarkIconTexture(scene, entry.iconKey, scene.darkIconTextureBySource))
        .setDisplaySize(18, 18)
        .setAlpha(0.92);
      button.container.add(icon);
      button.icon = icon;
      button.container.setDepth(230);
      scene.topButtons.set(entry.id, button);
    });
  }

  const buttonSize = width < 760 ? 38 : 42;
  const gap = 8;
  const rightX = width - 20 - buttonSize * 0.5;
  const y = 32;
  const home = scene.topButtons.get("home");
  const logs = scene.topButtons.get("logs");

  if (home) {
    setGradientButtonSize(home, buttonSize, buttonSize);
    home.container.setPosition(rightX, y);
    home.container.setVisible(true);
    if (home.icon) {
      home.icon.setDisplaySize(buttonSize * 0.825, buttonSize * 0.825);
    }
  }

  if (logs) {
    setGradientButtonSize(logs, buttonSize, buttonSize);
    logs.container.setPosition(rightX - (buttonSize + gap), y);
    logs.container.setVisible(true);
    if (logs.icon) {
      logs.icon.setDisplaySize(buttonSize * 0.56, buttonSize * 0.56);
    }
  }
}
