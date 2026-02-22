#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const args = process.argv.slice(2);

function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return args[idx + 1];
}

const url = argValue("--url", "http://127.0.0.1:4173");
const outDir = argValue("--out", "artifacts/visual-smoke/latest");
const stepMs = Math.max(70, Number.parseInt(argValue("--step-ms", "180"), 10) || 180);
const maxModeSteps = Math.max(120, Number.parseInt(argValue("--max-steps", "260"), 10) || 260);
const forceReward = args.includes("--force-reward");
const debugPage = args.includes("--debug-page");
const RUN_SNAPSHOT_KEY = "blackjack-abyss.run.v1";
const FORCED_REWARD_IDS = ["bunker-chip", "chipped-edge", "coin-magnet"];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function advance(page, ms = stepMs) {
  await page.evaluate(async (delay) => {
    if (typeof window.advanceTime === "function") {
      await window.advanceTime(delay);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }, ms);
}

async function readState(page) {
  const json = await page.evaluate(() => {
    if (typeof window.render_game_to_text === "function") {
      return window.render_game_to_text();
    }
    return "{}";
  });
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

async function debugRuntimeSnapshot(page) {
  return page.evaluate(() => {
    const runtime = window.__ABYSS_ENGINE_RUNTIME__ || null;
    const runtimeApis = runtime?.apis && typeof runtime.apis === "object" ? runtime.apis : null;
    const bridge = window.__ABYSS_PHASER_BRIDGE__ || null;
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
      externalRendererActive: Boolean(bridge?.isExternalRendererActive?.(parsedState?.mode || "")),
      activeScenes,
      sceneStates,
      runSnapshotMode: runSnapshot?.mode || "",
      runSnapshotHasStatus: Boolean(runSnapshot?.status),
    };
  });
}

async function waitForMode(page, allowedModes, maxTicks = 80) {
  const wanted = new Set(Array.isArray(allowedModes) ? allowedModes : [allowedModes]);
  for (let i = 0; i < maxTicks; i += 1) {
    const state = await readState(page);
    if (wanted.has(state.mode)) {
      return state.mode;
    }
    await advance(page, stepMs);
  }
  return null;
}

async function forceRewardSnapshot(page, rewardIds = FORCED_REWARD_IDS) {
  return page.evaluate(
    ({ runKey, ids }) => {
      const raw = window.localStorage.getItem(runKey);
      if (!raw) return false;
      let snapshot = null;
      try {
        snapshot = JSON.parse(raw);
      } catch {
        return false;
      }
      if (!snapshot || typeof snapshot !== "object" || !snapshot.run || !snapshot.encounter) {
        return false;
      }
      snapshot.mode = "reward";
      snapshot.rewardOptionIds = Array.isArray(ids) ? ids.slice(0, 3) : [];
      snapshot.selectionIndex = 0;
      snapshot.savedAt = Date.now();
      window.localStorage.setItem(runKey, JSON.stringify(snapshot));
      return true;
    },
    { runKey: RUN_SNAPSHOT_KEY, ids: rewardIds }
  );
}

function parseRank(cardText) {
  if (!cardText || typeof cardText !== "string") return "";
  if (cardText === "??") return "";
  return cardText.slice(0, -1);
}

function choosePlayAction(state) {
  const encounter = state.encounter;
  const actions = state.actions || [];
  const canSplit = actions.includes("s(split)");
  const canDouble = actions.includes("c(double)") || actions.includes("space(double)");
  const canHit = actions.includes("z(hit)") || actions.includes("a(hit)");
  const canStand = actions.includes("x(stand)") || actions.includes("b(stand)");

  const playerCards = encounter?.playerHand || [];
  const total = Number(encounter?.playerTotal) || 0;
  const dealer = Number(encounter?.dealerVisibleTotal) || 0;
  const ranks = playerCards.map(parseRank).filter(Boolean);
  const pair = ranks.length === 2 && ranks[0] === ranks[1];
  const hasAce = ranks.includes("A");
  const soft = hasAce && total <= 21 && total <= 18;

  if (canSplit && pair) {
    const rank = ranks[0];
    if (rank === "A" || rank === "8") return "split";
    if (rank === "9" && (dealer <= 6 || dealer >= 8)) return "split";
    if ((rank === "2" || rank === "3" || rank === "7") && dealer >= 2 && dealer <= 7) return "split";
    if (rank === "6" && dealer >= 2 && dealer <= 6) return "split";
  }

  if (canDouble && ranks.length === 2) {
    if (total === 11) return "double";
    if (total === 10 && dealer >= 2 && dealer <= 9) return "double";
    if (total === 9 && dealer >= 3 && dealer <= 6) return "double";
    if (soft && total >= 17 && total <= 18 && dealer >= 3 && dealer <= 6) return "double";
  }

  if (canHit) {
    if (soft && total <= 17) return "hit";
    if (total <= 11) return "hit";
    if (total === 12) return dealer >= 4 && dealer <= 6 ? "stand" : "hit";
    if (total >= 13 && total <= 16) return dealer >= 2 && dealer <= 6 ? "stand" : "hit";
  }

  if (canStand) return "stand";
  if (canHit) return "hit";
  return "none";
}

async function driveOneStep(page, state) {
  const mode = state.mode;
  if (mode === "menu") {
    await page.keyboard.press("Enter");
    await advance(page, 220);
    return;
  }
  if (mode === "playing") {
    const actions = Array.isArray(state.actions) ? state.actions : [];
    if (actions.includes("enter(let's-go)") || actions.includes("space(let's-go)")) {
      await page.keyboard.press("Enter");
      await advance(page, 180);
      return;
    }
    const action = choosePlayAction(state);
    if (action === "hit") await page.keyboard.press("KeyZ");
    else if (action === "stand") await page.keyboard.press("KeyX");
    else if (action === "double") await page.keyboard.press("KeyC");
    else if (action === "split") await page.keyboard.press("KeyS");
    else await page.keyboard.press("KeyX");
    await advance(page, 200);
    return;
  }
  if (mode === "reward" || mode === "shop") {
    await page.keyboard.press("Enter");
    await advance(page, 240);
    return;
  }
  await advance(page, 150);
}

async function capture(page, outPath) {
  await page.screenshot({ path: outPath, fullPage: true });
}

async function runViewport(browser, viewportConfig) {
  const folder = path.join(outDir, viewportConfig.id);
  await ensureDir(folder);

  const context = await browser.newContext({ viewport: viewportConfig.viewport });
  const page = await context.newPage();
  if (debugPage) {
    page.on("pageerror", (error) => {
      console.error(`[${viewportConfig.id}] pageerror: ${error?.message || error}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.error(`[${viewportConfig.id}] console.${msg.type()}: ${msg.text()}`);
      }
    });
  }

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await advance(page, 260);

  await capture(page, path.join(folder, "01-menu.png"));

  await page.keyboard.press("KeyA");
  await advance(page, 200);
  await waitForMode(page, "collection", 50);
  await capture(page, path.join(folder, "02-collection.png"));

  await page.keyboard.press("Escape");
  await advance(page, 220);
  await waitForMode(page, "menu", 50);

  await page.keyboard.press("Enter");
  await advance(page, 260);
  await waitForMode(page, "playing", 60);
  const debugPlaying = await debugRuntimeSnapshot(page);
  console.log(`[${viewportConfig.id}] playing debug: ${JSON.stringify(debugPlaying)}`);
  await capture(page, path.join(folder, "03-playing.png"));
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press("Enter");
    await advance(page, 180);
  }
  await capture(page, path.join(folder, "03b-playing-actions.png"));

  const logsToggle = page.locator("#logs-toggle");
  const hasVisibleLogsToggle =
    (await logsToggle.count()) > 0 &&
    (await logsToggle
      .first()
      .isVisible()
      .catch(() => false));
  if (hasVisibleLogsToggle) {
    await logsToggle.click();
    await advance(page, 180);
    await capture(page, path.join(folder, "04-logs.png"));
    const logsClose = page.locator("#logs-close");
    if (await logsClose.count()) {
      await logsClose.click();
      await advance(page, 120);
    }
  }

  const seenModes = new Set();
  if (forceReward) {
    let forced = false;
    for (let i = 0; i < 36 && !forced; i += 1) {
      forced = await forceRewardSnapshot(page);
      if (forced) {
        break;
      }
      const state = await readState(page);
      await driveOneStep(page, state);
    }
    console.log(`[${viewportConfig.id}] force-reward snapshot patched: ${forced ? "yes" : "no"}`);
    if (forced) {
      await page.addInitScript(
        ({ runKey, ids }) => {
          try {
            const raw = window.localStorage.getItem(runKey);
            if (!raw) return;
            const snapshot = JSON.parse(raw);
            if (!snapshot || typeof snapshot !== "object") return;
            snapshot.mode = "reward";
            snapshot.rewardOptionIds = Array.isArray(ids) ? ids.slice(0, 3) : [];
            snapshot.selectionIndex = 0;
            snapshot.savedAt = Date.now();
            window.localStorage.setItem(runKey, JSON.stringify(snapshot));
          } catch {
            // ignore
          }
        },
        { runKey: RUN_SNAPSHOT_KEY, ids: FORCED_REWARD_IDS }
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await advance(page, 260);
      const storedMode = await page.evaluate((runKey) => {
        try {
          const raw = window.localStorage.getItem(runKey);
          if (!raw) return "";
          const parsed = JSON.parse(raw);
          return parsed?.mode || "";
        } catch {
          return "";
        }
      }, RUN_SNAPSHOT_KEY);
      console.log(`[${viewportConfig.id}] force-reward stored mode before resume: ${storedMode || "none"}`);
      await page.keyboard.press("KeyR");
      await advance(page, 260);
      const mode = await waitForMode(page, ["reward", "playing"], 80);
      console.log(`[${viewportConfig.id}] force-reward resume mode: ${mode || "none"}`);
      if (mode === "reward") {
        await advance(page, Math.max(stepMs, 420));
        await capture(page, path.join(folder, "05-reward.png"));
        seenModes.add("reward");
      }
    }
  }

  for (let i = 0; i < maxModeSteps; i += 1) {
    const state = await readState(page);
    if (state.mode === "reward" && !seenModes.has("reward")) {
      seenModes.add("reward");
      await advance(page, Math.max(stepMs, 320));
      await capture(page, path.join(folder, "05-reward.png"));
    }
    if (state.mode === "shop" && !seenModes.has("shop")) {
      seenModes.add("shop");
      await capture(page, path.join(folder, "06-shop.png"));
    }
    if ((state.mode === "gameover" || state.mode === "victory") && !seenModes.has("end")) {
      seenModes.add("end");
      await capture(page, path.join(folder, `07-${state.mode}.png`));
      break;
    }
    await driveOneStep(page, state);
  }

  await context.close();
}

async function main() {
  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { id: "desktop-1280x720", viewport: { width: 1280, height: 720 } },
    { id: "mobile-430x932", viewport: { width: 430, height: 932 } },
  ];

  for (const viewport of viewports) {
    await runViewport(browser, viewport);
  }

  await browser.close();
  console.log(`Saved screenshots to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
