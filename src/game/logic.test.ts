import { describe, expect, it } from "vitest";
import { CAR, CRAB, ROAD } from "./constants.ts";
import {
  clampCrabX,
  createInitialState,
  findHit,
  getTires,
  hitsTire,
  step,
  type Car,
} from "./logic.ts";

const carAt = (x: number, z: number): Car => ({ id: 1, x, z, speed: CAR.speed });

describe("タイヤとの当たり判定", () => {
  it("タイヤの真上にいると当たる", () => {
    const tire = getTires(carAt(0, 0))[0];
    expect(hitsTire(tire.x, tire.z, tire)).toBe(true);
  });

  it("車体の真下（左右タイヤの間）はくぐれる", () => {
    expect(findHit(0, [carAt(0, CRAB.z)])).toBeNull();
  });

  it("前後タイヤの間もくぐれる", () => {
    expect(findHit(CAR.halfTrack, [carAt(0, CRAB.z)])).toBeNull();
  });

  it("車の外側では当たらない", () => {
    expect(findHit(3, [carAt(0, CRAB.z + CAR.halfWheelbase)])).toBeNull();
  });

  it("後輪の位置に重なると当たる", () => {
    expect(findHit(-CAR.halfTrack, [carAt(0, CRAB.z - CAR.halfWheelbase)])).not.toBeNull();
  });
});

describe("step", () => {
  it("左右入力で蟹が動き、道路外には出ない", () => {
    const s = step(createInitialState(), 0.1, 1, () => 0.5);
    expect(s.crabX).toBeCloseTo(CRAB.speed * 0.1);
    expect(clampCrabX(100)).toBe(ROAD.width / 2 - CRAB.halfWidth);
  });

  it("タイヤが来たらゲームオーバーになり、当たった位置を記録する", () => {
    const tireX = CAR.halfTrack;
    const state = {
      ...createInitialState(),
      crabX: tireX,
      cars: [carAt(0, -CAR.halfWheelbase - 0.5)],
    };
    const s = step(state, 0.05, 0, () => 0.5);
    expect(s.phase).toBe("gameover");
    expect(s.hitAt).toEqual({ x: tireX, z: CRAB.z });
    expect(step(s, 1, 1)).toBe(s);
  });

  it("時間経過で車が湧く", () => {
    const s = step(createInitialState(), 1, 0, () => 0.5);
    expect(s.cars).toHaveLength(1);
    expect(s.cars[0].z).toBe(ROAD.spawnZ);
  });
});
