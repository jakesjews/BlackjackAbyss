import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectMethodContract, expectNoRuntimeErrors } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import { advanceTime, readRuntimeContracts } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

const MENU_METHODS = ["startRun", "resumeRun", "openCollection", "hasSavedRun"];
const RUN_METHODS = [
  "getSnapshot",
  "hit",
  "stand",
  "doubleDown",
  "split",
  "deal",
  "confirmIntro",
  "fireballLaunch",
  "fireballImpact",
  "startEnemyDefeatTransition",
  "card",
  "goHome",
];
const REWARD_METHODS = ["getSnapshot", "prev", "next", "claim", "selectIndex", "goHome"];
const SHOP_METHODS = ["getSnapshot", "prev", "next", "buy", "continueRun", "selectIndex", "goHome"];
const OVERLAY_METHODS = ["getSnapshot", "prevPage", "nextPage", "backToMenu", "restart", "confirm"];

describe("acceptance: boot contracts", () => {
  beforeAll(async () => {
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("boots Phaser host and publishes stable runtime contracts + test hooks", async () => {
    const session = await createAcceptanceSession();
    try {
      const contracts = await readRuntimeContracts(session.page);
      expect(contracts.phaserReady).toBe(true);
      expect(contracts.runtimeReady).toBe(true);
      expectMethodContract(contracts.menuMethods, MENU_METHODS, "menu");
      expectMethodContract(contracts.runMethods, RUN_METHODS, "run");
      expectMethodContract(contracts.rewardMethods, REWARD_METHODS, "reward");
      expectMethodContract(contracts.shopMethods, SHOP_METHODS, "shop");
      expectMethodContract(contracts.overlayMethods, OVERLAY_METHODS, "overlay");
      expect(contracts.hasRenderHook).toBe(true);
      expect(contracts.hasAdvanceHook).toBe(true);

      const renderPayload = await session.page.evaluate(() => window.render_game_to_text());
      expect(typeof renderPayload).toBe("string");
      await advanceTime(session.page, 160);
      const renderPayloadAfterAdvance = await session.page.evaluate(() => window.render_game_to_text());
      expect(typeof renderPayloadAfterAdvance).toBe("string");

      expectNoRuntimeErrors(session);
    } catch (error) {
      const artifactDir = await captureFailureArtifacts(session, "boot-contracts");
      if (artifactDir) {
        error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
      }
      throw error;
    } finally {
      await session.close();
    }
  });
});
