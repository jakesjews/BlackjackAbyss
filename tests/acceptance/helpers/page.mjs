import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { getAcceptanceBaseUrl } from "./server.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

let sharedBrowser = null;

function normalizeFastPathFlags(fastPath = null) {
  if (!fastPath || typeof fastPath !== "object") {
    return {
      enabled: false,
      afterHands: 1,
      target: "none",
    };
  }
  return {
    enabled: Boolean(fastPath.enabled),
    afterHands: Math.max(1, Number.isFinite(Number(fastPath.afterHands)) ? Math.floor(Number(fastPath.afterHands)) : 1),
    target: ["none", "reward", "shop"].includes(fastPath.target) ? fastPath.target : "none",
  };
}

function sanitizeLabel(value) {
  return String(value || "acceptance")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "acceptance";
}

async function ensureBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  return sharedBrowser;
}

export async function createAcceptanceSession({ fastPath = null } = {}) {
  const browser = await ensureBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error?.message || String(error));
  });

  const testFlags = {
    fastPath: normalizeFastPathFlags(fastPath),
  };
  await page.addInitScript((flags) => {
    window.__ABYSS_TEST_FLAGS__ = flags;
  }, testFlags);

  const url = getAcceptanceBaseUrl();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof window.render_game_to_text === "function" && typeof window.advanceTime === "function",
    null,
    { timeout: 20_000 }
  );

  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      // Storage may be blocked in some environments.
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof window.render_game_to_text === "function" && typeof window.advanceTime === "function",
    null,
    { timeout: 20_000 }
  );

  return {
    page,
    context,
    consoleErrors,
    pageErrors,
    async close() {
      await context.close();
    },
  };
}

export async function captureFailureArtifacts(session, label) {
  const page = session?.page;
  if (!page) {
    return null;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = sanitizeLabel(label);
  const artifactDir = path.join(REPO_ROOT, "artifacts", "acceptance", "failures", `${timestamp}-${name}`);
  await fs.mkdir(artifactDir, { recursive: true });

  const runtimeText = await page
    .evaluate(() => {
      if (typeof window.render_game_to_text === "function") {
        return window.render_game_to_text();
      }
      return "{}";
    })
    .catch(() => "{}");

  await page
    .screenshot({
      path: path.join(artifactDir, "screen.png"),
      fullPage: true,
    })
    .catch(() => {});

  await fs.writeFile(path.join(artifactDir, "runtime.txt"), String(runtimeText || "{}"), "utf8");
  await fs.writeFile(
    path.join(artifactDir, "errors.json"),
    JSON.stringify(
      {
        consoleErrors: Array.isArray(session.consoleErrors) ? session.consoleErrors : [],
        pageErrors: Array.isArray(session.pageErrors) ? session.pageErrors : [],
      },
      null,
      2
    ),
    "utf8"
  );
  return artifactDir;
}

export async function closeSharedAcceptanceBrowser() {
  if (!sharedBrowser) {
    return;
  }
  await sharedBrowser.close();
  sharedBrowser = null;
}
