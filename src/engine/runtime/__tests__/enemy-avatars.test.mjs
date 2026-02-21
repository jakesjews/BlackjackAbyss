import { describe, expect, it } from "vitest";
import { createEnemyAvatarLoader } from "../core/enemy-avatars.js";

class MockImage {
  constructor() {
    this.decoding = "";
    this._src = "";
    this.onload = null;
    this.onerror = null;
  }

  set src(value) {
    this._src = value;
  }

  get src() {
    return this._src;
  }
}

describe("enemy avatar loader", () => {
  it("sanitizes avatar keys", () => {
    const loader = createEnemyAvatarLoader({
      globalWindow: { Image: MockImage },
      sourceRoots: ["/images/avatars"],
    });
    expect(loader.sanitizeEnemyAvatarKey("  Pit Boss #1  ")).toBe("pit-boss-1");
    expect(loader.sanitizeEnemyAvatarKey("")).toBe("");
    expect(loader.sanitizeEnemyAvatarKey(null)).toBe("");
  });

  it("loads from source roots with fallback and caches loading entries", () => {
    const loader = createEnemyAvatarLoader({
      globalWindow: { Image: MockImage },
      sourceRoots: ["/a", "/b"],
    });

    const entry = loader.ensureEnemyAvatarLoaded("dealer");
    expect(entry.status).toBe("loading");
    expect(entry.image.src).toBe("/a/dealer.png");

    const cachedWhileLoading = loader.ensureEnemyAvatarLoaded("dealer");
    expect(cachedWhileLoading).toBe(entry);

    entry.image.onerror();
    expect(entry.image.src).toBe("/b/dealer.png");

    entry.image.onload();
    expect(entry.status).toBe("ready");

    const cachedReady = loader.ensureEnemyAvatarLoaded("dealer");
    expect(cachedReady).toBe(entry);
  });

  it("marks error when all avatar sources fail", () => {
    const loader = createEnemyAvatarLoader({
      globalWindow: { Image: MockImage },
      sourceRoots: ["/a"],
    });
    const entry = loader.ensureEnemyAvatarLoaded("void");
    expect(entry.image.src).toBe("/a/void.png");
    entry.image.onerror();
    expect(entry.status).toBe("error");
  });
});
