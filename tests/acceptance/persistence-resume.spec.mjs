import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectModeIn, expectNoRuntimeErrors } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import {
  goHomeFromActiveMode,
  menuAction,
  playSingleHand,
  readState,
  readStoredRunSnapshot,
  waitForMode,
} from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

describe("acceptance: persistence + resume", () => {
  beforeAll(async () => {
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("save/resume works with fast-path disabled", async () => {
    const session = await createAcceptanceSession({
      fastPath: { enabled: false, afterHands: 1, target: "none" },
    });
    try {
      await menuAction(session.page, "startRun");
      const playingMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(playingMode).toBe("playing");

      const handResult = await playSingleHand(session.page);
      expect(handResult.timedOut).toBe(false);

      const storedBefore = await readStoredRunSnapshot(session.page);
      expect(storedBefore?.run?.totalHands).toBeGreaterThanOrEqual(1);

      const homeMode = await goHomeFromActiveMode(session.page);
      expect(homeMode).toBe("menu");

      await session.page.reload({ waitUntil: "domcontentloaded" });
      await waitForMode(session.page, "menu", { maxTicks: 80, stepMs: 120 });

      const hasSavedRun = await menuAction(session.page, "hasSavedRun");
      expect(hasSavedRun).toBe(true);

      await menuAction(session.page, "resumeRun");
      const resumedMode = await waitForMode(session.page, ["playing", "shop", "gameover", "victory"], {
        maxTicks: 120,
        stepMs: 130,
      });
      expectModeIn(resumedMode, ["playing", "shop", "gameover", "victory"], "resumed mode");
      const resumedState = await readState(session.page);
      expect(resumedState.run).toBeTruthy();

      expectNoRuntimeErrors(session);
    } catch (error) {
      const artifactDir = await captureFailureArtifacts(session, "persistence-resume-no-flags");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });

  test("save/resume works with fast-path enabled", async () => {
    const session = await createAcceptanceSession({
      fastPath: { enabled: true, afterHands: 1, target: "shop" },
    });
    try {
      await menuAction(session.page, "startRun");
      const playingMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(playingMode).toBe("playing");

      const handResult = await playSingleHand(session.page);
      expect(handResult.timedOut).toBe(false);
      await waitForMode(session.page, "shop", { maxTicks: 120, stepMs: 130 });

      const storedBefore = await readStoredRunSnapshot(session.page);
      expect(storedBefore?.mode).toBeTruthy();
      expect(storedBefore?.run?.totalHands).toBeGreaterThanOrEqual(1);

      const homeMode = await goHomeFromActiveMode(session.page);
      expect(homeMode).toBe("menu");

      await session.page.reload({ waitUntil: "domcontentloaded" });
      await waitForMode(session.page, "menu", { maxTicks: 80, stepMs: 120 });

      const hasSavedRun = await menuAction(session.page, "hasSavedRun");
      expect(hasSavedRun).toBe(true);

      await menuAction(session.page, "resumeRun");
      const resumedMode = await waitForMode(session.page, ["playing", "shop", "gameover", "victory"], {
        maxTicks: 120,
        stepMs: 130,
      });
      expectModeIn(resumedMode, ["playing", "shop", "gameover", "victory"], "resumed mode");
      const resumedState = await readState(session.page);
      expect(resumedState.run).toBeTruthy();

      expectNoRuntimeErrors(session);
    } catch (error) {
      const artifactDir = await captureFailureArtifacts(session, "persistence-resume-with-flags");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });
});
