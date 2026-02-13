#!/usr/bin/env node
const { chromium } = require("playwright");

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return args[idx + 1];
}

const url = argValue("--url", "http://127.0.0.1:4173");
const runs = Math.max(1, Number.parseInt(argValue("--runs", "40"), 10) || 40);
const mode = argValue("--mode", "fresh"); // fresh | progression
const stepMs = Math.max(60, Number.parseInt(argValue("--step-ms", "160"), 10) || 160);

function parseRank(cardText) {
  if (!cardText || typeof cardText !== "string") return "";
  if (cardText === "??") return "";
  return cardText.slice(0, -1);
}

function chooseRewardIndex(rewards) {
  const scoreByName = {
    "Abyss Contract": 96,
    "Gambler Royale": 94,
    "House Edge Breaker": 92,
    "Time Bank": 89,
    "Null Wallet": 83,
    "Insurance Sigil": 80,
    "Vitality Coil": 77,
    "Royal Wedge": 75,
    "Safety Net": 74,
    "Boss Hunter": 73,
    "Fortress Heart": 72,
    "Croupier Bane": 70,
    "Redline Core": 69,
    "Mirror Plate": 68,
    "Loaded Die": 67,
    "Soul Leech": 66,
    "Blood Prism": 65,
    "Iron Oath": 64,
    "Ace Sleeve": 63,
    "Dealer Tax Stamp": 61,
    "Pocket Anvil": 60,
    "Counterweight": 56,
    "Steel Shell": 55,
    "Razor Chip": 54,
    "First Spark": 52,
    "Dealer Tell": 50,
    "Coin Magnet": 48,
    "Push Protocol": 47,
    "Lucky Opener": 45,
    "Velvet Wallet": 43,
    "Stake Lantern": 41,
  };

  let best = 0;
  let bestScore = -1e9;
  for (let i = 0; i < rewards.length; i += 1) {
    const reward = rewards[i];
    const score = scoreByName[reward.name] ?? 40;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function chooseShopIndex(shop, gold, alreadyBought) {
  if (alreadyBought) return -1;
  const scoreByName = {
    "Patch Kit": 42,
    "Insurance Sigil": 81,
    "Vitality Coil": 79,
    "Royal Wedge": 76,
    "Safety Net": 75,
    "Boss Hunter": 74,
    "Fortress Heart": 73,
    "Loaded Die": 69,
    "Soul Leech": 68,
    "Blood Prism": 66,
    "Iron Oath": 65,
    "Ace Sleeve": 64,
    "Counterweight": 60,
    "Steel Shell": 59,
    "Razor Chip": 58,
    "First Spark": 56,
    "Dealer Tell": 54,
    "Coin Magnet": 50,
    "Push Protocol": 49,
    "Lucky Opener": 45,
  };

  let pick = -1;
  let pickValue = -1e9;
  for (let i = 0; i < shop.length; i += 1) {
    const item = shop[i];
    if (item.sold || item.cost > gold) continue;
    const base = scoreByName[item.name] ?? 44;
    const value = base - item.cost * 0.9;
    if (value > pickValue) {
      pickValue = value;
      pick = i;
    }
  }
  return pick;
}

function choosePlayAction(state) {
  const encounter = state.encounter;
  const actions = state.actions || [];
  const canSplit = actions.includes("s(split)");
  const canDouble = actions.includes("space(double)");
  const canHit = actions.includes("a(hit)");
  const canStand = actions.includes("b(stand)");

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
    if (total === 12) {
      return dealer >= 4 && dealer <= 6 ? "stand" : "hit";
    }
    if (total >= 13 && total <= 16) {
      return dealer >= 2 && dealer <= 6 ? "stand" : "hit";
    }
  }

  if (canStand) return "stand";
  if (canHit) return "hit";
  return "none";
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

async function moveSelection(page, stateList, targetIndex) {
  if (!Array.isArray(stateList) || stateList.length === 0) return;
  const current = Math.max(0, stateList.findIndex((entry) => entry.selected));
  const length = stateList.length;
  if (length <= 1) return;

  let forward = (targetIndex - current + length) % length;
  let backward = (current - targetIndex + length) % length;
  if (forward <= backward) {
    for (let i = 0; i < forward; i += 1) {
      await page.keyboard.press("ArrowRight");
      await advance(page, 80);
    }
  } else {
    for (let i = 0; i < backward; i += 1) {
      await page.keyboard.press("ArrowLeft");
      await advance(page, 80);
    }
  }
}

async function runSingle(page, runIndex) {
  let steps = 0;
  let lastMode = "";
  let boughtThisShop = false;

  await page.keyboard.press("Enter");
  await advance(page, 220);

  while (steps < 3800) {
    const state = await readState(page);
    const modeNow = state.mode;

    if (modeNow !== lastMode) {
      if (modeNow === "shop") {
        boughtThisShop = false;
      }
      lastMode = modeNow;
    }

    if (modeNow === "gameover" || modeNow === "victory") {
      return {
        outcome: modeNow,
        floor: Number(state?.run?.floor || 1),
        room: Number(state?.run?.room || 1),
        chips: Number(state?.run?.gold || 0),
        hp: Number(state?.run?.playerHp || 0),
        relics: Object.keys(state?.run?.relics || {}).length,
      };
    }

    if (modeNow === "menu") {
      await page.keyboard.press("Enter");
      await advance(page, 180);
      steps += 1;
      continue;
    }

    if (modeNow === "playing") {
      const action = choosePlayAction(state);
      if (action === "hit") {
        await page.keyboard.press("KeyA");
      } else if (action === "stand") {
        await page.keyboard.press("KeyB");
      } else if (action === "double") {
        await page.keyboard.press("Space");
      } else if (action === "split") {
        await page.keyboard.press("KeyS");
      } else {
        await page.keyboard.press("KeyB");
      }
      await advance(page, 180);
      steps += 1;
      continue;
    }

    if (modeNow === "reward") {
      const rewards = Array.isArray(state.rewards) ? state.rewards : [];
      if (rewards.length) {
        const idx = chooseRewardIndex(rewards);
        await moveSelection(page, rewards, idx);
      }
      await page.keyboard.press("Enter");
      await advance(page, 220);
      steps += 1;
      continue;
    }

    if (modeNow === "shop") {
      const shop = Array.isArray(state.shop) ? state.shop : [];
      const gold = Number(state?.run?.gold || 0);
      const buyIdx = chooseShopIndex(shop, gold, boughtThisShop);
      if (buyIdx >= 0) {
        await moveSelection(page, shop, buyIdx);
        await page.keyboard.press("Space");
        boughtThisShop = true;
        await advance(page, 160);
      }
      await page.keyboard.press("Enter");
      await advance(page, 220);
      steps += 1;
      continue;
    }

    await advance(page, 120);
    steps += 1;
  }

  return {
    outcome: "timeout",
    floor: 1,
    room: 1,
    chips: 0,
    hp: 0,
    relics: 0,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const rows = [];

  for (let i = 0; i < runs; i += 1) {
    if (mode === "fresh") {
      await context.clearCookies();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        try {
          window.localStorage.clear();
        } catch {
          // ignore
        }
      });
      await page.reload({ waitUntil: "domcontentloaded" });
    } else {
      if (i === 0) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
      } else {
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    }

    await advance(page, 200);
    const result = await runSingle(page, i);
    rows.push(result);

    if (mode !== "fresh") {
      await page.keyboard.press("Enter");
      await advance(page, 120);
    }
  }

  const wins = rows.filter((r) => r.outcome === "victory").length;
  const losses = rows.filter((r) => r.outcome === "gameover").length;
  const timeouts = rows.filter((r) => r.outcome === "timeout").length;
  const avgFloor = rows.reduce((acc, r) => acc + r.floor, 0) / rows.length;
  const avgRoom = rows.reduce((acc, r) => acc + r.room, 0) / rows.length;
  const avgRelics = rows.reduce((acc, r) => acc + r.relics, 0) / rows.length;

  console.log(JSON.stringify({
    mode,
    runs,
    wins,
    losses,
    timeouts,
    winRate: Number((wins / runs).toFixed(3)),
    avgFloor: Number(avgFloor.toFixed(2)),
    avgRoom: Number(avgRoom.toFixed(2)),
    avgRelics: Number(avgRelics.toFixed(2)),
    sample: rows.slice(0, 10),
  }, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
