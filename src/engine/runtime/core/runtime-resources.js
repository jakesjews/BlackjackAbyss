export function createRuntimeResources({
  globalWindow,
  createEnemyAvatarLoader,
  sourceRoots = ["/images/avatars"],
}) {
  const makeEnemyAvatarLoader =
    typeof createEnemyAvatarLoader === "function"
      ? createEnemyAvatarLoader
      : () => ({
          sanitizeEnemyAvatarKey: () => "",
          ensureEnemyAvatarLoaded: () => null,
        });

  const enemyAvatarLoader = makeEnemyAvatarLoader({
    globalWindow,
    sourceRoots,
  });

  return {
    sanitizeEnemyAvatarKey:
      typeof enemyAvatarLoader?.sanitizeEnemyAvatarKey === "function"
        ? enemyAvatarLoader.sanitizeEnemyAvatarKey
        : () => "",
    ensureEnemyAvatarLoaded:
      typeof enemyAvatarLoader?.ensureEnemyAvatarLoaded === "function"
        ? enemyAvatarLoader.ensureEnemyAvatarLoaded
        : () => null,
    passiveThumbCache: new Map(),
  };
}
