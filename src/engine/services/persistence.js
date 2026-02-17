const DEFAULT_KEYS = Object.freeze({
  profile: "blackjack-abyss.profile.v1",
  run: "blackjack-abyss.run.v1",
});

export class PersistenceService {
  constructor({ keys } = {}) {
    this.keys = { ...DEFAULT_KEYS, ...(keys || {}) };
  }

  loadProfile() {
    return this.loadJson(this.keys.profile);
  }

  saveProfile(profile) {
    return this.saveJson(this.keys.profile, profile);
  }

  loadRun() {
    return this.loadJson(this.keys.run);
  }

  saveRun(run) {
    return this.saveJson(this.keys.run, run);
  }

  clearRun() {
    return this.remove(this.keys.run);
  }

  loadJson(key) {
    if (!key) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveJson(key, value) {
    if (!key) {
      return false;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  remove(key) {
    if (!key) {
      return false;
    }
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}
