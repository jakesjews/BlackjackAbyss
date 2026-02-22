import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const VISUAL_BASELINE_ROOT = path.join(REPO_ROOT, "tests", "visual-baseline");
export const VISUAL_SMOKE_ROOT = path.join(REPO_ROOT, "artifacts", "visual-smoke", "latest");
export const VISUAL_REGRESSION_ROOT = path.join(REPO_ROOT, "artifacts", "visual-regression");

export const VISUAL_DIFF_DEFAULTS = Object.freeze({
  threshold: 0.08,
  maxDiffRatio: 0.0005,
  maxDiffPixels: 500,
});

export function isVisualUpdateMode() {
  return String(process.env.VISUAL_UPDATE || "") === "1";
}

export function createVisualRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function getBaselinePath(viewportLabel, shotName) {
  return path.join(VISUAL_BASELINE_ROOT, viewportLabel, `${shotName}.png`);
}

export function getLatestCapturePath(viewportLabel, shotName) {
  return path.join(VISUAL_SMOKE_ROOT, viewportLabel, `${shotName}.png`);
}

export function getVisualRunRoot(runId) {
  return path.join(VISUAL_REGRESSION_ROOT, runId);
}

export function getVisualDiffPaths(runId, viewportLabel, shotName) {
  const base = path.join(getVisualRunRoot(runId), viewportLabel, shotName);
  return {
    base,
    expectedCopy: `${base}-expected.png`,
    actualCopy: `${base}-actual.png`,
    diff: `${base}-diff.png`,
    metrics: `${base}-metrics.json`,
  };
}

export async function resetVisualCaptureRoots() {
  await fs.rm(VISUAL_SMOKE_ROOT, { recursive: true, force: true });
}

export async function ensureVisualDirs(viewportLabels) {
  await fs.mkdir(VISUAL_BASELINE_ROOT, { recursive: true });
  await fs.mkdir(VISUAL_SMOKE_ROOT, { recursive: true });
  for (const label of viewportLabels) {
    await fs.mkdir(path.join(VISUAL_BASELINE_ROOT, label), { recursive: true });
    await fs.mkdir(path.join(VISUAL_SMOKE_ROOT, label), { recursive: true });
  }
}

export async function writeBaselineFromCapture(viewportLabel, shotName, capturePath) {
  const baselinePath = getBaselinePath(viewportLabel, shotName);
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.copyFile(capturePath, baselinePath);
  return baselinePath;
}
