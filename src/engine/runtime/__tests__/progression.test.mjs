import { describe, expect, it } from "vitest";
import { nextModeAfterRewardClaim, nextModeAfterShopContinue, resolveRoomType } from "../domain/progression.js";

describe("progression domain", () => {
  it("resolves room type", () => {
    expect(resolveRoomType(1, 5)).toBe("normal");
    expect(resolveRoomType(3, 5)).toBe("elite");
    expect(resolveRoomType(5, 5)).toBe("boss");
  });

  it("chooses reward claim mode", () => {
    expect(nextModeAfterRewardClaim({ floor: 1, maxFloor: 3, room: 2, roomsPerFloor: 5 })).toBe("shop");
    expect(nextModeAfterRewardClaim({ floor: 3, maxFloor: 3, room: 5, roomsPerFloor: 5 })).toBe("victory");
  });

  it("chooses shop continue mode", () => {
    expect(nextModeAfterShopContinue()).toBe("playing");
  });
});
