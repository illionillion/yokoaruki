import { describe, expect, it } from "vitest";
import { followCameraX } from "./camera.ts";

describe("カメラの左右追従", () => {
  it("蟹の方向へ近づくが、通り越さない", () => {
    const x = followCameraX(0, 2, 1 / 60);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(2);
  });

  it("時間が経てば蟹の真後ろに追いつく", () => {
    let x = 0;
    for (let i = 0; i < 120; i++) x = followCameraX(x, -3, 1 / 60);
    expect(x).toBeCloseTo(-3, 3);
  });

  it("dt が 0 なら動かない", () => {
    expect(followCameraX(1, 3, 0)).toBe(1);
  });
});
