import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectModeIn, expectNoRuntimeErrors } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import { menuAction, playSingleHand, readState, readStoredRunSnapshot, runAction, waitForMode } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

describe("acceptance: one-hand core flow", () => {
  beforeAll(async () => {
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("plays through one hand with fast-path disabled and keeps runtime coherent", async () => {
    const session = await createAcceptanceSession({
      fastPath: { enabled: false, afterHands: 1, target: "none" },
    });
    try {
      const initialState = await readState(session.page);
      expect(initialState.mode).toBe("menu");

      await menuAction(session.page, "startRun");
      const playingMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(playingMode).toBe("playing");

      const handResult = await playSingleHand(session.page);
      expect(handResult.timedOut).toBe(false);
      expect(handResult.totalHands).toBeGreaterThanOrEqual(handResult.startHands + 1);

      const state = await readState(session.page);
      expectModeIn(state.mode, ["playing", "reward", "shop", "gameover", "victory"], "post-hand mode");

      const runSnapshot = await runAction(session.page, "getSnapshot");
      if (state.mode === "playing") {
        expect(runSnapshot).toBeTruthy();
      }
      const persisted = await readStoredRunSnapshot(session.page);
      expect(Number(persisted?.run?.totalHands || 0)).toBeGreaterThanOrEqual(1);

      expectNoRuntimeErrors(session);
    } catch (error) {
      const artifactDir = await captureFailureArtifacts(session, "one-hand-core-flow");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });
});
