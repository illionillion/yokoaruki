import { describe, expect, it } from "vitest";
import { CAMERA_PRESETS, cameraIndexFromSearch, nextCameraIndex } from "./camera.ts";

describe("カメラプリセット", () => {
  it("?cam= で選べて、不明な値は標準になる", () => {
    expect(CAMERA_PRESETS[cameraIndexFromSearch("?cam=high")].id).toBe("high");
    expect(cameraIndexFromSearch("?cam=nope")).toBe(0);
    expect(cameraIndexFromSearch("")).toBe(0);
  });

  it("順番に切り替わって先頭に戻る", () => {
    expect(nextCameraIndex(CAMERA_PRESETS.length - 1)).toBe(0);
  });
});
