import { createGradientButton, setGradientButtonSize } from "../ui/gradient-button.js";
import { resolveDarkIconTexture } from "../ui/texture-processing.js";
import {
  REWARD_BUTTON_STYLE,
  REWARD_TOP_ACTION_ICON_KEYS,
} from "./reward-scene-config.js";

export function rebuildRewardSceneButtons(scene, actions) {
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
      styleSet: REWARD_BUTTON_STYLE,
      onPress: () => scene.invokeAction(action.id),
      width: 210,
      height: 64,
      fontSize: 28,
    });
    scene.buttons.set(action.id, button);
  });
}

export function renderRewardSceneTopActions(scene, { width }) {
  if (!scene.topButtons.size) {
    const entries = [
      {
        id: "logs",
        iconKey: REWARD_TOP_ACTION_ICON_KEYS.logs,
        onPress: () => {
          scene.logsModalOpen = !scene.logsModalOpen;
        },
      },
      {
        id: "home",
        iconKey: REWARD_TOP_ACTION_ICON_KEYS.home,
        onPress: () => {
          scene.logsModalOpen = false;
          scene.invokeAction("goHome");
        },
      },
    ];

    entries.forEach((entry) => {
      const button = createGradientButton(scene, {
        id: `reward-top-${entry.id}`,
        label: "",
        styleSet: REWARD_BUTTON_STYLE,
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
