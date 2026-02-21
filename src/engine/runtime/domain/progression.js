export function resolveRoomType(room, roomsPerFloor) {
  if (room >= roomsPerFloor) {
    return "boss";
  }
  if (room === 3) {
    return "elite";
  }
  return "normal";
}

export function nextModeAfterRewardClaim({ floor, maxFloor, room, roomsPerFloor }) {
  const reachedFinalRoom = room >= roomsPerFloor;
  const reachedFinalFloor = floor >= maxFloor;
  if (reachedFinalRoom && reachedFinalFloor) {
    return "victory";
  }
  return "shop";
}

export function nextModeAfterShopContinue() {
  return "playing";
}
