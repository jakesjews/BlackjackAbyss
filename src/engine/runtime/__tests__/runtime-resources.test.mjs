import { describe, expect, it, vi } from "vitest";
import { createRuntimeResources } from "../core/runtime-resources.js";

describe("runtime resources", () => {
  it("creates avatar helpers and passive thumb cache", () => {
    const sanitizeEnemyAvatarKey = vi.fn((name) => String(name).toLowerCase());
    const ensureEnemyAvatarLoaded = vi.fn((key) => ({ key, status: "ready" }));
    const createEnemyAvatarLoader = vi.fn(() => ({
      sanitizeEnemyAvatarKey,
      ensureEnemyAvatarLoaded,
    }));
    const globalWindow = { Image: class {} };

    const resources = createRuntimeResources({
      globalWindow,
      createEnemyAvatarLoader,
      sourceRoots: ["/images/avatars"],
    });

    expect(createEnemyAvatarLoader).toHaveBeenCalledWith({
      globalWindow,
      sourceRoots: ["/images/avatars"],
    });
    expect(resources.sanitizeEnemyAvatarKey("Pit Croupier")).toBe("pit croupier");
    expect(resources.ensureEnemyAvatarLoaded("pit-croupier")).toEqual({ key: "pit-croupier", status: "ready" });
    expect(resources.passiveThumbCache).toBeInstanceOf(Map);
  });

  it("falls back safely when loader factory is missing", () => {
    const resources = createRuntimeResources({
      globalWindow: {},
    });

    expect(resources.sanitizeEnemyAvatarKey("Anything")).toBe("");
    expect(resources.ensureEnemyAvatarLoaded("anything")).toBeNull();
    expect(resources.passiveThumbCache).toBeInstanceOf(Map);
  });
});
