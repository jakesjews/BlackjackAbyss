import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
import { createPhaserApp } from "./engine/app.js";
import { startRuntimeEngine } from "./engine/runtime/runtime-engine.js";

async function waitForDocumentFonts(timeoutMs = 2500) {
  if (typeof document === "undefined" || !document.fonts?.ready) {
    return;
  }
  const timeout = new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([document.fonts.ready, timeout]);
  } catch {
    // Continue app startup even if font readiness fails.
  }
}

await waitForDocumentFonts();
const phaserRuntimePayload = await createPhaserApp();
startRuntimeEngine(phaserRuntimePayload);
