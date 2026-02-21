import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const ACCEPTANCE_HOST = process.env.ABYSS_ACCEPTANCE_HOST || "127.0.0.1";
const ACCEPTANCE_PORT = Number.parseInt(process.env.ABYSS_ACCEPTANCE_PORT || "4173", 10);
const ACCEPTANCE_URL = process.env.ABYSS_ACCEPTANCE_URL || `http://${ACCEPTANCE_HOST}:${ACCEPTANCE_PORT}`;
const START_TIMEOUT_MS = Number.parseInt(process.env.ABYSS_ACCEPTANCE_START_TIMEOUT_MS || "45000", 10);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

let serverProcess = null;
let serverStarting = null;
let logTail = [];
let cleanupRegistered = false;

function pushLogChunk(chunk) {
  const lines = String(chunk || "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return;
  }
  logTail.push(...lines);
  if (logTail.length > 160) {
    logTail = logTail.slice(logTail.length - 160);
  }
}

function formatLogTail() {
  if (!logTail.length) {
    return "(no server logs captured)";
  }
  return logTail.slice(-40).join("\n");
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
      lastError = new Error(`server responded with ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(220);
  }
  throw new Error(`Timed out waiting for acceptance server at ${url}: ${lastError?.message || "unknown error"}`);
}

async function terminateServerProcess(proc) {
  if (!proc || proc.exitCode !== null) {
    return;
  }
  const detached = process.platform !== "win32";
  const targetPid = detached ? -proc.pid : proc.pid;
  try {
    process.kill(targetPid, "SIGTERM");
  } catch {
    return;
  }
  const timeout = Date.now() + 5000;
  while (proc.exitCode === null && Date.now() < timeout) {
    await delay(120);
  }
  if (proc.exitCode !== null) {
    return;
  }
  try {
    process.kill(targetPid, "SIGKILL");
  } catch {
    // Ignore final kill errors during teardown.
  }
}

function registerCleanup() {
  if (cleanupRegistered) {
    return;
  }
  cleanupRegistered = true;
  process.once("exit", () => {
    if (serverProcess && serverProcess.exitCode === null) {
      try {
        const detached = process.platform !== "win32";
        process.kill(detached ? -serverProcess.pid : serverProcess.pid, "SIGKILL");
      } catch {
        // Ignore exit cleanup errors.
      }
    }
  });
}

export function getAcceptanceBaseUrl() {
  return ACCEPTANCE_URL;
}

export async function startAcceptanceServer() {
  registerCleanup();
  if (serverProcess && serverProcess.exitCode === null) {
    return ACCEPTANCE_URL;
  }
  if (serverStarting) {
    await serverStarting;
    return ACCEPTANCE_URL;
  }

  serverStarting = (async () => {
    logTail = [];
    const child = spawn("npm", ["run", "dev", "--", "--host", ACCEPTANCE_HOST, "--port", String(ACCEPTANCE_PORT), "--strictPort"], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        FORCE_COLOR: "0",
      },
    });
    serverProcess = child;
    child.stdout?.on("data", pushLogChunk);
    child.stderr?.on("data", pushLogChunk);

    try {
      await waitForServer(ACCEPTANCE_URL, START_TIMEOUT_MS);
    } catch (error) {
      await terminateServerProcess(child);
      serverProcess = null;
      throw new Error(`Failed to start acceptance server.\n${error.message}\n\nServer logs:\n${formatLogTail()}`);
    }
  })();

  try {
    await serverStarting;
    return ACCEPTANCE_URL;
  } finally {
    serverStarting = null;
  }
}

export async function stopAcceptanceServer() {
  const proc = serverProcess;
  serverProcess = null;
  serverStarting = null;
  await terminateServerProcess(proc);
}
