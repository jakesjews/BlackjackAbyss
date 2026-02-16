import { createPhaserHost } from "./engine/phaser-host.js";

createPhaserHost();
await import("../game.js");
