import { createPhaserApp } from "./engine/app.js";
import { bootstrapRuntime } from "./engine/runtime/bootstrap.js";

await createPhaserApp();
bootstrapRuntime();
