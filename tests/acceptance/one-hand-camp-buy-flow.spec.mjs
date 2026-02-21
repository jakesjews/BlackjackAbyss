import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectNoRuntimeErrors, expectTruthySnapshot } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import { menuAction, playUntilMode, shopAction, waitForMode } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

describe("acceptance: camp buy flow", () => {
  beforeAll(async () => {
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("seeds chips in test mode and validates buy + continue actions at camp", async () => {
    const startingGold = 320;
    const session = await createAcceptanceSession({
      economy: { startingGold },
    });
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

      const beforeShop = await shopAction(session.page, "getSnapshot");
      expectTruthySnapshot(beforeShop, "shop");
      expect(beforeShop.items.length).toBeGreaterThan(0);
      expect(Number(beforeShop.run?.chips || 0)).toBeGreaterThanOrEqual(startingGold);

      const buyIndex = beforeShop.items.findIndex((item) => item.canBuy);
      if (buyIndex >= 0) {
        await shopAction(session.page, "buy", buyIndex);
      }

      const afterShop = await shopAction(session.page, "getSnapshot");
      expectTruthySnapshot(afterShop, "shop-after-buy");
      if (buyIndex >= 0) {
        expect(afterShop.run.shopPurchaseMade).toBe(true);
      }

      await shopAction(session.page, "continueRun");
      const resumedMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(resumedMode).toBe("playing");

      expectNoRuntimeErrors(session);
    } catch (error) {
      const artifactDir = await captureFailureArtifacts(session, "camp-buy-flow");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });
});
