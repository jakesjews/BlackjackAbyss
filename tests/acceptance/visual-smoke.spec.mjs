import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { expectNoRuntimeErrors } from "./helpers/assertions.mjs";
import { comparePngFiles } from "./helpers/image-diff.mjs";
import { closeSharedAcceptanceBrowser, createAcceptanceSession, captureFailureArtifacts } from "./helpers/page.mjs";
import {
  createVisualRunId,
  ensureVisualDirs,
  getBaselinePath,
  getLatestCapturePath,
  getVisualDiffPaths,
  getVisualRunRoot,
  isVisualUpdateMode,
  resetVisualCaptureRoots,
  VISUAL_DIFF_DEFAULTS,
  writeBaselineFromCapture,
} from "./helpers/visual-baseline.mjs";
import { advanceTime, menuAction, overlayAction, runAction, waitForMode } from "./helpers/runtime.mjs";
import { startAcceptanceServer, stopAcceptanceServer } from "./helpers/server.mjs";

const VISUAL_UPDATE_MODE = isVisualUpdateMode();
const VISUAL_RUN_ID = createVisualRunId();
const VISUAL_RUN_ROOT = getVisualRunRoot(VISUAL_RUN_ID);

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

const SHOTS = [
  "01-menu",
  "02-collection",
  "03-playing",
  "03b-playing-actions",
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
      visualFxDisabled: Boolean(runtime?.testFlags?.visual?.disableFx),
    };
  });
}

async function assertVisualShot(viewportLabel, shotName, capturePath) {
  if (VISUAL_UPDATE_MODE) {
    await writeBaselineFromCapture(viewportLabel, shotName, capturePath);
    return;
  }

  const baselinePath = getBaselinePath(viewportLabel, shotName);
  let baselineExists = true;
  try {
    await fs.access(baselinePath);
  } catch {
    baselineExists = false;
  }
  if (!baselineExists) {
    throw new Error(`Missing visual baseline: ${baselinePath}. Run npm run test:visual:update to create it.`);
  }

  const diffPaths = getVisualDiffPaths(VISUAL_RUN_ID, viewportLabel, shotName);
  await fs.mkdir(path.dirname(diffPaths.base), { recursive: true });
  await fs.copyFile(baselinePath, diffPaths.expectedCopy);
  await fs.copyFile(capturePath, diffPaths.actualCopy);

  const metrics = await comparePngFiles({
    expectedPath: baselinePath,
    actualPath: capturePath,
    diffPath: diffPaths.diff,
    threshold: VISUAL_DIFF_DEFAULTS.threshold,
    maxDiffRatio: VISUAL_DIFF_DEFAULTS.maxDiffRatio,
    maxDiffPixels: VISUAL_DIFF_DEFAULTS.maxDiffPixels,
  });

  await fs.writeFile(diffPaths.metrics, JSON.stringify(metrics, null, 2), "utf8");

  if (!metrics.passed) {
    throw new Error(
      `Visual regression for ${viewportLabel}/${shotName}: diffPixels=${metrics.diffPixels}, ` +
      `diffRatio=${metrics.diffRatio}, maxDiffPixels=${metrics.maxDiffPixels}, ` +
      `maxDiffRatio=${metrics.maxDiffRatio}. Artifacts: ${path.dirname(diffPaths.base)}`
    );
  }
}

async function captureAndAssert(session, viewportLabel, shotName) {
  await session.page.evaluate(async () => {
    if (document?.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Font loading readiness can fail in some CI contexts; continue capture.
      }
    }
  });
  const capturePath = getLatestCapturePath(viewportLabel, shotName);
  await fs.mkdir(path.dirname(capturePath), { recursive: true });
  await session.page.screenshot({ path: capturePath, fullPage: true });
  await assertVisualShot(viewportLabel, shotName, capturePath);
}

async function runViewportSmoke(config) {
  const session = await createAcceptanceSession({
    viewport: config.viewport,
    visual: {
      disableFx: true,
    },
  });
  try {
    const initialMenuMode = await waitForMode(session.page, "menu", { maxTicks: 80, stepMs: 120 });
    expect(initialMenuMode).toBe("menu");
    await captureAndAssert(session, config.label, "01-menu");

    await menuAction(session.page, "openCollection");
    const collectionMode = await waitForMode(session.page, "collection", { maxTicks: 80, stepMs: 120 });
    expect(collectionMode).toBe("collection");
    await captureAndAssert(session, config.label, "02-collection");

    await overlayAction(session.page, "confirm");
    const menuMode = await waitForMode(session.page, "menu", { maxTicks: 80, stepMs: 120 });
    expect(menuMode).toBe("menu");

    await menuAction(session.page, "startRun");
    const playingMode = await waitForMode(session.page, "playing", { maxTicks: 160, stepMs: 140 });
    expect(playingMode).toBe("playing");

    const beforePlayingShot = await runAction(session.page, "getSnapshot");
    if (beforePlayingShot?.intro?.active) {
      await runAction(session.page, "confirmIntro");
      await advanceTime(session.page, 180);
    }

    await advanceTime(session.page, 220);
    await captureAndAssert(session, config.label, "03-playing");

    await advanceTime(session.page, 240);
    await captureAndAssert(session, config.label, "03b-playing-actions");

    const debug = await readRuntimeDebugSnapshot(session.page);
    process.stdout.write(`[${config.label}] playing debug: ${JSON.stringify(debug)}\n`);

    expect(debug.mode).toBe("playing");
    expect(debug.hasRun).toBe(true);
    expect(debug.hasEncounter).toBe(true);
    expect(debug.externalRendererActive).toBe(true);
    expect(debug.runSnapshotMode).toBe("playing");
    expect(debug.runSnapshotHasStatus).toBe(true);
    expect(debug.visualFxDisabled).toBe(true);

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
    await resetVisualCaptureRoots();
    await ensureVisualDirs(VIEWPORTS.map((viewport) => viewport.label));
    if (!VISUAL_UPDATE_MODE) {
      await fs.rm(VISUAL_RUN_ROOT, { recursive: true, force: true });
    }
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

    if (VISUAL_UPDATE_MODE) {
      const summary = `Updated visual baselines for ${VIEWPORTS.length} viewports and ${SHOTS.length} shots.`;
      process.stdout.write(`${summary}\n`);
    }
  }, 180_000);
});
