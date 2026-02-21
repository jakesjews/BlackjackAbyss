export function createEnemyAvatarLoader({
  globalWindow,
  sourceRoots = [],
}) {
  const enemyAvatarCache = new Map();

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

  function enemyAvatarSourcesForKey(key) {
    return sourceRoots.map((root) => `${root}/${key}.png`);
  }

  function ensureEnemyAvatarLoaded(key) {
    if (!key) {
      return null;
    }
    const cached = enemyAvatarCache.get(key);
    if (cached && (cached.status === "loading" || cached.status === "ready")) {
      return cached;
    }

    const image = new globalWindow.Image();
    image.decoding = "async";
    const entry = {
      key,
      status: "loading",
      image,
      sourceIndex: 0,
    };
    enemyAvatarCache.set(key, entry);
    const sources = enemyAvatarSourcesForKey(key);

    const tryNextSource = () => {
      if (entry.sourceIndex >= sources.length) {
        entry.status = "error";
        return;
      }
      const src = sources[entry.sourceIndex];
      image.onload = () => {
        entry.status = "ready";
      };
      image.onerror = () => {
        entry.sourceIndex += 1;
        tryNextSource();
      };
      image.src = src;
    };

    tryNextSource();
    return entry;
  }

  return {
    sanitizeEnemyAvatarKey,
    ensureEnemyAvatarLoaded,
  };
}
