import {
  collectionEntries as collectionEntriesFromModule,
  collectionPageLayout as collectionPageLayoutFromModule,
} from "./passive-view.js";
import {
  getRunEventLog as getRunEventLogFromModule,
  hasSavedRunState,
  hidePassiveTooltipState,
  moveSelectionState,
  openCollectionState,
} from "./runtime-ui-state.js";

export function createRuntimeUiHelpers({
  state,
  playUiSfx,
  nonNegInt,
  createProfile,
  relics,
  bossRelic,
  normalizeRelicRarity,
  rarityMeta,
  rarityOrder,
  isRelicUnlocked,
  relicUnlockLabel,
}) {
  function getRunEventLog(run = state.run) {
    return getRunEventLogFromModule(run);
  }

  function hidePassiveTooltip() {
    hidePassiveTooltipState(state);
  }

  function moveSelection(delta, length) {
    moveSelectionState({ state, delta, length, playUiSfx });
  }

  function hasSavedRun() {
    return hasSavedRunState(state);
  }

  function collectionEntries(profile = state.profile) {
    const safeProfile = profile || createProfile();
    return collectionEntriesFromModule({
      profile: safeProfile,
      relics: [...relics, bossRelic],
      normalizeRelicRarity,
      rarityMeta,
      rarityOrder,
      isRelicUnlocked,
      relicUnlockLabel,
      nonNegInt,
    });
  }

  function collectionPageLayout() {
    return collectionPageLayoutFromModule(Boolean(state.viewport?.portraitZoomed));
  }

  function openCollection(page = 0) {
    openCollectionState({
      state,
      page,
      nonNegInt,
      playUiSfx,
    });
  }

  return {
    getRunEventLog,
    hidePassiveTooltip,
    moveSelection,
    hasSavedRun,
    collectionEntries,
    collectionPageLayout,
    openCollection,
  };
}
