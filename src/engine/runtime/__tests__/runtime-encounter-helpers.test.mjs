import { describe, expect, it, vi } from "vitest";
import { createRuntimeEncounterHelpers } from "../core/runtime-encounter-helpers.js";

describe("runtime encounter helpers", () => {
  it("wires enemy, intro, and encounter creation with deterministic random plumbing", () => {
    const state = {
      lastIntroDialogue: "",
    };
    const runtimeRandom = vi.fn(() => 0.25);
    const resolveRoomType = vi.fn(() => "normal");
    const createDeck = vi.fn(() => ["c1", "c2"]);
    const shuffle = vi.fn((cards, randomFn) => {
      randomFn();
      return cards.slice().reverse();
    });

    const createEnemyFn = vi.fn((payload) => ({
      name: "Tin Dealer",
      avatarKey: "tin-dealer",
    }));
    const buildEnemyIntroDialogueFn = vi.fn(() => ({
      dialogue: "Let's play.",
      nextLastIntroDialogue: "Let's play.",
    }));
    const createEncounterIntroStateFn = vi.fn((payload) => ({
      dialogue: payload.buildEnemyIntroDialogueFn(payload.enemy),
      clamp: payload.clampNumberFn(8, 0, 10, 0),
    }));
    const createEncounterFn = vi.fn((payload) => ({
      enemy: payload.createEnemyFn(1, 2, "normal"),
      intro: payload.createEncounterIntroStateFn({ type: "normal" }),
      deck: payload.createDeckFn(),
      shoe: payload.shuffleFn(["c1", "c2"]),
      mode: payload.resolveRoomTypeFn(2, 5),
    }));

    const helpers = createRuntimeEncounterHelpers({
      state,
      clampNumber: (value, min, max) => Math.max(min, Math.min(max, value)),
      runtimeRandom,
      resolveRoomType,
      createDeck,
      shuffle,
      createEnemyFn,
      buildEnemyIntroDialogueFn,
      createEncounterIntroStateFn,
      createEncounterFn,
    });

    const enemy = helpers.createEnemy(1, 2, "normal");
    expect(enemy.avatarKey).toBe("tin-dealer");
    expect(createEnemyFn).toHaveBeenCalledWith({
      floor: 1,
      room: 2,
      type: "normal",
      random: runtimeRandom,
    });

    const introState = helpers.createEncounterIntroState(enemy, { active: true });
    expect(introState).toEqual({
      dialogue: "Let's play.",
      clamp: 8,
    });
    expect(state.lastIntroDialogue).toBe("Let's play.");
    expect(buildEnemyIntroDialogueFn).toHaveBeenCalledWith({
      enemy,
      lastIntroDialogue: "",
      random: runtimeRandom,
    });

    const encounter = helpers.createEncounter({ floor: 1, room: 2, roomsPerFloor: 5 });
    expect(encounter.mode).toBe("normal");
    expect(shuffle).toHaveBeenCalledTimes(1);
    expect(runtimeRandom).toHaveBeenCalled();
    expect(createEncounterFn).toHaveBeenCalledTimes(1);
  });
});
