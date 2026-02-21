export function computeHandLayout({ count, layoutScale = 1, cardW, cardH }) {
  const safeCount = Math.max(1, count);
  const cardsPerRow = 6;
  const rows = Math.max(1, Math.ceil(safeCount / cardsPerRow));
  const baseScale = 1 - Math.max(0, safeCount - 4) * 0.06 - (rows - 1) * 0.12;
  const viewportScale = clampNumber(Number(layoutScale) || 1, 0.5, 1.2, 1);
  const scale = clampNumber(baseScale * viewportScale, 0.38, 1, 1);
  const w = Math.max(36, Math.round(cardW * scale));
  const h = Math.max(52, Math.round(cardH * scale));
  return {
    cardsPerRow,
    rows,
    w,
    h,
    spacing: Math.max(Math.round(w * 0.56), 22),
    rowStep: Math.max(Math.round(h * 0.34), 18),
  };
}

export function computeHandCardPosition({
  handType,
  index,
  count,
  layoutScale = 1,
  cardW,
  cardH,
  width,
  portraitZoomed = false,
}) {
  const metrics = computeHandLayout({ count, layoutScale, cardW, cardH });
  const portraitOffset = portraitZoomed ? 72 : 0;
  const baseY = handType === "dealer" ? 190 + portraitOffset : 486 + portraitOffset;
  const row = Math.floor(index / metrics.cardsPerRow);
  const rowCount = Math.max(1, Math.ceil(count / metrics.cardsPerRow));
  const rowStartIndex = row * metrics.cardsPerRow;
  const rowItems = Math.min(metrics.cardsPerRow, Math.max(0, count - rowStartIndex));
  const col = index - rowStartIndex;
  const startX = width * 0.5 - ((rowItems - 1) * metrics.spacing) * 0.5 - metrics.w * 0.5;
  const y = handType === "dealer" ? baseY + row * metrics.rowStep : baseY - row * metrics.rowStep;
  return {
    x: startX + col * metrics.spacing,
    y,
    w: metrics.w,
    h: metrics.h,
    row,
    rows: rowCount,
  };
}

export function canDoubleDown({ canAct, encounter }) {
  if (!canAct || !encounter) {
    return false;
  }
  return !encounter.doubleDown && !encounter.splitUsed && encounter.playerHand?.length === 2;
}

export function canSplitHand({ canAct, encounter, maxSplitHands }) {
  if (!canAct || !encounter) {
    return false;
  }
  if (encounter.doubleDown || encounter.playerHand?.length !== 2) {
    return false;
  }
  const activeSplitCount = 1 + (Array.isArray(encounter.splitQueue) ? encounter.splitQueue.length : 0);
  if (activeSplitCount >= maxSplitHands) {
    return false;
  }
  const [a, b] = encounter.playerHand;
  return Boolean(a && b && a.rank === b.rank);
}

export function resolveShowdownOutcome({ playerTotal, dealerTotal, playerNatural = false, dealerNatural = false }) {
  if (playerTotal > 21) {
    return "player_bust";
  }
  if (dealerTotal > 21) {
    return "dealer_bust";
  }
  if (playerNatural && !dealerNatural) {
    return "blackjack";
  }
  if (dealerNatural && !playerNatural) {
    return "dealer_blackjack";
  }
  if (playerTotal > dealerTotal) {
    return "player_win";
  }
  if (dealerTotal > playerTotal) {
    return "dealer_win";
  }
  return "push";
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}
