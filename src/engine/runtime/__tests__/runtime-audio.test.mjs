import { describe, expect, it, vi } from "vitest";
import { createRuntimeAudio } from "../bootstrap/runtime-audio.js";

function createAudioElementStub(overrides = {}) {
  return {
    preload: "",
    loop: false,
    volume: 0,
    src: "",
    paused: true,
    currentTime: 0,
    addEventListener: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    ...overrides,
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
      musicElement: null,
      gruntElement: null,
      cardElements: [],
      cardNextIndex: 0,
      musicSourceIndex: 0,
      gruntSourceIndex: 0,
      cardSourceIndex: 0,
      musicDuckTimer: 0,
      lastMusicMode: "menu",
    },
  };
}

describe("runtime audio module", () => {
  it("setAudioEnabled persists flags and routes messaging to announcement/log", () => {
    const state = createBaseState();
    const saveAudioEnabled = vi.fn();
    const addLog = vi.fn();
    const setAnnouncement = vi.fn();

    const audio = createRuntimeAudio({
      state,
      globalWindow: {},
      createAudioElement: () => createAudioElementStub(),
      storageKeys: { audioEnabled: "audio" },
      saveAudioEnabled,
      musicTrackSources: ["/music.mp3"],
      gruntSources: ["/grunt.wav"],
      cardSources: ["/card.wav"],
      isExternalModeRendering: () => true,
      addLog,
      setAnnouncement,
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      lerpFn: (a, b, t) => a + (b - a) * t,
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
    const track = createAudioElementStub({ paused: false, volume: 0.5 });
    const audio = createRuntimeAudio({
      state,
      globalWindow: {},
      createAudioElement: () => track,
      storageKeys: { audioEnabled: "audio" },
      saveAudioEnabled: vi.fn(),
      musicTrackSources: ["/music.mp3"],
      gruntSources: ["/grunt.wav"],
      cardSources: ["/card.wav"],
      isExternalModeRendering: () => true,
      addLog: vi.fn(),
      setAnnouncement: vi.fn(),
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      lerpFn: (a, b, t) => a + (b - a) * t,
    });

    audio.updateMusic(0.016);
    expect(track.volume).toBe(0);
    expect(track.pause).toHaveBeenCalledTimes(1);
  });

  it("updateMusic applies ducked easing and starts playback when paused", () => {
    const state = createBaseState();
    state.mode = "playing";
    state.audio.enabled = true;
    state.audio.started = true;
    state.audio.context = { state: "running" };
    state.audio.musicDuckTimer = 0.2;
    const track = createAudioElementStub({ paused: true, volume: 0.5 });
    const audio = createRuntimeAudio({
      state,
      globalWindow: {},
      createAudioElement: () => track,
      storageKeys: { audioEnabled: "audio" },
      saveAudioEnabled: vi.fn(),
      musicTrackSources: ["/music.mp3"],
      gruntSources: ["/grunt.wav"],
      cardSources: ["/card.wav"],
      isExternalModeRendering: () => true,
      addLog: vi.fn(),
      setAnnouncement: vi.fn(),
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      lerpFn: (a, b, t) => a + (b - a) * t,
    });

    audio.updateMusic(0.1);
    expect(track.play).toHaveBeenCalledTimes(1);
    expect(track.volume).toBeLessThan(0.5);
    expect(track.volume).toBeGreaterThan(0);
    expect(state.audio.lastMusicMode).toBe("playing");
    expect(state.audio.musicDuckTimer).toBeCloseTo(0.1, 4);
  });

  it("playCardSfx rotates card clip pool when audio is active", async () => {
    const state = createBaseState();
    state.audio.enabled = true;
    state.audio.started = true;
    state.audio.context = { state: "running" };
    const clips = [createAudioElementStub(), createAudioElementStub(), createAudioElementStub()];
    let clipIndex = 0;
    const audio = createRuntimeAudio({
      state,
      globalWindow: {},
      createAudioElement: () => clips[clipIndex++],
      storageKeys: { audioEnabled: "audio" },
      saveAudioEnabled: vi.fn(),
      musicTrackSources: ["/music.mp3"],
      gruntSources: ["/grunt.wav"],
      cardSources: ["/card.wav"],
      isExternalModeRendering: () => true,
      addLog: vi.fn(),
      setAnnouncement: vi.fn(),
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      lerpFn: (a, b, t) => a + (b - a) * t,
    });

    audio.playCardSfx();
    audio.playCardSfx();

    expect(clips[0].play).toHaveBeenCalledTimes(1);
    expect(clips[1].play).toHaveBeenCalledTimes(1);
    expect(clips[0].volume).toBe(0.62);
    expect(clips[1].volume).toBe(0.62);
    expect(state.audio.cardNextIndex).toBe(2);

    await Promise.resolve();
  });

  it("unlockAudio creates graph, resumes context, and primes music playback", async () => {
    const masterSetTarget = vi.fn();
    const context = {
      state: "suspended",
      currentTime: 1,
      destination: {},
      createGain: () => ({
        gain: {
          value: 0,
          setTargetAtTime: masterSetTarget,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }),
      createOscillator: () => ({
        type: "",
        frequency: { setValueAtTime: vi.fn() },
        detune: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      resume: vi.fn(() => {
        context.state = "running";
        return Promise.resolve();
      }),
    };
    const AudioContextCtor = vi.fn(() => context);
    const track = createAudioElementStub({ paused: true });
    const state = createBaseState();
    state.audio.enabled = true;
    const audio = createRuntimeAudio({
      state,
      globalWindow: { AudioContext: AudioContextCtor },
      createAudioElement: () => track,
      storageKeys: { audioEnabled: "audio" },
      saveAudioEnabled: vi.fn(),
      musicTrackSources: ["/music.mp3"],
      gruntSources: ["/grunt.wav"],
      cardSources: ["/card.wav"],
      isExternalModeRendering: () => true,
      addLog: vi.fn(),
      setAnnouncement: vi.fn(),
      clampNumber: (value, min, max, fallback) => {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          return fallback;
        }
        return Math.max(min, Math.min(max, n));
      },
      lerpFn: (a, b, t) => a + (b - a) * t,
    });

    audio.unlockAudio();
    await Promise.resolve();
    await Promise.resolve();

    expect(AudioContextCtor).toHaveBeenCalledTimes(1);
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(state.audio.started).toBe(true);
    expect(state.audio.primed).toBe(true);
    expect(track.play).toHaveBeenCalledTimes(1);
    expect(masterSetTarget).toHaveBeenCalled();
  });
});
