import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    const runtime = this.game.__ABYSS_RUNTIME__ || null;
    if (runtime?.audio && typeof runtime.audio.bindScene === "function") {
      runtime.audio.bindScene(this);
    }
  }
}
