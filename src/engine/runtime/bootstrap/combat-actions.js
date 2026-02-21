export function buildTransitionSnapshot(pendingTransition) {
  if (!pendingTransition || typeof pendingTransition !== "object") {
    return null;
  }
  const target = pendingTransition.target === "player" ? "player" : "enemy";
  const waiting = Boolean(pendingTransition.waiting);
  const duration = Math.max(
    0.001,
    Number(pendingTransition.duration) || Number(pendingTransition.timer) || 0.001
  );
  const remaining = waiting
    ? duration
    : Math.max(0, Math.min(duration, Number(pendingTransition.timer) || 0));
  return {
    target,
    remaining,
    duration,
    waiting,
    progress: waiting ? 0 : Math.max(0, Math.min(1, 1 - remaining / duration)),
  };
}
