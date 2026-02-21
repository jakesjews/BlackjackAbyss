export function registerBridgeApi({ bridge, setterName, api, methods, label, assertApiContract }) {
  if (!bridge || typeof bridge[setterName] !== "function") {
    return false;
  }
  assertApiContract(api, methods, label);
  bridge[setterName](api);
  return true;
}
