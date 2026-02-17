export class AudioService {
  constructor({ eventBus } = {}) {
    this.eventBus = eventBus || null;
    this.scene = null;
    this.enabled = true;
    this.music = null;
    this.musicKey = "";
  }

  bindScene(scene) {
    this.scene = scene || null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stopMusic();
    }
    this.emit("audio:enabled-changed", { enabled: this.enabled });
  }

  playSfx(key, config = undefined) {
    if (!this.enabled || !key || !this.scene || !this.scene.sound) {
      return null;
    }
    try {
      return this.scene.sound.play(key, config);
    } catch {
      return null;
    }
  }

  playMusic(key, config = {}) {
    if (!this.enabled || !key || !this.scene || !this.scene.sound) {
      return null;
    }
    if (this.music && this.musicKey === key) {
      return this.music;
    }
    this.stopMusic();
    try {
      const sound = this.scene.sound.add(key, {
        loop: true,
        volume: 0.5,
        ...config,
      });
      sound.play();
      this.music = sound;
      this.musicKey = key;
      return sound;
    } catch {
      this.music = null;
      this.musicKey = "";
      return null;
    }
  }

  stopMusic() {
    if (!this.music) {
      return;
    }
    try {
      this.music.stop();
      this.music.destroy();
    } catch {
      // Best-effort cleanup.
    }
    this.music = null;
    this.musicKey = "";
  }

  emit(eventName, payload) {
    if (this.eventBus && typeof this.eventBus.emit === "function") {
      this.eventBus.emit(eventName, payload);
    }
  }
}
