import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectNoRuntimeErrors, expectTruthySnapshot } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import { menuAction, playUntilMode, shopAction, waitForMode } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

describe("acceptance: camp transition", () => {
  beforeAll(async () => {
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("reaches camp naturally and continueRun returns to playing", async () => {
    const session = await createAcceptanceSession();
    try {
      await menuAction(session.page, "startRun");
      const playingMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(playingMode).toBe("playing");

      const shopTransition = await playUntilMode(session.page, "shop", {
        maxHands: 16,
        stepMs: 140,
        maxStepsPerHand: 220,
      });
      expect(shopTransition.timedOut).toBe(false);
      expect(shopTransition.mode).toBe("shop");

      const shopSnapshot = await shopAction(session.page, "getSnapshot");
      expectTruthySnapshot(shopSnapshot, "shop");
      expect(Array.isArray(shopSnapshot.items)).toBe(true);
      expect(shopSnapshot.items.length).toBeGreaterThan(0);

      await shopAction(session.page, "continueRun");
      const resumedMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(resumedMode).toBe("playing");

      expectNoRuntimeErrors(session);
    } catch (error) {
      const artifactDir = await captureFailureArtifacts(session, "camp-transition");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });
});
