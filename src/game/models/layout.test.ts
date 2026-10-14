import { describe, expect, it } from "vitest";
import { cameraPoseFor } from "../camera.ts";
import { CRAB, VEHICLES } from "../constants.ts";
import { findHit } from "../logic.ts";
import { blocksCamera, chassisBeams } from "./layout.ts";

const cam = cameraPoseFor(0, CRAB.z).position;

describe("カメラと車体", () => {
  it("普通の車・速い車がカメラの位置を通るときは重なる（隠す）", () => {
    expect(blocksCamera({ kind: "car", x: 0, z: cam[2] }, cam)).toBe(true);
    expect(blocksCamera({ kind: "fast", x: 0.5, z: cam[2] + 1 }, cam)).toBe(true);
  });

  it("離れた車・隣の車線の車は隠さない", () => {
    expect(blocksCamera({ kind: "car", x: 0, z: -10 }, cam)).toBe(false);
    expect(blocksCamera({ kind: "car", x: 4, z: cam[2] }, cam)).toBe(false);
  });

  it("トラックは車体の底がカメラより高いので隠さない（下をくぐる様子が見える）", () => {
    expect(blocksCamera({ kind: "truck", x: 0, z: cam[2] }, cam)).toBe(false);
  });
});

describe("トラックの車台", () => {
  const truck = VEHICLES.truck;
  const beams = chassisBeams(truck);

  it("はりは車輪の列の上にあり、タイヤに食い込み、荷台の底まで届く", () => {
    expect(beams).toHaveLength(2);
    for (const b of beams) {
      const bottom = b.center[1] - b.size[1] / 2;
      const top = b.center[1] + b.size[1] / 2;
      expect(bottom).toBeLessThan(truck.tireRadius * 2);
      expect(top).toBeCloseTo(truck.bodyBottom);
      expect(Math.abs(b.center[0])).toBeCloseTo(truck.halfTrack);
    }
  });

  it("左右のはりの間は蟹が通れる幅と高さがあり、当たり判定も変わらない", () => {
    const innerGap = 2 * (truck.halfTrack - beams[0].size[0] / 2);
    expect(innerGap).toBeGreaterThan(CRAB.halfWidth * 4);
    const lowest = Math.min(...beams.map((b) => b.center[1] - b.size[1] / 2));
    expect(lowest).toBeGreaterThan(CRAB.height);
    expect(
      findHit(0, [{ id: 1, lane: 0, kind: "truck", x: 0, z: CRAB.z, speed: 5, direction: 1 }])
    ).toBeNull();
  });
});
