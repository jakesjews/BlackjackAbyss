export function createRuntimeAudio({
  state,
  phaserGame,
  phaserAudioKeys,
  globalWindow,
  storageKeys,
  saveAudioEnabled,
  addLog,
  setAnnouncement,
  clampNumber,
  lerpFn = (a, b, t) => a + (b - a) * t,
}) {
  const musicKey = typeof phaserAudioKeys?.music === "string" ? phaserAudioKeys.music : "";
  const cardKey = typeof phaserAudioKeys?.card === "string" ? phaserAudioKeys.card : "";
  const gruntKey = typeof phaserAudioKeys?.grunt === "string" ? phaserAudioKeys.grunt : "";

  function getAudioContextCtor() {
    return globalWindow.AudioContext || globalWindow.webkitAudioContext || null;
  }

  function getSoundManager() {
    const manager = phaserGame?.sound || null;
    return manager && typeof manager.add === "function" && typeof manager.play === "function" ? manager : null;
  }

  function hasCachedAudioKey(key) {
    if (!key) {
      return false;
    }
    const audioCache = phaserGame?.cache?.audio;
    return Boolean(audioCache && typeof audioCache.exists === "function" && audioCache.exists(key));
  }

  function setMusicVolume(sound, value) {
    if (!sound) {
      return;
    }
    const safeVolume = clampNumber(value, 0, 1, 0);
    if (typeof sound.setVolume === "function") {
      sound.setVolume(safeVolume);
      return;
    }
    sound.volume = safeVolume;
  }

  function getMusicVolume(sound) {
    if (!sound) {
      return 0;
    }
    return clampNumber(sound.volume, 0, 1, 0);
  }

  function pauseMusic(sound) {
    if (!sound) {
      return;
    }
    if (typeof sound.pause === "function") {
      try {
        sound.pause();
        return;
      } catch {
        // Ignore pause errors and try stopping.
      }
    }
    if (typeof sound.stop === "function") {
      try {
        sound.stop();
      } catch {
        // Ignore stop errors.
      }
    }
  }

  function resumeMusic(sound) {
    if (!sound || sound.isPlaying) {
      return;
    }
    if (sound.isPaused && typeof sound.resume === "function") {
      try {
        sound.resume();
        return;
      } catch {
        // Fall through to play.
      }
    }
    if (typeof sound.play === "function") {
      try {
        const playResult = sound.play({ loop: true, volume: getMusicVolume(sound) });
        if (playResult && typeof playResult.catch === "function") {
          playResult.catch(() => {});
        }
      } catch {
        // Ignore play errors.
      }
    }
  }

  function ensureMusicSound() {
    if (state.audio.musicSound) {
      return state.audio.musicSound;
    }
    const manager = getSoundManager();
    if (!manager || !hasCachedAudioKey(musicKey)) {
      return null;
    }
    try {
      const track = manager.add(musicKey, { loop: true, volume: 0 });
      if (!track) {
        return null;
      }
      setMusicVolume(track, 0);
      state.audio.musicSound = track;
      return track;
    } catch {
      return null;
    }
  }

  function playPhaserSfx(key, volume) {
    const manager = getSoundManager();
    if (!manager || !hasCachedAudioKey(key)) {
      return false;
    }
    try {
      manager.play(key, { volume: clampNumber(volume, 0, 1, volume) });
      return true;
    } catch {
      return false;
    }
  }

  function musicTargetVolumeForMode(mode) {
    if (mode === "menu") {
      return 0.13;
    }
    if (mode === "playing") {
      return 0.17;
    }
    return 0.145;
  }

  function markSfxActivity(weight = 1) {
    const intensity = Math.max(0.2, Math.min(2, Number(weight) || 1));
    const duckSeconds = 0.14 + Math.min(0.26, intensity * 0.08);
    state.audio.musicDuckTimer = Math.max(duckSeconds, Number(state.audio.musicDuckTimer) || 0);
  }

  function ensureAudioGraph() {
    if (state.audio.context) {
      return state.audio.context;
    }

    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      return null;
    }

    const context = new Ctor();
    const masterGain = context.createGain();
    const musicGain = context.createGain();
    const sfxGain = context.createGain();

    masterGain.gain.value = 0;
    musicGain.gain.value = 0.19;
    sfxGain.gain.value = 0.5;

    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);

    state.audio.context = context;
    state.audio.masterGain = masterGain;
    state.audio.musicGain = musicGain;
    state.audio.sfxGain = sfxGain;
    return context;
  }

  function syncAudioEnabled() {
    if (state.audio.context && state.audio.masterGain) {
      const target = state.audio.enabled ? 0.86 : 0;
      state.audio.masterGain.gain.setTargetAtTime(target, state.audio.context.currentTime, 0.08);
    }
    const track = ensureMusicSound();
    if (!track) {
      return;
    }
    if (!state.audio.enabled) {
      setMusicVolume(track, 0);
      pauseMusic(track);
    }
  }

  function unlockAudio() {
    const context = ensureAudioGraph();
    state.audio.started = true;
    const prime = () => {
      if (context && !state.audio.primed) {
        try {
          const osc = context.createOscillator();
          const gain = context.createGain();
          gain.gain.value = 0.00001;
          osc.frequency.setValueAtTime(440, context.currentTime);
          osc.connect(gain);
          gain.connect(state.audio.masterGain);
          osc.start(context.currentTime);
          osc.stop(context.currentTime + 0.03);
          state.audio.primed = true;
        } catch {
          // Ignore priming failures on browsers with stricter policies.
        }
      }
      syncAudioEnabled();
      const track = ensureMusicSound();
      if (track && state.audio.enabled) {
        resumeMusic(track);
      }
    };

    if (context && context.state !== "running" && state.audio.enabled) {
      context.resume().then(prime).catch(() => prime());
    } else {
      prime();
    }
  }

  function setAudioEnabled(enabled) {
    state.audio.enabled = Boolean(enabled);
    saveAudioEnabled(state.audio.enabled, storageKeys);
    if (state.audio.enabled) {
      unlockAudio();
    }
    syncAudioEnabled();
    const line = state.audio.enabled ? "Sound enabled." : "Sound muted.";
    if (state.run) {
      addLog(line);
    } else {
      setAnnouncement(line, 1.1);
    }
  }

  function toggleAudio() {
    setAudioEnabled(!state.audio.enabled);
  }

  function canPlayAudio() {
    return state.audio.enabled && state.audio.started;
  }

  function canPlayToneAudio() {
    return canPlayAudio() && Boolean(state.audio.context) && state.audio.context.state === "running";
  }

  function playTone(freq, duration, opts = {}) {
    if (!canPlayToneAudio()) {
      return;
    }
    const context = state.audio.context;
    const isMusicBus = opts.bus === "music";
    const bus = isMusicBus ? state.audio.musicGain : state.audio.sfxGain;
    if (!context || !bus) {
      return;
    }

    const when = Math.max(context.currentTime, Number(opts.when) || context.currentTime);
    const attack = Math.max(0.001, Number(opts.attack) || 0.002);
    const release = Math.max(0.012, Number(opts.release) || 0.09);
    const gainLevel = Math.max(0.001, Number(opts.gain) || 0.08);
    const sustainLevel = Math.max(0, Math.min(gainLevel, Number(opts.sustainGain) || gainLevel * 0.72));
    if (!isMusicBus) {
      markSfxActivity(Math.max(0.3, gainLevel * 9));
    }

    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = opts.type || "triangle";
    osc.frequency.setValueAtTime(Math.max(20, freq), when);
    if (Number.isFinite(opts.detune)) {
      osc.detune.setValueAtTime(opts.detune, when);
    }

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(gainLevel, when + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, when + Math.max(attack + 0.01, duration * 0.55));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + release);

    osc.connect(gain);
    gain.connect(bus);

    osc.start(when);
    osc.stop(when + duration + release + 0.01);
  }

  function playImpactSfx(amount, target) {
    const hit = Math.max(1, Number(amount) || 1);
    const base = target === "enemy" ? 168 : 110;
    const length = Math.min(0.28, 0.09 + hit * 0.009);
    playTone(base, length, { type: "triangle", gain: Math.min(0.25, 0.08 + hit * 0.01), release: 0.18 });
    playTone(base * 1.62, Math.max(0.05, length * 0.7), {
      type: "square",
      gain: Math.min(0.14, 0.035 + hit * 0.006),
      release: 0.08,
      detune: target === "enemy" ? 6 : -9,
    });
  }

  function playDealSfx(target) {
    const base = target === "player" ? 590 : 470;
    playTone(base, 0.05, { type: "square", gain: 0.04, release: 0.03 });
  }

  function playFireballLaunchSfx(attacker = "player", target = "enemy", amount = 1) {
    const power = Math.max(1, Number(amount) || 1);
    const towardEnemy = target === "enemy";
    const now = state.audio.context?.currentTime || 0;
    const base = towardEnemy ? 412 : 332;
    playTone(base + (attacker === "enemy" ? -24 : 24), 0.08, {
      type: "sawtooth",
      gain: Math.min(0.13, 0.055 + power * 0.002),
      release: 0.06,
      when: now,
      detune: towardEnemy ? 14 : -14,
    });
    playTone(base * 1.52, 0.12, {
      type: "triangle",
      gain: Math.min(0.11, 0.045 + power * 0.0015),
      release: 0.1,
      when: now + 0.03,
      detune: towardEnemy ? 8 : -8,
    });
  }

  function playFireballImpactSfx(amount = 1, target = "enemy") {
    const power = Math.max(1, Number(amount) || 1);
    const now = state.audio.context?.currentTime || 0;
    playImpactSfx(power, target);
    playTone(target === "enemy" ? 148 : 132, Math.min(0.22, 0.1 + power * 0.004), {
      type: "square",
      gain: Math.min(0.16, 0.055 + power * 0.0024),
      release: 0.1,
      when: now + 0.01,
    });
    playTone(target === "enemy" ? 220 : 196, Math.min(0.3, 0.12 + power * 0.005), {
      type: "triangle",
      gain: Math.min(0.12, 0.04 + power * 0.0018),
      release: 0.18,
      when: now + 0.05,
    });
  }

  function playCardSfx() {
    if (!canPlayAudio()) {
      return;
    }
    markSfxActivity(1.25);
    playPhaserSfx(cardKey, 0.62);
  }

  function playGruntSfx() {
    if (!canPlayAudio()) {
      return;
    }
    markSfxActivity(1.35);
    playPhaserSfx(gruntKey, 0.72);
  }

  function playUiSfx(kind) {
    if (kind === "card") {
      playCardSfx();
      return;
    }
    if (kind === "select") {
      playTone(820, 0.045, { type: "sine", gain: 0.034, release: 0.025 });
      return;
    }
    if (kind === "confirm") {
      const now = state.audio.context?.currentTime || 0;
      playTone(600, 0.06, { type: "triangle", gain: 0.06, release: 0.04 });
      playTone(900, 0.09, { type: "sine", gain: 0.05, release: 0.06, when: now + 0.045 });
      return;
    }
    if (kind === "error") {
      playTone(230, 0.09, { type: "square", gain: 0.06, release: 0.08 });
      return;
    }
    if (kind === "coin") {
      const now = state.audio.context?.currentTime || 0;
      playTone(760, 0.06, { type: "triangle", gain: 0.06, release: 0.04, when: now });
      playTone(1180, 0.08, { type: "sine", gain: 0.055, release: 0.06, when: now + 0.05 });
    }
  }

  function playActionSfx(action) {
    if (action === "hit") {
      playTone(510, 0.05, { type: "square", gain: 0.05, release: 0.04 });
      return;
    }
    if (action === "stand") {
      playTone(360, 0.08, { type: "triangle", gain: 0.055, release: 0.08 });
      return;
    }
    if (action === "double") {
      const now = state.audio.context?.currentTime || 0;
      playTone(460, 0.09, { type: "square", gain: 0.08, release: 0.08, when: now });
      playTone(690, 0.12, { type: "triangle", gain: 0.07, release: 0.1, when: now + 0.06 });
    }
  }

  function playOutcomeSfx(outcome, outgoing, incoming) {
    if (outcome === "blackjack") {
      const now = state.audio.context?.currentTime || 0;
      playTone(440, 0.12, { type: "triangle", gain: 0.085, release: 0.1, when: now });
      playTone(660, 0.14, { type: "triangle", gain: 0.075, release: 0.12, when: now + 0.05 });
      playTone(990, 0.2, { type: "sine", gain: 0.07, release: 0.16, when: now + 0.1 });
      return;
    }

    if (outcome === "push") {
      playTone(420, 0.06, { type: "sine", gain: 0.03, release: 0.04 });
    }
  }

  function updateMusic(dt) {
    const track = ensureMusicSound();
    if (!track) {
      return;
    }
    if (!canPlayAudio()) {
      setMusicVolume(track, 0);
      pauseMusic(track);
      return;
    }

    resumeMusic(track);

    state.audio.musicDuckTimer = Math.max(0, (Number(state.audio.musicDuckTimer) || 0) - dt);
    const ducking = state.audio.musicDuckTimer > 0 ? 0.4 : 1;
    const targetVolume = musicTargetVolumeForMode(state.mode) * ducking;
    const currentVolume = getMusicVolume(track);
    const easedVolume = lerpFn(currentVolume, targetVolume, Math.min(1, Math.max(0, dt * 7.2)));
    setMusicVolume(track, clampNumber(easedVolume, 0, 1, targetVolume));
    state.audio.lastMusicMode = state.mode;
  }

  return {
    unlockAudio,
    setAudioEnabled,
    toggleAudio,
    canPlayAudio,
    playTone,
    playImpactSfx,
    playDealSfx,
    playFireballLaunchSfx,
    playFireballImpactSfx,
    playUiSfx,
    playActionSfx,
    playOutcomeSfx,
    playCardSfx,
    playGruntSfx,
    updateMusic,
    markSfxActivity,
    syncAudioEnabled,
    ensureMusicSound,
    ensureAudioGraph,
  };
}
