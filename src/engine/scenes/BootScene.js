import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";

const ENEMY_AVATAR_TEXTURE_PREFIX = "__enemy-avatar__";
const ENEMY_AVATAR_KEYS = Object.freeze([
  "pit-croupier",
  "tin-dealer",
  "shiv-shark",
  "brick-smiler",
  "card-warden",
  "ash-gambler",
  "velvet-reaper",
  "latch-queen",
  "bone-accountant",
  "stack-baron",
  "the-house",
  "abyss-banker",
  "null-dealer",
]);

const RUN_ACTION_ICONS = Object.freeze({
  "__run-action-hit__": "/images/icons/hit.png",
  "__run-action-stand__": "/images/icons/stand.png",
  "__run-action-split__": "/images/icons/split.png",
  "__run-action-double__": "/images/icons/double.png",
  "__run-action-deal__": "/images/icons/deal.png",
  "__run-action-confirm__": "/images/icons/deal.png",
});

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
    Object.entries(RUN_ACTION_ICONS).forEach(([textureKey, path]) => {
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, path);
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
