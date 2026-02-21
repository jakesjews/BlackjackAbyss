const FAST_PATH_TARGETS = new Set(["none", "reward", "shop"]);

function asNonNegativeInteger(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

function normalizeFastPath(rawFastPath) {
  const source = rawFastPath && typeof rawFastPath === "object" ? rawFastPath : {};
  const afterHands = Math.max(1, asNonNegativeInteger(source.afterHands, 1));
  const target = typeof source.target === "string" && FAST_PATH_TARGETS.has(source.target)
    ? source.target
    : "none";
  return {
    enabled: Boolean(source.enabled),
    afterHands,
    target,
  };
}

export function readRuntimeTestFlags(globalObject = globalThis) {
  const isProduction = Boolean(import.meta.env?.PROD);
  if (isProduction) {
    return {
      fastPath: {
        enabled: false,
        afterHands: 1,
        target: "none",
      },
    };
  }

  const raw = globalObject && typeof globalObject === "object" ? globalObject.__ABYSS_TEST_FLAGS__ : null;
  const source = raw && typeof raw === "object" ? raw : {};
  const fastPath = normalizeFastPath(source.fastPath);
  if (!fastPath.enabled || fastPath.target === "none") {
    return {
      fastPath: {
        enabled: false,
        afterHands: fastPath.afterHands,
        target: "none",
      },
    };
  }
  return { fastPath };
}
