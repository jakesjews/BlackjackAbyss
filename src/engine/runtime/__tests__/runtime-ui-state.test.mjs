import { describe, expect, it, vi } from "vitest";
import {
  addLogToRun,
  getRunEventLog,
  hasSavedRunState,
  hidePassiveTooltipState,
  moveSelectionState,
  openCollectionState,
  setAnnouncementState,
} from "../core/runtime-ui-state.js";

describe("runtime ui state helpers", () => {
  it("adds run logs and trims history", () => {
    const state = {
      run: {
        log: [],
        eventLog: [],
      },
    };
    expect(addLogToRun({ state, message: " alpha " })).toBe(true);
    for (let i = 0; i < 8; i += 1) {
      addLogToRun({ state, message: `m${i}` });
    }
    expect(state.run.log).toHaveLength(6);
    expect(state.run.eventLog[state.run.eventLog.length - 1]).toBe("m7");
  });

  it("updates announcement fields", () => {
    const state = {};
    setAnnouncementState({ state, message: "hello", duration: 1.5 });
    expect(state.announcement).toBe("hello");
    expect(state.announcementTimer).toBe(1.5);
    expect(state.announcementDuration).toBe(1.5);
  });

  it("moves selection with optional sfx", () => {
    const state = { selectionIndex: 0 };
    const playUiSfx = vi.fn();
    expect(moveSelectionState({ state, delta: 1, length: 3, playUiSfx })).toBe(true);
    expect(state.selectionIndex).toBe(1);
    expect(playUiSfx).toHaveBeenCalledWith("select");
  });

  it("handles passive tooltip and saved run checks", () => {
    const state = { passiveTooltipTimer: 2, savedRunSnapshot: { run: {} } };
    hidePassiveTooltipState(state);
    expect(state.passiveTooltipTimer).toBe(0);
    expect(hasSavedRunState(state)).toBe(true);
    expect(hasSavedRunState({})).toBe(false);
  });

  it("opens collection mode and returns event logs", () => {
    const state = { mode: "menu", collectionPage: 0 };
    const playUiSfx = vi.fn();
    openCollectionState({
      state,
      page: 2.9,
      nonNegInt: (value, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(0, Math.floor(n));
      },
      playUiSfx,
    });
    expect(state.mode).toBe("collection");
    expect(state.collectionPage).toBe(2);
    expect(playUiSfx).toHaveBeenCalledWith("confirm");
    expect(getRunEventLog({ eventLog: ["a"] })).toEqual(["a"]);
    expect(getRunEventLog(null)).toEqual([]);
  });
});
