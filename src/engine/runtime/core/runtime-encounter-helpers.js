export function createRuntimeEncounterHelpers({
  state,
  clampNumber,
  runtimeRandom,
  resolveRoomType,
  createDeck,
  shuffle,
  createEnemyFn,
  buildEnemyIntroDialogueFn,
  createEncounterIntroStateFn,
  createEncounterFn,
}) {
  function createEnemy(floor, room, type) {
    return createEnemyFn({
      floor,
      room,
      type,
      random: runtimeRandom,
    });
  }

  function buildEnemyIntroDialogue(enemy) {
    const next = buildEnemyIntroDialogueFn({
      enemy,
      lastIntroDialogue: state.lastIntroDialogue,
      random: runtimeRandom,
    });
    state.lastIntroDialogue = next.nextLastIntroDialogue;
    return next.dialogue;
  }

  function createEncounterIntroState(enemy, introLike = null) {
    return createEncounterIntroStateFn({
      enemy,
      introLike,
      clampNumberFn: clampNumber,
      buildEnemyIntroDialogueFn: buildEnemyIntroDialogue,
    });
  }

  function createEncounter(run) {
    return createEncounterFn({
      run,
      createEnemyFn: createEnemy,
      createEncounterIntroStateFn: createEncounterIntroState,
      resolveRoomTypeFn: resolveRoomType,
      createDeckFn: createDeck,
      shuffleFn: (cards) => shuffle(cards, runtimeRandom),
    });
  }

  return {
    createEnemy,
    createEncounterIntroState,
    createEncounter,
  };
}
