import { describe, expect, it } from "vitest";
import { cameraPoseFor } from "./camera.ts";
import { createInitialState, step, type Direction } from "./logic.ts";

describe("カメラの左右追従", () => {
  it("カメラ本体と注視点の x は常に蟹の x と一致する", () => {
    const pose = cameraPoseFor(1.25, 0);
    expect(pose.position[0]).toBe(1.25);
    expect(pose.lookAt[0]).toBe(1.25);
  });

  it("移動して止まっても、カメラは移動方向に行き過ぎない", () => {
    let state = { ...createInitialState(), crabX: 0 };
    const inputs: Direction[] = [...Array<Direction>(30).fill(1), ...Array<Direction>(30).fill(0)];
    const xs: number[] = [];
    for (const dir of inputs) {
      state = step(state, 1 / 60, dir, () => 0.99);
      state = { ...state, cars: [] };
      xs.push(cameraPoseFor(state.crabX, 0).position[0]);
    }
    const stoppedX = state.crabX;
    // 単調非減少で、最終位置を超えない
    expect(Math.max(...xs)).toBe(stoppedX);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(xs.slice(30).every((x) => x === stoppedX)).toBe(true);
  });
});
