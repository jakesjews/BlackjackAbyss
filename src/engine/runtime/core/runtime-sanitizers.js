import {
  sanitizeCardList as sanitizeCardListFromModule,
  sanitizeEncounter as sanitizeEncounterFromModule,
  sanitizeRun as sanitizeRunFromModule,
} from "./state-sanitizers.js";

export function createRuntimeSanitizers({
  ranks,
  suits,
  createRun,
  nonNegInt,
  clampNumber,
  mergePlayerStats,
  resolveRoomType,
  createEnemy,
  createEncounterIntroState,
  maxSplitHands,
}) {
  function sanitizeCardList(listLike) {
    return sanitizeCardListFromModule(listLike, { ranks, suits });
  }

  function sanitizeRun(runLike) {
    return sanitizeRunFromModule({
      runLike,
      createRun,
      nonNegInt,
      clampNumber,
      mergePlayerStats,
    });
  }

  function sanitizeEncounter(encounterLike, run) {
    return sanitizeEncounterFromModule({
      encounterLike,
      run,
      resolveRoomType,
      createEnemy,
      createEncounterIntroState,
      sanitizeCardListFn: sanitizeCardList,
      maxSplitHands,
      nonNegInt,
      clampNumber,
    });
  }

  return {
    sanitizeRun,
    sanitizeEncounter,
  };
}
