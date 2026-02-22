import fs from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

async function readPng(pngPath) {
  const data = await fs.readFile(pngPath);
  return PNG.sync.read(data);
}

function ratio(diffPixels, totalPixels) {
  if (!Number.isFinite(totalPixels) || totalPixels <= 0) {
    return 1;
  }
  return diffPixels / totalPixels;
}

export async function comparePngFiles({
  expectedPath,
  actualPath,
  diffPath,
  threshold,
  maxDiffRatio,
  maxDiffPixels,
}) {
  const expected = await readPng(expectedPath);
  const actual = await readPng(actualPath);

  if (expected.width !== actual.width || expected.height !== actual.height) {
    await fs.mkdir(path.dirname(diffPath), { recursive: true });
    return {
      passed: false,
      reason: "dimension-mismatch",
      widthExpected: expected.width,
      heightExpected: expected.height,
      widthActual: actual.width,
      heightActual: actual.height,
      diffPixels: Number.POSITIVE_INFINITY,
      diffRatio: 1,
      totalPixels: Math.max(expected.width * expected.height, actual.width * actual.height),
      threshold,
      maxDiffRatio,
      maxDiffPixels,
    };
  }

  const diffImage = new PNG({ width: expected.width, height: expected.height });
  const diffPixels = pixelmatch(
    expected.data,
    actual.data,
    diffImage.data,
    expected.width,
    expected.height,
    {
      threshold,
      alpha: 0.4,
      includeAA: false,
      diffMask: false,
    }
  );

  await fs.mkdir(path.dirname(diffPath), { recursive: true });
  await fs.writeFile(diffPath, PNG.sync.write(diffImage));

  const totalPixels = expected.width * expected.height;
  const diffRatio = ratio(diffPixels, totalPixels);
  const passed = diffPixels <= maxDiffPixels && diffRatio <= maxDiffRatio;

  return {
    passed,
    reason: passed ? "ok" : "threshold-exceeded",
    widthExpected: expected.width,
    heightExpected: expected.height,
    widthActual: actual.width,
    heightActual: actual.height,
    diffPixels,
    diffRatio,
    totalPixels,
    threshold,
    maxDiffRatio,
    maxDiffPixels,
  };
}
