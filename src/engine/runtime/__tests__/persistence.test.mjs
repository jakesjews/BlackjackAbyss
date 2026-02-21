import { beforeEach, describe, expect, it } from "vitest";
import {
  loadAudioEnabled,
  safeGetStorage,
  safeRemoveStorage,
  safeSetStorage,
  saveAudioEnabled,
} from "../persistence/storage.js";

const storageKeys = { audioEnabled: "audio-enabled-key" };

function installStorageMock() {
  const data = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
    },
  };
  return data;
}

describe("runtime persistence", () => {
  let data;

  beforeEach(() => {
    data = installStorageMock();
  });

  it("reads and writes storage safely", () => {
    safeSetStorage("k", "v");
    expect(safeGetStorage("k")).toBe("v");
    safeRemoveStorage("k");
    expect(safeGetStorage("k")).toBe(null);
  });

  it("persists audio enabled flag", () => {
    saveAudioEnabled(false, storageKeys);
    expect(data.get(storageKeys.audioEnabled)).toBe("0");
    expect(loadAudioEnabled(storageKeys)).toBe(false);

    saveAudioEnabled(true, storageKeys);
    expect(loadAudioEnabled(storageKeys)).toBe(true);
  });
});
