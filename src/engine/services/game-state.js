const DEFAULT_STATE = Object.freeze({
  mode: "menu",
  profile: null,
  run: null,
});

export class GameStateService {
  constructor({ eventBus } = {}) {
    this.eventBus = eventBus || null;
    this.state = { ...DEFAULT_STATE };
  }

  getState() {
    return { ...this.state };
  }

  setMode(mode) {
    if (typeof mode !== "string" || mode.length === 0 || this.state.mode === mode) {
      return this.getState();
    }
    this.state.mode = mode;
    this.emit("mode:changed", { mode });
    this.emit("state:changed", this.getState());
    return this.getState();
  }

  patch(nextState) {
    if (!nextState || typeof nextState !== "object") {
      return this.getState();
    }
    this.state = {
      ...this.state,
      ...nextState,
    };
    this.emit("state:changed", this.getState());
    return this.getState();
  }

  reset() {
    this.state = { ...DEFAULT_STATE };
    this.emit("state:changed", this.getState());
    return this.getState();
  }

  emit(eventName, payload) {
    if (this.eventBus && typeof this.eventBus.emit === "function") {
      this.eventBus.emit(eventName, payload);
    }
  }
}
