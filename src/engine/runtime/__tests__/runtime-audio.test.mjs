import { describe, expect, it, vi } from "vitest";
import { createRuntimeAudio } from "../core/runtime-audio.js";

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}

function createMusicSoundStub(overrides = {}) {
  const sound = {
    volume: 0,
    isPlaying: false,
    isPaused: true,
    setVolume: vi.fn((nextVolume) => {
      sound.volume = nextVolume;
    }),
    play: vi.fn(() => {
      sound.isPlaying = true;
      sound.isPaused = false;
      return Promise.resolve();
    }),
    pause: vi.fn(() => {
      sound.isPlaying = false;
      sound.isPaused = true;
    }),
    resume: vi.fn(() => {
      sound.isPlaying = true;
      sound.isPaused = false;
    }),
    stop: vi.fn(() => {
      sound.isPlaying = false;
      sound.isPaused = false;
    }),
  };
  return Object.assign(sound, overrides);
}

function createPhaserGame({
  audioKeys = ["music-key", "card-key", "grunt-key"],
  musicSound = createMusicSoundStub(),
} = {}) {
  const keySet = new Set(audioKeys);
  const sound = {
    add: vi.fn(() => musicSound),
    play: vi.fn(() => true),
  };

  return {
    sound,
    cache: {
      audio: {
        exists: vi.fn((key) => keySet.has(key)),
      },
    },
  };
}

function createBaseState() {
  return {
    mode: "menu",
    run: null,
    audio: {
      enabled: true,
      started: false,
      primed: false,
      context: null,
      masterGain: null,
      musicGain: null,
      sfxGain: null,
      musicSound: null,
      musicDuckTimer: 0,
      lastMusicMode: "menu",
    },
  };
}

function createAudioUnderTest({ state, phaserGame, globalWindow = {} }) {
  return createRuntimeAudio({
    state,
    phaserGame,
    phaserAudioKeys: {
      music: "music-key",
      card: "card-key",
      grunt: "grunt-key",
    },
    globalWindow,
    storageKeys: { audioEnabled: "audio" },
    saveAudioEnabled: vi.fn(),
    addLog: vi.fn(),
    setAnnouncement: vi.fn(),
    clampNumber,
  });
}

describe("runtime audio module", () => {
  it("setAudioEnabled persists flags and routes messaging to announcement/log", () => {
    const state = createBaseState();
    const phaserGame = createPhaserGame();
    const saveAudioEnabled = vi.fn();
    const addLog = vi.fn();
    const setAnnouncement = vi.fn();

    const audio = createRuntimeAudio({
      state,
      phaserGame,
      phaserAudioKeys: {
        music: "music-key",
        card: "card-key",
        grunt: "grunt-key",
      },
      globalWindow: {},
      storageKeys: { audioEnabled: "audio" },
      saveAudioEnabled,
      addLog,
      setAnnouncement,
      clampNumber,
    });

    audio.setAudioEnabled(true);
    expect(state.audio.enabled).toBe(true);
    expect(saveAudioEnabled).toHaveBeenCalledWith(true, { audioEnabled: "audio" });
    expect(setAnnouncement).toHaveBeenCalledWith("Sound enabled.", 1.1);

    state.run = { log: [] };
    audio.setAudioEnabled(false);
    expect(saveAudioEnabled).toHaveBeenLastCalledWith(false, { audioEnabled: "audio" });
    expect(addLog).toHaveBeenCalledWith("Sound muted.");
  });

  it("updateMusic pauses track when audio is not playable", () => {
    const state = createBaseState();
    state.audio.enabled = false;
    const track = createMusicSoundStub({
      volume: 0.5,
      isPlaying: true,
      isPaused: false,
    });
    state.audio.musicSound = track;
    const phaserGame = createPhaserGame({ musicSound: track });
    const audio = createAudioUnderTest({ state, phaserGame });

    audio.updateMusic(0.016);

    expect(track.setVolume).toHaveBeenCalled();
    expect(track.volume).toBe(0);
    expect(track.pause).toHaveBeenCalledTimes(1);
  });

  it("updateMusic applies ducked easing and resumes playback", () => {
    const state = createBaseState();
    state.mode = "playing";
    state.audio.enabled = true;
    state.audio.started = true;
    state.audio.context = { state: "running" };
    state.audio.musicDuckTimer = 0.2;
    const track = createMusicSoundStub({
      volume: 0.5,
      isPlaying: false,
      isPaused: true,
    });
    state.audio.musicSound = track;
    const phaserGame = createPhaserGame({ musicSound: track });
    const audio = createAudioUnderTest({ state, phaserGame });

    audio.updateMusic(0.1);

    expect(track.resume).toHaveBeenCalledTimes(1);
    expect(track.volume).toBeLessThan(0.5);
    expect(track.volume).toBeGreaterThan(0);
    expect(state.audio.lastMusicMode).toBe("playing");
    expect(state.audio.musicDuckTimer).toBeCloseTo(0.1, 4);
  });

  it("routes card and grunt SFX through Phaser sound manager", () => {
    const state = createBaseState();
    state.audio.enabled = true;
    state.audio.started = true;
    const phaserGame = createPhaserGame();
    const audio = createAudioUnderTest({ state, phaserGame });

    audio.playCardSfx();
    audio.playGruntSfx();

    expect(phaserGame.sound.play).toHaveBeenCalledWith("card-key", { volume: 0.62 });
    expect(phaserGame.sound.play).toHaveBeenCalledWith("grunt-key", { volume: 0.72 });
    expect(state.audio.musicDuckTimer).toBeGreaterThan(0);
  });

  it("unlockAudio creates graph, resumes context, and primes music playback", async () => {
    const masterSetTargetAtTime = vi.fn();
    const context = {
      state: "suspended",
      currentTime: 1,
      destination: {},
      createGain: vi.fn(() => ({
        gain: {
          value: 0,
          setTargetAtTime: masterSetTargetAtTime,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
      createOscillator: vi.fn(() => ({
        type: "",
        frequency: { setValueAtTime: vi.fn() },
        detune: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      resume: vi.fn(() => {
        context.state = "running";
        return Promise.resolve();
      }),
    };
    const AudioContextCtor = vi.fn(() => context);

    const state = createBaseState();
    state.audio.enabled = true;
    const track = createMusicSoundStub({
      isPaused: true,
      isPlaying: false,
    });
    const phaserGame = createPhaserGame({ musicSound: track });

    const audio = createRuntimeAudio({
      state,
      phaserGame,
      phaserAudioKeys: {
        music: "music-key",
        card: "card-key",
        grunt: "grunt-key",
      },
      globalWindow: { AudioContext: AudioContextCtor },
      storageKeys: { audioEnabled: "audio" },
      saveAudioEnabled: vi.fn(),
      addLog: vi.fn(),
      setAnnouncement: vi.fn(),
      clampNumber,
    });

    audio.unlockAudio();
    await Promise.resolve();
    await Promise.resolve();

    expect(AudioContextCtor).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(state.audio.started).toBe(true);
    expect(state.audio.primed).toBe(true);
    expect(track.resume).toHaveBeenCalledTimes(1);
    expect(masterSetTargetAtTime).toHaveBeenCalled();
  });
});
