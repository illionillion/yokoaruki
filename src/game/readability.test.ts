import { describe, expect, it } from "vitest";
import { CRAB, VEHICLES } from "./constants.ts";
import { findHit, step, type Car, type GameState } from "./logic.ts";
import { TRACKS, timeToReach, wheelTracks } from "./readability.ts";
import { DT, play, seeded, waitForGap } from "./testing/sim.ts";
import { createInitialState } from "./logic.ts";

const car = (z: number, direction: 1 | -1, x = 0, speed = 10): Car => ({
  id: 1,
  lane: 0,
  kind: "car",
  x,
  z,
  speed,
  direction,
});
const hwb = VEHICLES.car.halfWheelbase;

describe("蟹の列に来るまでの秒数", () => {
  it("奥から来る車は前の車軸までの距離 / 速さ", () => {
    expect(timeToReach(car(-20, 1))).toBeCloseTo((20 - hwb) / 10);
  });

  it("後ろ（カメラ側）から来る奥向きの車も同じように測る", () => {
    expect(timeToReach(car(12, -1))).toBeCloseTo((12 - hwb) / 10);
  });

  it("車輪が蟹の列に重なっている間は 0、通り過ぎたら null", () => {
    expect(timeToReach(car(-hwb, 1))).toBe(0);
    expect(timeToReach(car(10, 1))).toBeNull();
    expect(timeToReach(car(-10, -1))).toBeNull();
  });

  it("秒数どおりに進めると、その車輪の列にいた蟹はちょうど轢かれる", () => {
    const c = car(-15, 1, 0);
    const eta = timeToReach(c) ?? 0;
    const tireX = VEHICLES.car.halfTrack;
    const before = { ...c, z: c.z + c.speed * (eta - 0.1) };
    const at = { ...c, z: c.z + c.speed * eta };
    expect(findHit(tireX, [before])).toBeNull();
    expect(findHit(tireX, [at])).not.toBeNull();
  });
});

describe("轍の予告", () => {
  it("近づく車だけ、左右の車輪の列に 1 本ずつ出る", () => {
    const tracks = wheelTracks([car(-15, 1, 2), car(-60, 1, -2), car(10, 1)]);
    expect(tracks.map((t) => t.x)).toEqual([
      2 - VEHICLES.car.halfTrack,
      2 + VEHICLES.car.halfTrack,
    ]);
  });

  it("後ろから来る車の轍は、蟹の列を越えて前（奥）まで伸びる", () => {
    const [t] = wheelTracks([car(8, -1)]);
    expect(t.zFrom).toBeCloseTo(8 - hwb);
    expect(t.zTo).toBe(CRAB.z - TRACKS.extend);
  });

  it("近いほど urgency が上がり、danger 秒以内で危険になる", () => {
    const far = wheelTracks([car(-20, 1)])[0];
    const near = wheelTracks([car(-hwb - 5, 1)])[0];
    expect(near.urgency).toBeGreaterThan(far.urgency);
    expect(far.danger).toBe(false);
    expect(near.danger).toBe(true);
  });
});

describe("難しさは変わらない", () => {
  it("轍の計算は状態を変えず、隙間待ちのクリア数は以前と同じ", () => {
    const s: GameState = createInitialState(seeded(5));
    const copy = structuredClone(s);
    wheelTracks(s.cars);
    expect(s).toEqual(copy);
    expect(step(s, DT, 0, seeded(1))).toEqual(step(copy, DT, 0, seeded(1)));
    let cleared = 0;
    for (let seed = 1; seed <= 20; seed++)
      if (play(seed, waitForGap()).phase === "cleared") cleared++;
    expect(cleared).toBe(GAP_BOT_CLEARS_1_TO_20);
  }, 60_000);
});

/** 変更前（05497a7）に測った、シード 1〜20 で隙間待ちがクリアした数 */
const GAP_BOT_CLEARS_1_TO_20 = 14;
