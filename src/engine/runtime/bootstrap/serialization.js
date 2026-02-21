export function applyHexAlpha(hexOrRgb, alpha) {
  if (typeof hexOrRgb === "string" && hexOrRgb.startsWith("#") && hexOrRgb.length === 7) {
    const r = Number.parseInt(hexOrRgb.slice(1, 3), 16);
    const g = Number.parseInt(hexOrRgb.slice(3, 5), 16);
    const b = Number.parseInt(hexOrRgb.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(236, 245, 255, ${alpha})`;
}

function nonNegInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.floor(n));
}

export function serializeShopStock(stock) {
  if (!Array.isArray(stock)) {
    return [];
  }
  return stock.map((item) => {
    if (item.type === "relic") {
      return {
        type: "relic",
        relicId: item.relic?.id || "",
        cost: nonNegInt(item.cost, 0),
        sold: Boolean(item.sold),
      };
    }
    return {
      type: "heal",
      id: item.id || "patch-kit",
      name: item.name || "Patch Kit",
      description: item.description || "Restore 10 HP.",
      cost: nonNegInt(item.cost, 0),
      sold: Boolean(item.sold),
    };
  });
}

export function hydrateShopStock(serialized, relicById) {
  if (!Array.isArray(serialized)) {
    return [];
  }
  return serialized
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      if (item.type === "relic") {
        const relic = relicById.get(item.relicId);
        if (!relic) {
          return null;
        }
        return {
          type: "relic",
          relic,
          cost: nonNegInt(item.cost, relic.shopCost || 0),
          sold: Boolean(item.sold),
        };
      }
      if (item.type === "heal") {
        return {
          type: "heal",
          id: item.id || "patch-kit",
          name: item.name || "Patch Kit",
          description: item.description || "Restore 10 HP.",
          cost: nonNegInt(item.cost, 10),
          sold: Boolean(item.sold),
        };
      }
      return null;
    })
    .filter(Boolean);
}
