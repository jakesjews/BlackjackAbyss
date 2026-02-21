function asNonNegativeInteger(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

function normalizeEconomy(rawEconomy) {
  const source = rawEconomy && typeof rawEconomy === "object" ? rawEconomy : {};
  return {
    startingGold: Math.max(0, asNonNegativeInteger(source.startingGold, 0)),
  };
}

export function readRuntimeTestFlags(globalObject = globalThis) {
  const isProduction = Boolean(import.meta.env?.PROD);
  if (isProduction) {
    return {
      economy: {
        startingGold: 0,
      },
    };
  }

  const raw = globalObject && typeof globalObject === "object" ? globalObject.__ABYSS_TEST_FLAGS__ : null;
  const source = raw && typeof raw === "object" ? raw : {};
  const economy = normalizeEconomy(source.economy);
  return { economy };
}
