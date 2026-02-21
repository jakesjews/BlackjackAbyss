import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectNoRuntimeErrors, expectTruthySnapshot } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import { menuAction, playSingleHand, rewardAction, shopAction, waitForMode } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

describe("acceptance: one-hand force reward", () => {
  beforeAll(async () => {
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("forces reward mode after one hand and keeps reward claim path functional", async () => {
    const session = await createAcceptanceSession({
      fastPath: { enabled: true, afterHands: 1, target: "reward" },
    });
    try {
      await menuAction(session.page, "startRun");
      const playingMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(playingMode).toBe("playing");

      const handResult = await playSingleHand(session.page);
      expect(handResult.timedOut).toBe(false);

      const rewardMode = await waitForMode(session.page, "reward", { maxTicks: 120, stepMs: 130 });
      expect(rewardMode).toBe("reward");

      const rewardSnapshot = await rewardAction(session.page, "getSnapshot");
      expectTruthySnapshot(rewardSnapshot, "reward");
      expect(Array.isArray(rewardSnapshot.options)).toBe(true);
      expect(rewardSnapshot.options.length).toBeGreaterThan(0);

      await rewardAction(session.page, "claim");
      const shopMode = await waitForMode(session.page, "shop", { maxTicks: 120, stepMs: 130 });
      expect(shopMode).toBe("shop");

      const shopSnapshot = await shopAction(session.page, "getSnapshot");
      expectTruthySnapshot(shopSnapshot, "shop");
      expect(Array.isArray(shopSnapshot.items)).toBe(true);
      expect(shopSnapshot.items.length).toBeGreaterThan(0);

      expectNoRuntimeErrors(session);
    } catch (error) {
      const artifactDir = await captureFailureArtifacts(session, "one-hand-force-reward");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });
});
