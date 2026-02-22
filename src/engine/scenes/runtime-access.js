export function getRuntime(scene) {
  return scene?.game?.__ABYSS_RUNTIME__ || null;
}

export function isVisualFxDisabled(scene) {
  return Boolean(getRuntime(scene)?.testFlags?.visual?.disableFx);
}

export function isCoarsePointer(scene) {
  const game = scene?.sys?.game || scene?.game;
  const hasTouchInput = Boolean(game?.device?.input?.touch);
  const mouseEnabled = scene?.input?.manager?.mouse?.enabled !== false;
  return hasTouchInput && !mouseEnabled;
}

function getRuntimeApis(scene) {
  const runtime = getRuntime(scene);
  return runtime?.apis && typeof runtime.apis === "object" ? runtime.apis : null;
}

function getRuntimeApi(scene, runtimeKey) {
  const runtimeApis = getRuntimeApis(scene);
  if (!runtimeApis) {
    return null;
  }
  const api = runtimeApis[runtimeKey];
  return api && typeof api === "object" ? api : null;
}

export function tickRuntime(scene, time, delta) {
  const runtime = getRuntime(scene);
  if (runtime && typeof runtime.tick === "function") {
    runtime.tick(delta, time);
  }
}

export function getMenuActions(scene) {
  return getRuntimeApi(scene, "menuActions");
}

export function getRunApi(scene) {
  return getRuntimeApi(scene, "runApi");
}

export function getRewardApi(scene) {
  return getRuntimeApi(scene, "rewardApi");
}

export function getShopApi(scene) {
  return getRuntimeApi(scene, "shopApi");
}

export function getOverlayApi(scene) {
  return getRuntimeApi(scene, "overlayApi");
}
