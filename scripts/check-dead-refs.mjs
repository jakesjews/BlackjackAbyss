#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const includeRoots = [
  "src",
  "tests",
  "docs",
  "README.md",
  "PROGRESS.md",
];

const skipDirs = new Set([
  "node_modules",
  ".git",
  "dist",
  "artifacts",
  "output",
]);

const forbidden = [
  { label: "bootstrapRuntime", pattern: /\bbootstrapRuntime\b/g },
  { label: "runtime/bootstrap.js", pattern: /src\/engine\/runtime\/bootstrap\.js/g },
  { label: "LegacyRuntimeAdapter", pattern: /\bLegacyRuntimeAdapter\b/g },
];

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  if ([".js", ".mjs", ".md", ".html", ".css", ".json"].includes(ext)) {
    return true;
  }
  const baseName = path.basename(filePath);
  return baseName === "README.md" || baseName === "PROGRESS.md";
}

async function walk(relativePath, results) {
  const absolutePath = path.join(repoRoot, relativePath);
  let statEntries;
  try {
    statEntries = await readdir(absolutePath, { withFileTypes: true });
  } catch {
    if (shouldScanFile(relativePath)) {
      results.push(relativePath);
    }
    return;
  }

  for (const entry of statEntries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    if (entry.isDirectory() && skipDirs.has(entry.name)) {
      continue;
    }
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      await walk(child, results);
      continue;
    }
    if (entry.isFile() && shouldScanFile(child)) {
      results.push(child);
    }
  }
}

async function gatherFiles() {
  const files = [];
  for (const includeRoot of includeRoots) {
    await walk(includeRoot, files);
  }
  return files.sort();
}

async function scan() {
  const files = await gatherFiles();
  const findings = [];

  for (const file of files) {
    const absolutePath = path.join(repoRoot, file);
    const text = await readFile(absolutePath, "utf8");
    forbidden.forEach(({ label, pattern }) => {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        findings.push({ file, label, count: matches.length });
      }
    });
  }

  if (findings.length > 0) {
    console.error("Dead-reference check failed:");
    findings.forEach((finding) => {
      console.error(`- ${finding.file}: ${finding.label} (${finding.count})`);
    });
    process.exit(1);
  }

  console.log("Dead-reference check passed.");
}

await scan();
