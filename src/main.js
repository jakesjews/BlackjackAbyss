import { createPhaserApp } from "./engine/app.js";
import { startRuntimeEngine } from "./engine/runtime/runtime-engine.js";

await createPhaserApp();
startRuntimeEngine();
