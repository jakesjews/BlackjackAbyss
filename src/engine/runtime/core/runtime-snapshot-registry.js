import { buildPhaserRunSnapshot as buildPhaserRunSnapshotFromModule } from "./phaser-run-snapshot.js";
import {
  buildPhaserRewardSnapshot as buildPhaserRewardSnapshotFromModule,
  buildPhaserShopSnapshot as buildPhaserShopSnapshotFromModule,
} from "./shop-reward-snapshots.js";
import { buildPhaserOverlaySnapshot as buildPhaserOverlaySnapshotFromModule } from "./overlay-snapshot.js";

export function createRuntimeSnapshotRegistry({
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
  buildPhaserRunSnapshotFn = buildPhaserRunSnapshotFromModule,
  buildPhaserRewardSnapshotFn = buildPhaserRewardSnapshotFromModule,
  buildPhaserShopSnapshotFn = buildPhaserShopSnapshotFromModule,
  buildPhaserOverlaySnapshotFn = buildPhaserOverlaySnapshotFromModule,
}) {
  function buildPhaserRunSnapshot() {
    return buildPhaserRunSnapshotFn({
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
    });
  }

  function buildPhaserRewardSnapshot() {
    return buildPhaserRewardSnapshotFn({
      state,
      passiveDescription,
      passiveThumbUrl,
      relicRarityMeta,
      normalizeRelicRarity,
      getRunEventLog,
    });
  }

  function buildPhaserShopSnapshot() {
    return buildPhaserShopSnapshotFn({
      state,
      nonNegInt,
      clampNumber,
      shopItemName,
      shopItemDescription,
      getRunEventLog,
    });
  }

  function buildPhaserOverlaySnapshot() {
    return buildPhaserOverlaySnapshotFn({
      state,
      collectionEntries,
      relicRarityMeta: relicRarityMetaTable,
      passiveThumbUrl,
      passiveDescription,
    });
  }

  return {
    buildPhaserRunSnapshot,
    buildPhaserRewardSnapshot,
    buildPhaserShopSnapshot,
    buildPhaserOverlaySnapshot,
  };
}
