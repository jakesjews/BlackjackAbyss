#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const OUTPUT_DIR = path.resolve(process.cwd(), "public/images/avatars");
const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

function usage() {
  console.log(`Usage:
  ./run avatar
  ./run avatar "custom name"

Generates a 1:1 fantasy bust portrait and saves it into:
  public/images/avatars
`);
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function randomSubject() {
  const titles = ["wandering", "arcane", "stormforged", "ironbound", "ashen", "luminous", "frostborn", "sun-cursed"];
  const roles = ["sellsword", "seer", "duelist", "archmage", "ranger", "warlock", "paladin", "assassin"];
  const picks = [titles[Math.floor(Math.random() * titles.length)], roles[Math.floor(Math.random() * roles.length)]];
  return picks.join(" ");
}

function parseArgs(argv) {
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      return { help: true };
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positional.push(arg);
  }
  return { help: false, name: positional.join(" ").trim() };
}

function buildPrompt(subject) {
  return [
    "Create a single fantasy-style character portrait.",
    `Character concept: ${subject}.`,
    "Composition: bust portrait (head and shoulders), centered, 1:1 image.",
    'Style: impressionistic "freemium mobile game" key art, painterly brush strokes, high readability.',
    "Look: fantasy-esque human or humanoid character, dramatic lighting, rich color, polished finish.",
    "Background: soft painterly backdrop, non-distracting.",
    "No text, no logos, no watermark, no UI, no frame.",
  ].join("\n");
}

async function generateImage(apiKey, prompt) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      prompt,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI image generation failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const first = Array.isArray(data?.data) ? data.data[0] : null;
  if (!first) {
    throw new Error("OpenAI image generation returned no data.");
  }

  if (first.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }
  if (first.url) {
    const imageResp = await fetch(first.url);
    if (!imageResp.ok) {
      throw new Error(`Failed downloading generated image (${imageResp.status}).`);
    }
    const arrayBuffer = await imageResp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("OpenAI image generation response had neither b64_json nor url.");
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String(err?.message || err));
    usage();
    process.exit(1);
    return;
  }

  if (parsed.help) {
    usage();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY (or OPENAI_KEY).");
    process.exit(1);
    return;
  }

  const subject = parsed.name || randomSubject();
  const prompt = buildPrompt(subject);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const slugBase = slugify(subject) || "avatar";
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const fileName = `${slugBase}-${stamp}.png`;
  const outputPath = path.join(OUTPUT_DIR, fileName);

  console.log(`Generating avatar with model "${DEFAULT_MODEL}"...`);
  console.log(`Subject: ${subject}`);

  const imageBuffer = await generateImage(apiKey, prompt);
  await fs.writeFile(outputPath, imageBuffer);

  console.log(`Saved avatar: ${path.relative(process.cwd(), outputPath)}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
