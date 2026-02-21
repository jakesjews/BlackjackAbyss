import { describe, expect, it } from "vitest";
import {
  CARD_SOURCES,
  GRUNT_SOURCES,
  MUSIC_TRACK_SOURCES,
  createAmbientOrbs,
  createMenuMotes,
  createRuntimeVisualSeeds,
} from "../core/runtime-content-seeds.js";

describe("runtime content seeds", () => {
  it("exports expected audio source lists", () => {
    expect(GRUNT_SOURCES).toEqual([
      "/audio/soundbites/grunt.wav",
      "/audio/soundbites/grunt.ogg",
    ]);
    expect(CARD_SOURCES).toEqual(["/audio/soundbites/card.wav"]);
    expect(MUSIC_TRACK_SOURCES).toEqual(["/audio/music/blackjack.mp3"]);
  });

  it("creates ambient orbs with deterministic values", () => {
    const ambientOrbs = createAmbientOrbs({
      width: 200,
      height: 100,
      count: 2,
      random: () => 0.5,
    });

    expect(ambientOrbs).toHaveLength(2);
    expect(ambientOrbs[0]).toEqual({
      x: 100,
      y: 50,
      radius: 3.5,
      speed: 9,
      alpha: 0.10500000000000001,
    });
  });

  it("creates menu motes with bounded fields", () => {
    const menuMotes = createMenuMotes({
      width: 400,
      height: 300,
      count: 4,
      random: () => 0.999,
    });

    expect(menuMotes).toHaveLength(4);
    for (const mote of menuMotes) {
      expect(mote.x).toBeLessThanOrEqual(400);
      expect(mote.y).toBeLessThanOrEqual(300);
      expect(mote.radius).toBeGreaterThanOrEqual(0.675);
      expect(mote.vx).toBeLessThanOrEqual(24);
      expect(mote.vy).toBeLessThanOrEqual(-34);
      expect(mote.warm).toBe(true);
      expect(mote.shape).toBeGreaterThanOrEqual(0);
      expect(mote.shape).toBeLessThanOrEqual(2);
    }
  });

  it("creates default visual seeds", () => {
    const seeds = createRuntimeVisualSeeds({
      width: 1280,
      height: 720,
      random: () => 0,
    });

    expect(seeds.ambientOrbs).toHaveLength(44);
    expect(seeds.menuMotes).toHaveLength(39);
    expect(seeds.ambientOrbs[0]).toEqual({
      x: 0,
      y: 0,
      radius: 1.2,
      speed: 3,
      alpha: 0.05,
    });
    expect(seeds.menuMotes[0]).toEqual({
      x: 0,
      y: 0,
      radius: 0.675,
      vx: -24,
      vy: -34,
      alpha: 0.2,
      twinkle: 1.1,
      phase: 0,
      warm: true,
      heat: 0,
      drift: 0.8,
      swirl: 0.6,
      speedScale: 0.7,
      spin: -2.4,
      shape: 0,
    });
  });
});
