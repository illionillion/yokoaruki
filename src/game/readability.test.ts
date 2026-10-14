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

describe("出す車輪の列を絞る", () => {
  const ht = VEHICLES.car.halfTrack;
  const soon = (dist: number) => -(hwb + dist); // 奥から来て dist 進むと前の車軸が蟹の列に来る

  it("1 秒以内に来る車だけ出す", () => {
    expect(wheelTracks([car(soon(5), 1, 0.5)], 0)).toHaveLength(2);
    expect(wheelTracks([car(soon(15), 1, 0.5)], 0)).toHaveLength(0);
  });

  it("蟹から遠い車輪の列は出さない", () => {
    expect(wheelTracks([car(soon(5), 1, 8)], 0)).toHaveLength(0);
  });

  it("蟹の左右それぞれで、一番早く来る車の列だけ出す", () => {
    const first = { ...car(soon(3), 1, -2), id: 1 };
    const later = { ...car(soon(8), 1, -2.5), id: 2 };
    const right = { ...car(soon(6), 1, 2), id: 3 };
    const tracks = wheelTracks([later, first, right], 0);
    expect(tracks.map((t) => t.carId).sort()).toEqual([1, 1, 3, 3]);
    expect(tracks.filter((t) => t.carId === 1).map((t) => t.x)).toEqual([-2 - ht, -2 + ht]);
  });

  it("蟹をまたぐ車は左右 1 本ずつ出る", () => {
    const tracks = wheelTracks([car(soon(4), 1, 0)], 0);
    expect(tracks.map((t) => t.x).sort((a, b) => a - b)).toEqual([-ht, ht]);
  });

  it("線は蟹の列のまわりの短い区間。後ろから来る車は前にも伸びる", () => {
    const [fromFar] = wheelTracks([car(soon(4), 1, 0)], 0);
    expect(Math.min(fromFar.zFrom, fromFar.zTo)).toBe(CRAB.z - TRACKS.near);
    expect(Math.max(fromFar.zFrom, fromFar.zTo)).toBeLessThan(CRAB.z + 1);
    const [fromBehind] = wheelTracks([car(hwb + 4, -1, 0)], 0);
    expect(Math.max(fromBehind.zFrom, fromBehind.zTo)).toBe(CRAB.z + TRACKS.near);
    expect(Math.min(fromBehind.zFrom, fromBehind.zTo)).toBe(CRAB.z - TRACKS.extend);
  });
});

describe("難しさは変わらない", () => {
  it("轍の計算は状態を変えず、隙間待ちのクリア数は以前と同じ", () => {
    const s: GameState = createInitialState(seeded(5));
    const copy = structuredClone(s);
    wheelTracks(s.cars, s.crabX);
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
