import Phaser from "phaser";
import { createGradientButton, setGradientButtonSize } from "../ui/gradient-button.js";
import { resolveDarkIconTexture } from "../ui/texture-processing.js";
import {
  RUN_ACTION_ICON_KEYS,
  RUN_ACTION_SHORTCUTS,
  RUN_MOBILE_BUTTON_SCALE,
  RUN_TOP_ACTION_ICON_KEYS,
} from "./run-scene-config.js";
import { closeRunSceneModals, toggleRunSceneModal } from "./run-scene-modals.js";

export function rebuildRunSceneButtons(scene, actions, styleSet) {
  const safeActions = Array.isArray(actions) ? actions : [];
  const signature = safeActions.map((entry) => entry.id).join("|");
  if (signature === scene.buttonSignature) {
    return;
  }
  scene.buttonSignature = signature;
  scene.buttons.forEach((button) => button.container.destroy());
  scene.buttons.clear();

  safeActions.forEach((action) => {
    const button = createGradientButton(scene, {
      id: action.id,
      label: action.label,
      styleSet,
      onPress: () => scene.invokeAction(action.id),
      width: 210,
      height: 64,
      fontSize: 28,
    });
    const icon = scene.add
      .image(
        0,
        0,
        resolveDarkIconTexture(
          scene,
          RUN_ACTION_ICON_KEYS[action.id] || RUN_ACTION_ICON_KEYS.deal,
          scene.darkIconTextureBySource
        )
      )
      .setDisplaySize(18, 18);
    const shortcut = scene.add
      .text(0, 0, "", {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: "13px",
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

export function renderRunSceneButtons(
  scene,
  {
    snapshot,
    width,
    height,
    runLayout,
    deferResolutionUi = false,
    styleSet,
    applyButtonStyle,
  }
) {
  const actions = [];
  const introActive = Boolean(snapshot?.intro?.active);
  const status = snapshot?.status || {};
  const deferActionInput =
    Boolean(deferResolutionUi) || scene.hasActiveResolutionAnimations() || scene.hasActiveCardDealAnimations();
  const compact = Boolean(runLayout?.compact);

  if (!introActive) {
    const showTurnActions = Boolean(status.canHit || status.canStand || status.canDouble || status.canSplit);
    if (showTurnActions) {
      if (status.canHit) {
        actions.push({ id: "hit", label: "HIT", enabled: !deferActionInput });
      }
      if (status.canStand) {
        actions.push({ id: "stand", label: "STAND", enabled: !deferActionInput });
      }
      actions.push({ id: "doubleDown", label: "DOUBLE", enabled: Boolean(status.canDouble) && !deferActionInput });
      if (status.canSplit) {
        actions.push({ id: "split", label: "SPLIT", enabled: !deferActionInput });
      }
    } else {
      actions.push({ id: "deal", label: "DEAL", enabled: Boolean(status.canDeal) && !deferActionInput });
    }
  }

  rebuildRunSceneButtons(scene, actions, styleSet);
  const count = actions.length;
  const showKeyboardHints = scene.shouldShowKeyboardHints(width);
  const mobileButtonScale = compact ? RUN_MOBILE_BUTTON_SCALE : 1;
  let spacing = compact ? Math.max(6, Math.round(8 * mobileButtonScale)) : 14;
  const rowGap = compact ? Math.max(8, Math.round(10 * mobileButtonScale)) : 14;
  const singleWide = count <= 1;
  const buttonH = compact ? Math.max(36, Math.round(50 * mobileButtonScale)) : 56;
  const bandW = Math.max(220, width - runLayout.sidePad * 2 - 8);
  const maxPerRow = compact ? 2 : Math.max(1, count);
  const rowCount = count > 0 ? Math.ceil(count / maxPerRow) : 0;
  let buttonW = 0;
  if (compact) {
    let compactButtonW = 0;
    if (singleWide) {
      const singleActionId = actions[0] ? actions[0].id : "";
      const singleWideFactor = singleActionId === "deal" ? 0.42 : 0.62;
      compactButtonW = Phaser.Math.Clamp(Math.round(bandW * singleWideFactor), 160, 320);
    } else {
      compactButtonW = Phaser.Math.Clamp(Math.floor((bandW - spacing) / 2), 132, 220);
    }
    buttonW = Math.max(98, Math.round(compactButtonW * mobileButtonScale));
  } else {
    const singleActionId = singleWide && actions[0] ? actions[0].id : "";
    const singleWideFactor = singleActionId === "deal" ? 0.34 : 0.62;
    buttonW = singleWide
      ? Phaser.Math.Clamp(
        Math.round(bandW * singleWideFactor),
        164,
        300
      )
      : Phaser.Math.Clamp(
        Math.floor((bandW - spacing * Math.max(0, count - 1)) / Math.max(1, count)),
        160,
        236
      );
    if (!singleWide && count > 1) {
      let totalCandidate = buttonW * count + spacing * (count - 1);
      if (totalCandidate > bandW) {
        buttonW = Math.max(120, Math.floor((bandW - spacing * (count - 1)) / count));
        totalCandidate = buttonW * count + spacing * (count - 1);
        if (totalCandidate > bandW) {
          spacing = 10;
          buttonW = Math.max(120, Math.floor((bandW - spacing * (count - 1)) / count));
        }
      }
    }
  }
  const totalButtonH = rowCount > 0 ? rowCount * buttonH + Math.max(0, rowCount - 1) * rowGap : 0;
  const verticalInset = Math.max(0, Math.round((runLayout.bottomBarH - totalButtonH) * 0.5));
  const blockTop = height - runLayout.bottomBarH + verticalInset;

  actions.forEach((action, index) => {
    const button = scene.buttons.get(action.id);
    if (!button) {
      return;
    }
    const row = Math.floor(index / maxPerRow);
    const rowStart = row * maxPerRow;
    const itemsInRow = Math.min(maxPerRow, Math.max(0, count - rowStart));
    const col = index - rowStart;
    const rowWidth = itemsInRow > 0 ? buttonW * itemsInRow + spacing * Math.max(0, itemsInRow - 1) : buttonW;
    const x = width * 0.5 - rowWidth * 0.5 + buttonW * 0.5 + col * (buttonW + spacing);
    const y = blockTop + row * (buttonH + rowGap) + buttonH * 0.5;
    const resolvedW = buttonW;
    const resolvedH = buttonH;
    button.container.setPosition(x, y);
    setGradientButtonSize(button, resolvedW, resolvedH);

    const iconKey = resolveDarkIconTexture(
      scene,
      RUN_ACTION_ICON_KEYS[action.id] || RUN_ACTION_ICON_KEYS.deal,
      scene.darkIconTextureBySource
    );
    if (button.icon) {
      button.icon.setTexture(iconKey);
      button.icon.setDisplaySize(
        compact ? Math.max(14, Math.round(20 * mobileButtonScale)) : 27,
        compact ? Math.max(14, Math.round(20 * mobileButtonScale)) : 27
      );
      button.icon.setAlpha(0.92);
      button.icon.setVisible(true);
    }
    const shortcut = RUN_ACTION_SHORTCUTS[action.id] || "";
    if (button.shortcut) {
      button.shortcut.setText(shortcut);
      button.shortcut.setFontSize(compact ? Math.max(7, Math.round(9 * mobileButtonScale)) : 13);
      button.shortcut.setColor("#000000");
      button.shortcut.setAlpha(0.5);
      button.shortcut.setVisible(showKeyboardHints && Boolean(shortcut));
    }

    button.text.setText(action.label);
    const fontSize = compact
      ? Math.max(11, Math.round((action.id === "confirmIntro" ? 15 : 14) * mobileButtonScale))
      : action.id === "confirmIntro"
        ? 20
        : 18;
    button.text.setFontSize(fontSize);
    button.text.setFontStyle(compact ? "800" : "700");
    const hasIcon = Boolean(button.icon?.visible);
    const iconPad = hasIcon
      ? (compact ? Math.round(28 * mobileButtonScale) : 38)
      : (compact ? Math.round(10 * mobileButtonScale) : 10);
    button.text.setOrigin(0, 0.5);
    button.text.setPosition(-resolvedW * 0.5 + iconPad + (compact ? Math.round(4 * mobileButtonScale) : 10), 0);
    button.text.setAlign("left");
    if (button.icon) {
      button.icon.setPosition(-resolvedW * 0.5 + (compact ? Math.round(16 * mobileButtonScale) : 24), 0);
    }
    if (button.shortcut) {
      button.shortcut.setPosition(resolvedW * 0.5 - (compact ? Math.round(12 * mobileButtonScale) : 20), 0);
    }

    applyButtonStyle(button, action.enabled ? "idle" : "disabled");
    button.enabled = action.enabled;
    button.container.setAlpha(action.enabled ? 1 : 0.82);
    button.container.setVisible(true);
  });
}

export function renderRunSceneTopActions(scene, { snapshot, width, runLayout, styleSet }) {
  if (!snapshot) {
    scene.topButtons.forEach((button) => button.container.setVisible(false));
    closeRunSceneModals(scene);
    return;
  }
  if (!scene.topButtons.size) {
    const definitions = [
      {
        id: "logs",
        iconKey: RUN_TOP_ACTION_ICON_KEYS.logs,
        onPress: () => {
          toggleRunSceneModal(scene, "logs");
        },
      },
      {
        id: "home",
        iconKey: RUN_TOP_ACTION_ICON_KEYS.home,
        onPress: () => {
          closeRunSceneModals(scene);
          scene.invokeAction("goHome");
        },
      },
    ];
    definitions.forEach((entry) => {
      const button = createGradientButton(scene, {
        id: `top-${entry.id}`,
        label: "",
        styleSet,
        onPress: entry.onPress,
        width: 44,
        height: 44,
        fontSize: 14,
        hoverScale: 1,
        pressedScale: 0.98,
      });
      button.text.setVisible(false);
      const icon = scene.add
        .image(0, 0, resolveDarkIconTexture(scene, entry.iconKey, scene.darkIconTextureBySource))
        .setDisplaySize(16, 16)
        .setAlpha(0.92);
      button.container.add(icon);
      button.icon = icon;
      button.container.setDepth(230);
      scene.topButtons.set(entry.id, button);
    });
  }
  const buttonSize = runLayout.compact ? 38 : 42;
  const gap = 8;
  const rightX = width - runLayout.sidePad - buttonSize * 0.5;
  const y = Math.round(runLayout.topBarH * 0.5);
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
