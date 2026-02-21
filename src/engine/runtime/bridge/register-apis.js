export const MENU_API_METHODS = Object.freeze([
  "startRun",
  "resumeRun",
  "openCollection",
  "hasSavedRun",
]);

export const RUN_API_METHODS = Object.freeze([
  "getSnapshot",
  "hit",
  "stand",
  "doubleDown",
  "split",
  "deal",
  "confirmIntro",
  "fireballLaunch",
  "fireballImpact",
  "startEnemyDefeatTransition",
  "card",
  "goHome",
]);

export const REWARD_API_METHODS = Object.freeze(["getSnapshot", "prev", "next", "claim", "selectIndex", "goHome"]);
export const SHOP_API_METHODS = Object.freeze(["getSnapshot", "prev", "next", "buy", "continueRun", "selectIndex", "goHome"]);
export const OVERLAY_API_METHODS = Object.freeze(["getSnapshot", "prevPage", "nextPage", "backToMenu", "restart", "confirm"]);

export function assertApiContract(api, methodNames, label) {
  if (!api || typeof api !== "object") {
    throw new Error(`${label} API contract missing`);
  }
  methodNames.forEach((methodName) => {
    if (typeof api[methodName] !== "function") {
      throw new Error(`${label} API contract missing method: ${methodName}`);
    }
  });
}
