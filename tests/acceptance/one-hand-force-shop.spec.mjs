import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectNoRuntimeErrors, expectTruthySnapshot } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import { menuAction, playSingleHand, shopAction, waitForMode } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

describe("acceptance: one-hand force shop", () => {
  beforeAll(async () => {
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("forces shop mode after one hand and validates buy + continue actions", async () => {
    const session = await createAcceptanceSession({
      fastPath: { enabled: true, afterHands: 1, target: "shop" },
    });
    try {
      await menuAction(session.page, "startRun");
      const playingMode = await waitForMode(session.page, "playing", { maxTicks: 120, stepMs: 130 });
      expect(playingMode).toBe("playing");

      const handResult = await playSingleHand(session.page);
      expect(handResult.timedOut).toBe(false);

      const shopMode = await waitForMode(session.page, "shop", { maxTicks: 120, stepMs: 130 });
      expect(shopMode).toBe("shop");

      const beforeShop = await shopAction(session.page, "getSnapshot");
      expectTruthySnapshot(beforeShop, "shop");
      expect(beforeShop.items.length).toBeGreaterThan(0);

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
      const artifactDir = await captureFailureArtifacts(session, "one-hand-force-shop");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });
});
