import { createPhaserApp } from "./engine/app.js";

await createPhaserApp();
await import("../game.js");
