import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import {
  ENEMY_AVATAR_KEY_BY_NAME,
  ENEMY_AVATAR_TEXTURE_PREFIX,
  RUN_ACTION_ICON_KEYS,
  RUN_ACTION_ICONS,
} from "./run/run-scene-config.js";

const ENEMY_AVATAR_KEYS = Object.freeze(Array.from(new Set(Object.values(ENEMY_AVATAR_KEY_BY_NAME))));

const REWARD_CHIPS_ICON_KEY = "__reward-chips-icon__";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload() {
    ENEMY_AVATAR_KEYS.forEach((avatarKey) => {
      const textureKey = `${ENEMY_AVATAR_TEXTURE_PREFIX}${avatarKey}`;
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, `/images/avatars/${avatarKey}.png`);
      }
    });
    Object.entries(RUN_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, RUN_ACTION_ICONS[actionId] || "/images/icons/deal.png");
      }
    });
    if (!this.textures.exists(REWARD_CHIPS_ICON_KEY)) {
      this.load.image(REWARD_CHIPS_ICON_KEY, "/images/icons/chips.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
  }
}
