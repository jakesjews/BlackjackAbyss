import {
  passiveStacksForRun as passiveStacksForRunFromModule,
  passiveThumbUrl as passiveThumbUrlFromModule,
} from "./passive-view.js";

export function createRuntimePassiveHelpers({
  state,
  passiveThumbCache,
  applyHexAlpha,
  relicById,
  nonNegInt,
}) {
  function passiveThumbUrl(relic) {
    return passiveThumbUrlFromModule({
      relic,
      cache: passiveThumbCache,
      applyHexAlpha,
    });
  }

  function passiveStacksForRun(run = state.run) {
    return passiveStacksForRunFromModule({
      run,
      relicById,
      nonNegInt,
    });
  }

  return {
    passiveThumbUrl,
    passiveStacksForRun,
  };
}
