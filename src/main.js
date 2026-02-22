import { createPhaserApp } from "./engine/app.js";
import { startRuntimeEngine } from "./engine/runtime/runtime-engine.js";

const phaserRuntimePayload = await createPhaserApp();
startRuntimeEngine(phaserRuntimePayload);
