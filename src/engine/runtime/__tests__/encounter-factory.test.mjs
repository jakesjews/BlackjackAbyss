import { describe, expect, it, vi } from "vitest";
import {
  buildEnemyIntroDialogue,
  createEncounter,
  createEncounterIntroState,
  createEnemy,
  pickEnemyName,
  sanitizeEnemyAvatarKey,
} from "../core/encounter-factory.js";

describe("encounter factory", () => {
  it("picks enemy names by type", () => {
    const enemyNames = {
      normal: ["N-1", "N-2"],
      elite: ["E-1"],
      boss: ["B-1"],
    };
    expect(pickEnemyName("boss", enemyNames, () => 0)).toBe("B-1");
    expect(pickEnemyName("normal", enemyNames, () => 0.99)).toBe("N-2");
  });

  it("creates enemy with scaled stats and sanitized avatar keys", () => {
    const enemy = createEnemy({
      floor: 2,
      room: 3,
      type: "elite",
      sanitizeEnemyAvatarKey: (name) => name.toLowerCase().replace(/\s+/g, "-"),
      enemyNames: { normal: ["N"], elite: ["Elite Dealer"], boss: ["B"] },
      enemyAvatarByName: {},
      random: () => 0,
    });
    expect(enemy.name).toBe("Elite Dealer");
    expect(enemy.type).toBe("elite");
    expect(enemy.hp).toBeGreaterThan(0);
    expect(enemy.attack).toBeGreaterThan(0);
    expect(enemy.goldDrop).toBeGreaterThan(0);
    expect(enemy.avatarKey).toBe("elite-dealer");
  });

  it("provides default avatar-key sanitization helper", () => {
    expect(sanitizeEnemyAvatarKey("  Pit Boss #1  ")).toBe("pit-boss-1");
    expect(sanitizeEnemyAvatarKey("")).toBe("");
    expect(sanitizeEnemyAvatarKey(null)).toBe("");
  });

  it("builds intro dialogue honoring verbatim openers", () => {
    const result = buildEnemyIntroDialogue({
      enemy: { type: "normal" },
      lastIntroDialogue: "",
      introOpeners: { normal: ["Raw"], elite: ["Raw"], boss: ["Raw"] },
      introClosers: { normal: ["Ignored"], elite: ["Ignored"], boss: ["Ignored"] },
      verbatimSet: new Set(["Raw"]),
      random: () => 0,
    });
    expect(result.dialogue).toBe("Raw");
    expect(result.nextLastIntroDialogue).toBe("Raw");
  });

  it("creates intro state from callback dialogue when not provided", () => {
    const intro = createEncounterIntroState({
      enemy: { type: "normal" },
      introLike: { active: true, visibleChars: 2, typeTimer: 0.1 },
      clampNumberFn: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      buildEnemyIntroDialogueFn: () => "Deal now",
    });
    expect(intro.dialogue).toBe("Deal now");
    expect(intro.active).toBe(true);
    expect(intro.visibleChars).toBe(2);
  });

  it("creates a fresh encounter shell from run metadata", () => {
    const encounter = createEncounter({
      run: { floor: 1, room: 1, roomsPerFloor: 5 },
      createEnemyFn: () => ({ name: "Enemy", hp: 10, maxHp: 10, attack: 2, goldDrop: 10, type: "normal" }),
      createEncounterIntroStateFn: () => ({ active: true, dialogue: "Intro", visibleChars: 0, ready: false }),
      resolveRoomTypeFn: () => "normal",
      createDeckFn: () => [{ rank: "A", suit: "S" }, { rank: "K", suit: "H" }],
      shuffleFn: (list) => list,
    });
    expect(encounter.enemy.name).toBe("Enemy");
    expect(encounter.shoe).toHaveLength(2);
    expect(encounter.phase).toBe("player");
    expect(encounter.hideDealerHole).toBe(true);
    expect(encounter.nextDealPrompted).toBe(false);
  });
});
