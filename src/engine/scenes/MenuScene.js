import Phaser from "phaser";
import { SCENE_KEYS } from "../constants.js";
import { updateMenuSceneEmbers } from "./menu/menu-scene-ember-renderers.js";
import {
  initializeMenuSceneLifecycle,
  playMenuSceneIntroAnimation,
  preloadMenuSceneAssets,
  refreshMenuSceneResumeAvailability,
  resizeMenuSceneLayout,
  runMenuSceneAction,
  shouldUseFullscreenMobileMenu,
  teardownMenuSceneLifecycle,
} from "./menu/menu-scene-lifecycle.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.menu);
    this.actionsPollEvent = null;
    this.keyboardHandlers = [];
    this.menuButtons = null;
    this.background = null;
    this.bgImage = null;
    this.frameOverlay = null;
    this.frameBorder = null;
    this.menuColumnContainer = null;
    this.title = null;
    this.buttonLayout = [];
    this.menuFrameRect = null;
    this.frameMaskShape = null;
    this.frameMask = null;
    this.emberSprites = [];
    this.introTweens = [];
    this.disableVisualFx = false;
  }

  preload() {
    preloadMenuSceneAssets(this);
  }

  create() {
    initializeMenuSceneLifecycle(this);
  }

  update(time, delta) {
    updateMenuSceneEmbers(this, time, delta);
  }

  teardown() {
    teardownMenuSceneLifecycle(this);
  }

  onResize(gameSize) {
    resizeMenuSceneLayout(this, gameSize);
  }

  refreshResumeAvailability() {
    refreshMenuSceneResumeAvailability(this);
  }

  runMenuAction(actionName) {
    runMenuSceneAction(this, actionName);
  }

  shouldUseFullscreenMobileMenu(width = this.scale.gameSize.width) {
    return shouldUseFullscreenMobileMenu(this, width);
  }

  playIntroAnimation() {
    playMenuSceneIntroAnimation(this);
  }
}
