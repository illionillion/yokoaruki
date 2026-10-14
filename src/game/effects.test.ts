import { describe, expect, it } from "vitest";
import { CRAB } from "./constants.ts";
import {
  CORPSE_THICKNESS,
  EFFECTS,
  makeParticles,
  particleAt,
  shakeOffset,
  squashScale,
  stackCorpses,
  timeScale,
} from "./effects.ts";
import { seeded } from "./testing/sim.ts";

describe("スローモーション", () => {
  it("直後はスロー、しばらくすると等速に戻る", () => {
    expect(timeScale(0)).toBe(EFFECTS.slowMo);
    expect(timeScale(EFFECTS.slowMoSeconds - 0.01)).toBe(EFFECTS.slowMo);
    expect(timeScale(EFFECTS.slowMoSeconds + EFFECTS.slowMoRecover / 2)).toBeGreaterThan(
      EFFECTS.slowMo
    );
    expect(timeScale(10)).toBe(1);
  });
});

describe("画面の揺れ", () => {
  it("最初は大きく揺れ、時間とともに収まって 0 になる", () => {
    const amp = (t: number) => Math.hypot(...shakeOffset(t));
    const early = Math.max(...[0.01, 0.02, 0.03, 0.04].map(amp));
    const late = Math.max(...[1.2, 1.21, 1.22, 1.23].map(amp));
    expect(early).toBeGreaterThan(0.1);
    expect(late).toBeLessThan(early / 10);
    expect(shakeOffset(EFFECTS.shakeSeconds)).toEqual([0, 0]);
  });
});

describe("潰れ", () => {
  it("一瞬でぺしゃんこになり、横に広がる", () => {
    expect(squashScale(0)).toEqual([1, 1]);
    const [spread, height] = squashScale(EFFECTS.squashSeconds);
    expect(height).toBeCloseTo(0.12);
    expect(spread).toBeGreaterThan(1.5);
    expect(squashScale(5)[0]).toBeCloseTo(1.5);
  });
});

describe("カニ汁の粒", () => {
  it("同じシードなら同じ飛び散り方", () => {
    expect(makeParticles(seeded(1))).toEqual(makeParticles(seeded(1)));
    expect(makeParticles(seeded(1))).not.toEqual(makeParticles(seeded(2)));
    expect(makeParticles(seeded(1))).toHaveLength(EFFECTS.particles);
  });

  it("上に飛んでから地面に落ちて止まる", () => {
    for (const p of makeParticles(seeded(3))) {
      expect(particleAt(p, 0.1)[1]).toBeGreaterThan(CRAB.height / 2);
      const landed = particleAt(p, 10);
      expect(landed[1]).toBeCloseTo(CRAB.height / 2);
      expect(particleAt(p, 20)).toEqual(landed);
    }
  });
});

describe("亡骸の山", () => {
  it("同じ場所の亡骸は上に積み重なる", () => {
    const stacked = stackCorpses([
      { x: 0, z: 0 },
      { x: 0.1, z: 0 },
      { x: 5, z: 0 },
      { x: 0, z: 0.05 },
    ]);
    expect(stacked.map((s) => s.level)).toEqual([0, 1, 0, 2]);
    expect(stacked[3].y).toBeCloseTo(2 * CORPSE_THICKNESS);
  });

  it("回転は順番で決まり、毎回同じ", () => {
    const a = stackCorpses([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ]);
    const b = stackCorpses([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
    ]);
    expect(a).toEqual(b);
    expect(a[0].rotation).not.toBe(a[1].rotation);
  });
});
