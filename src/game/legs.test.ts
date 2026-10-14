import { describe, expect, it } from "vitest";
import { CRAB } from "./constants.ts";
import {
  SCATTER,
  WALK,
  corpseScatterSeed,
  scatteredLegAt,
  scatterTargets,
  walkLegPose,
  walkOpenAmount,
} from "./legs.ts";
import { seeded } from "./testing/sim.ts";

describe("歩行の脚", () => {
  it("止まっているときは閉じたまま動かない", () => {
    const a = walkLegPose(0, -1, 0, false);
    const b = walkLegPose(3.5, -1, 0, false);
    expect(a).toEqual(b);
    expect(a.spread).toBe(0);
  });

  it("歩いていると横に開いて、1 周期でもとに戻る", () => {
    const side = -1 as const;
    const index = 0;
    const closed = walkLegPose(0, side, index, true);
    const open = walkLegPose(WALK.period / 2, side, index, true);
    const again = walkLegPose(WALK.period, side, index, true);
    expect(closed.spread).toBeCloseTo(0);
    expect(open.spread).toBeCloseTo(WALK.spread);
    expect(Math.abs(open.x)).toBeGreaterThan(Math.abs(closed.x));
    expect(Math.sign(open.x)).toBe(side);
    expect(open.z).toBeCloseTo(closed.z);
    expect(again.spread).toBeCloseTo(closed.spread);
    expect(again.x).toBeCloseTo(closed.x);
  });

  it("隣の脚と左右は半周期ずれて、開いているとき閉じている脚がある", () => {
    expect(walkOpenAmount(0, -1, 0)).toBeCloseTo(0);
    expect(walkOpenAmount(0, -1, 1)).toBeCloseTo(1);
    expect(walkOpenAmount(0, 1, 0)).toBeCloseTo(1);
    const left = walkLegPose(0, -1, 0, true);
    const right = walkLegPose(0, 1, 0, true);
    expect(left.spread).toBeLessThan(right.spread);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(0);
  });
});

describe("潰れの脚", () => {
  it("同じシードなら同じ散らばり方", () => {
    expect(scatterTargets(seeded(4))).toEqual(scatterTargets(seeded(4)));
    expect(scatterTargets(seeded(4))).not.toEqual(scatterTargets(seeded(5)));
  });

  it("何本かは体に残り、何本かは離れる", () => {
    const legs = scatterTargets(seeded(4));
    const body = CRAB.halfWidth * 2;
    const attached = legs.filter((leg) => leg.attached);
    const flying = legs.filter((leg) => !leg.attached);
    expect(attached.length).toBeGreaterThan(0);
    expect(flying.length).toBeGreaterThan(0);
    for (const leg of attached) expect(Math.hypot(leg.x, leg.z)).toBeLessThan(body);
    for (const leg of flying) expect(Math.hypot(leg.x, leg.z)).toBeGreaterThan(body);
  });

  it("残った脚は体のそばで動かない", () => {
    const attached = scatterTargets(seeded(4)).filter((leg) => leg.attached);
    expect(attached.length).toBeGreaterThan(0);
    for (const leg of attached) {
      const start = scatteredLegAt(leg, 0);
      const mid = scatteredLegAt(leg, SCATTER.seconds / 2);
      const end = scatteredLegAt(leg, SCATTER.seconds);
      expect(start).toEqual(end);
      expect(mid).toEqual(end);
      expect(end.y).toBeLessThan(0.08);
    }
  });

  it("飛んだ脚は体のそばから地面へ落ちて止まる", () => {
    const flying = scatterTargets(seeded(4)).filter((leg) => !leg.attached);
    expect(flying.length).toBeGreaterThan(0);
    for (const leg of flying) {
      const start = scatteredLegAt(leg, 0);
      const mid = scatteredLegAt(leg, SCATTER.seconds / 2);
      const end = scatteredLegAt(leg, SCATTER.seconds);
      const later = scatteredLegAt(leg, 10);
      expect(Math.hypot(start.x, start.z)).toBeLessThan(Math.hypot(end.x, end.z));
      expect(mid.y).toBeGreaterThan(end.y + 0.2);
      expect(start.y).toBeCloseTo(SCATTER.groundY);
      expect(end.y).toBeCloseTo(SCATTER.groundY);
      expect(later).toEqual(end);
    }
  });

  it("亡骸の散らばりシードは位置と順番で決まる", () => {
    expect(corpseScatterSeed(0, 1.25, -0.5)).toBe(corpseScatterSeed(0, 1.25, -0.5));
    expect(corpseScatterSeed(0, 1.25, -0.5)).not.toBe(corpseScatterSeed(1, 1.25, -0.5));
  });
});
