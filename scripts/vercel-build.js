#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "public");
const filesToCopy = ["index.html", "styles.css", "game.js"];

fs.mkdirSync(outputDir, { recursive: true });

for (const relativeFile of filesToCopy) {
  const source = path.join(rootDir, relativeFile);
  const target = path.join(outputDir, relativeFile);
  fs.copyFileSync(source, target);
  console.log(`Copied ${relativeFile} -> public/${relativeFile}`);
}

console.log("Vercel build assets prepared.");
