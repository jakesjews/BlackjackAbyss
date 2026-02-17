export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (typeof handler !== "function") {
      return () => {};
    }
    let bucket = this.listeners.get(eventName);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(eventName, bucket);
    }
    bucket.add(handler);
    return () => this.off(eventName, handler);
  }

  once(eventName, handler) {
    if (typeof handler !== "function") {
      return () => {};
    }
    const off = this.on(eventName, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(eventName, handler) {
    const bucket = this.listeners.get(eventName);
    if (!bucket) {
      return;
    }
    bucket.delete(handler);
    if (bucket.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit(eventName, payload) {
    const bucket = this.listeners.get(eventName);
    if (!bucket) {
      return;
    }
    [...bucket].forEach((handler) => {
      try {
        handler(payload);
      } catch {
        // Keep runtime stable if one listener fails.
      }
    });
  }

  clear() {
    this.listeners.clear();
  }
}
