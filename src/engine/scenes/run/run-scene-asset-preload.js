import { ENEMY_AVATAR_KEY_BY_NAME, ENEMY_AVATAR_TEXTURE_PREFIX, RUN_ACTION_ICONS, RUN_ACTION_ICON_KEYS, RUN_CARD_BACKPLATE_KEY, RUN_CHIPS_ICON_KEY, RUN_PLAYER_AVATAR_KEY, RUN_RELIC_ICON_KEY, RUN_TOP_ACTION_ICONS, RUN_TOP_ACTION_ICON_KEYS, RUN_WATERMARK_KEY } from "./run-scene-config.js";

export function preloadRunSceneAssets(scene) {
  const avatarKeys = new Set(Object.values(ENEMY_AVATAR_KEY_BY_NAME));
  avatarKeys.forEach((avatarKey) => {
    const textureKey = `${ENEMY_AVATAR_TEXTURE_PREFIX}${avatarKey}`;
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, `/images/avatars/${avatarKey}.png`);
    }
  });
  Object.entries(RUN_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, RUN_ACTION_ICONS[actionId] || "/images/icons/deal.png");
    }
  });
  Object.entries(RUN_TOP_ACTION_ICON_KEYS).forEach(([actionId, textureKey]) => {
    if (!scene.textures.exists(textureKey)) {
      scene.load.image(textureKey, RUN_TOP_ACTION_ICONS[actionId] || "/images/icons/home.png");
    }
  });
  if (!scene.textures.exists(RUN_CHIPS_ICON_KEY)) {
    scene.load.image(RUN_CHIPS_ICON_KEY, "/images/icons/chips.png");
  }
  if (!scene.textures.exists(RUN_RELIC_ICON_KEY)) {
    scene.load.image(RUN_RELIC_ICON_KEY, "/images/icons/relic.png");
  }
  if (!scene.textures.exists(RUN_PLAYER_AVATAR_KEY)) {
    scene.load.image(RUN_PLAYER_AVATAR_KEY, "/images/avatars/player.png");
  }
  if (!scene.textures.exists(RUN_CARD_BACKPLATE_KEY)) {
    scene.load.image(RUN_CARD_BACKPLATE_KEY, "/images/backplates/backplate_default.png");
  }
  if (!scene.textures.exists(RUN_WATERMARK_KEY)) {
    scene.load.image(RUN_WATERMARK_KEY, "/images/watermark.png");
  }
}
