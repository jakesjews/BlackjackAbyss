export function buildPhaserOverlaySnapshot({
  state,
  collectionEntries,
  relicRarityMeta,
  passiveThumbUrl,
  passiveDescription,
}) {
  if (state.mode === "collection") {
    const entries = collectionEntries();
    const mappedEntries = entries.map((entry) => {
      const rarityMeta = relicRarityMeta[entry.rarity] || relicRarityMeta.common;
      return {
        id: entry.relic.id,
        thumbUrl: entry.unlocked ? passiveThumbUrl(entry.relic) : "",
        rarityLabel: entry.rarityLabel,
        rarityColor: rarityMeta.glow,
        name: entry.unlocked ? entry.relic.name : "LOCKED",
        description: entry.unlocked ? passiveDescription(entry.relic.description) : entry.unlockText,
        unlocked: entry.unlocked,
        copies: entry.copies,
      };
    });

    const unlockedCount = entries.filter((entry) => entry.unlocked).length;
    const foundCount = entries.filter((entry) => entry.copies > 0).length;
    const totalCopies = entries.reduce((acc, entry) => acc + entry.copies, 0);

    return {
      mode: state.mode,
      summary: `Unlocked ${unlockedCount}/${entries.length}  •  Found ${foundCount}/${entries.length}  •  Copies ${totalCopies}`,
      entries: mappedEntries,
    };
  }

  if (state.mode === "gameover" || state.mode === "victory") {
    const title = state.mode === "gameover" ? "RUN LOST" : "HOUSE BROKEN";
    const subtitle =
      state.mode === "gameover"
        ? "The House keeps your soul this time."
        : "You shattered the final dealer.";
    const prompt =
      state.mode === "gameover"
        ? "Press Enter to run it back."
        : "Press Enter for another run.";

    const run = state.run || null;
    const stats = run
      ? [
          `Floor reached: ${run.floor}/${run.maxFloor}`,
          `Enemies defeated: ${run.enemiesDefeated}`,
          `Hands played: ${run.totalHands}`,
          `Total damage dealt: ${run.player?.totalDamageDealt || 0}`,
          `Total damage taken: ${run.player?.totalDamageTaken || 0}`,
          `Chips banked: ${run.player?.gold || 0}`,
        ]
      : [];

    return {
      mode: state.mode,
      title,
      subtitle,
      prompt,
      stats,
      canRestart: true,
    };
  }

  return null;
}
