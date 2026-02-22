import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectNoRuntimeErrors } from "./helpers/assertions.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import { advanceTime, menuAction, overlayAction, runAction, waitForMode } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SMOKE_ROOT = path.join(REPO_ROOT, "artifacts", "visual-smoke", "latest");
const VIEWPORTS = [
  {
    label: "desktop-1280x720",
    viewport: { width: 1280, height: 720 },
  },
  {
    label: "mobile-430x932",
    viewport: { width: 430, height: 932 },
  },
];

async function readRuntimeDebugSnapshot(page) {
  return page.evaluate(() => {
    const runtime = window.__ABYSS_ENGINE_RUNTIME__ || null;
    const runtimeApis = runtime?.apis && typeof runtime.apis === "object" ? runtime.apis : null;

    let parsedState = {};
    if (typeof window.render_game_to_text === "function") {
      try {
        parsedState = JSON.parse(window.render_game_to_text() || "{}");
      } catch {
        parsedState = {};
      }
    }

    const phaserGame = window.__ABYSS_PHASER_GAME__ || null;
    const scenePlugin = phaserGame?.scene || null;
    const activeScenes = scenePlugin && typeof scenePlugin.getScenes === "function"
      ? scenePlugin.getScenes(true).map((scene) => scene?.scene?.key || "").filter(Boolean)
      : [];

    const sceneStates = [];
    const managerScenes = Array.isArray(scenePlugin?.scenes) ? scenePlugin.scenes : [];
    if (managerScenes.length > 0) {
      managerScenes.forEach((scene) => {
        const settings = scene?.scene?.settings || null;
        if (!settings) return;
        sceneStates.push({
          key: settings.key || "",
          active: Boolean(settings.active),
          visible: Boolean(settings.visible),
          status: Number.isFinite(settings.status) ? settings.status : -1,
        });
      });
    }

    const runApi = runtimeApis?.runApi || null;
    let runSnapshot = null;
    if (runApi && typeof runApi.getSnapshot === "function") {
      try {
        runSnapshot = runApi.getSnapshot();
      } catch {
        runSnapshot = null;
      }
    }

    return {
      mode: parsedState?.mode || "",
      hasRun: Boolean(parsedState?.run),
      hasEncounter: Boolean(parsedState?.encounter),
      externalRendererActive: Boolean(runtime?.isExternalRendererActive?.(parsedState?.mode || "")),
      activeScenes,
      sceneStates,
      runSnapshotMode: runSnapshot?.mode || "",
      runSnapshotHasStatus: Boolean(runSnapshot?.status),
    };
  });
}

async function runViewportSmoke(config) {
  const session = await createAcceptanceSession({ viewport: config.viewport });
  try {
    const outputDir = path.join(SMOKE_ROOT, config.label);
    await fs.mkdir(outputDir, { recursive: true });

    const initialMenuMode = await waitForMode(session.page, "menu", { maxTicks: 80, stepMs: 120 });
    expect(initialMenuMode).toBe("menu");
    await session.page.screenshot({ path: path.join(outputDir, "01-menu.png"), fullPage: true });

    await menuAction(session.page, "openCollection");
    const collectionMode = await waitForMode(session.page, "collection", { maxTicks: 80, stepMs: 120 });
    expect(collectionMode).toBe("collection");
    await session.page.screenshot({ path: path.join(outputDir, "02-collection.png"), fullPage: true });

    await overlayAction(session.page, "confirm");
    const menuMode = await waitForMode(session.page, "menu", { maxTicks: 80, stepMs: 120 });
    expect(menuMode).toBe("menu");

    await menuAction(session.page, "startRun");
    const playingMode = await waitForMode(session.page, "playing", { maxTicks: 160, stepMs: 140 });
    expect(playingMode).toBe("playing");

    await advanceTime(session.page, 220);
    await session.page.screenshot({ path: path.join(outputDir, "03-playing.png"), fullPage: true });

    const snapshot = await runAction(session.page, "getSnapshot");
    if (snapshot?.intro?.active) {
      await runAction(session.page, "confirmIntro");
      await advanceTime(session.page, 180);
    }
    await advanceTime(session.page, 240);
    await session.page.screenshot({ path: path.join(outputDir, "03b-playing-actions.png"), fullPage: true });

    const debug = await readRuntimeDebugSnapshot(session.page);
    process.stdout.write(`[${config.label}] playing debug: ${JSON.stringify(debug)}\n`);

    expect(debug.mode).toBe("playing");
    expect(debug.hasRun).toBe(true);
    expect(debug.hasEncounter).toBe(true);
    expect(debug.externalRendererActive).toBe(true);
    expect(debug.runSnapshotMode).toBe("playing");
    expect(debug.runSnapshotHasStatus).toBe(true);

    expectNoRuntimeErrors(session);
  } catch (error) {
    const artifactDir = await captureFailureArtifacts(session, `visual-smoke-${config.label}`);
    if (artifactDir) {
      error.message = `${error.message}\nAcceptance artifacts: ${artifactDir}`;
    }
    throw error;
  } finally {
    await session.close();
  }
}

describe("acceptance: visual smoke artifacts", () => {
  beforeAll(async () => {
    await fs.rm(SMOKE_ROOT, { recursive: true, force: true });
    await startAcceptanceServer();
  });

  afterAll(async () => {
    await closeSharedAcceptanceBrowser();
    await stopAcceptanceServer();
  });

  test("captures desktop/mobile smoke screenshots from acceptance flow", async () => {
    for (const config of VIEWPORTS) {
      await runViewportSmoke(config);
    }
  }, 180_000);
});
