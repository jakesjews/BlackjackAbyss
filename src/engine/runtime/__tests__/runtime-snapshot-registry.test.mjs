import { describe, expect, it, vi } from "vitest";
import { createRuntimeSnapshotRegistry } from "../core/runtime-snapshot-registry.js";

describe("runtime snapshot registry", () => {
  it("wires run/reward/shop/overlay snapshot builders through a single registry", () => {
    const state = { mode: "playing" };
    const isEncounterIntroActive = vi.fn();
    const canPlayerAct = vi.fn();
    const canSplitCurrentHand = vi.fn();
    const canAdvanceDeal = vi.fn();
    const canDoubleDown = vi.fn();
    const handTotal = vi.fn();
    const visibleDealerTotal = vi.fn();
    const buildTransitionSnapshot = vi.fn();
    const getRunEventLog = vi.fn();
    const passiveStacksForRun = vi.fn();
    const relicRarityMeta = vi.fn();
    const passiveDescription = vi.fn();
    const passiveThumbUrl = vi.fn();
    const normalizeRelicRarity = vi.fn();
    const nonNegInt = vi.fn();
    const clampNumber = vi.fn();
    const shopItemName = vi.fn();
    const shopItemDescription = vi.fn();
    const collectionEntries = vi.fn();
    const relicRarityMetaTable = { common: { glow: "#fff" } };

    const buildPhaserRunSnapshotFn = vi.fn(() => ({ mode: "playing" }));
    const buildPhaserRewardSnapshotFn = vi.fn(() => ({ mode: "reward" }));
    const buildPhaserShopSnapshotFn = vi.fn(() => ({ mode: "shop" }));
    const buildPhaserOverlaySnapshotFn = vi.fn(() => ({ mode: "collection" }));

    const registry = createRuntimeSnapshotRegistry({
      state,
      isEncounterIntroActive,
      canPlayerAct,
      canSplitCurrentHand,
      canAdvanceDeal,
      canDoubleDown,
      handTotal,
      visibleDealerTotal,
      buildTransitionSnapshot,
      getRunEventLog,
      passiveStacksForRun,
      relicRarityMeta,
      passiveDescription,
      passiveThumbUrl,
      normalizeRelicRarity,
      nonNegInt,
      clampNumber,
      shopItemName,
      shopItemDescription,
      collectionEntries,
      relicRarityMetaTable,
      buildPhaserRunSnapshotFn,
      buildPhaserRewardSnapshotFn,
      buildPhaserShopSnapshotFn,
      buildPhaserOverlaySnapshotFn,
    });

    expect(registry.buildPhaserRunSnapshot()).toEqual({ mode: "playing" });
    expect(registry.buildPhaserRewardSnapshot()).toEqual({ mode: "reward" });
    expect(registry.buildPhaserShopSnapshot()).toEqual({ mode: "shop" });
    expect(registry.buildPhaserOverlaySnapshot()).toEqual({ mode: "collection" });

    expect(buildPhaserRunSnapshotFn).toHaveBeenCalledWith(
      expect.objectContaining({
        state,
        isEncounterIntroActive,
        canPlayerAct,
        canSplitCurrentHand,
        canAdvanceDeal,
        canDoubleDown,
        handTotal,
        visibleDealerTotal,
        buildTransitionSnapshot,
        getRunEventLog,
        passiveStacksForRun,
        relicRarityMeta,
        passiveDescription,
        passiveThumbUrl,
      })
    );
    expect(buildPhaserRewardSnapshotFn).toHaveBeenCalledWith(
      expect.objectContaining({
        state,
        passiveDescription,
        passiveThumbUrl,
        relicRarityMeta,
        normalizeRelicRarity,
        getRunEventLog,
      })
    );
    expect(buildPhaserShopSnapshotFn).toHaveBeenCalledWith(
      expect.objectContaining({
        state,
        nonNegInt,
        clampNumber,
        shopItemName,
        shopItemDescription,
        getRunEventLog,
      })
    );
    expect(buildPhaserOverlaySnapshotFn).toHaveBeenCalledWith(
      expect.objectContaining({
        state,
        collectionEntries,
        relicRarityMeta: relicRarityMetaTable,
        passiveThumbUrl,
        passiveDescription,
      })
    );
  });
});
