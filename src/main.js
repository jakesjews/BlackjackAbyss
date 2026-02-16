import { createPhaserHost } from "./engine/phaser-host.js";

await createPhaserHost();
await import("../game.js");
