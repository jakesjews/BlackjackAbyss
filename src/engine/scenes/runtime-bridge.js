export function getRuntime(scene) {
  return scene?.game?.__ABYSS_RUNTIME__ || null;
}

export function getBridge(scene) {
  return getRuntime(scene)?.bridge || null;
}

function getBridgeApi(scene, methodName) {
  const bridge = getBridge(scene);
  if (!bridge || typeof bridge[methodName] !== "function") {
    return null;
  }
  return bridge[methodName]();
}

export function tickRuntime(scene, time, delta) {
  const runtime = getRuntime(scene);
  if (runtime && typeof runtime.tick === "function") {
    runtime.tick(delta, time);
  }
}

export function getMenuActions(scene) {
  return getBridgeApi(scene, "getMenuActions");
}

export function getRunApi(scene) {
  return getBridgeApi(scene, "getRunApi");
}

export function getRewardApi(scene) {
  return getBridgeApi(scene, "getRewardApi");
}

export function getShopApi(scene) {
  return getBridgeApi(scene, "getShopApi");
}

export function getOverlayApi(scene) {
  return getBridgeApi(scene, "getOverlayApi");
}
