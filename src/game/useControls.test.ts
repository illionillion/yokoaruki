import { describe, expect, it } from "vitest";
import type { Direction } from "./logic.ts";
import { pointerDirection } from "./useControls.ts";

describe("マルチタッチの方向", () => {
  it("最後に押した指の方向を使い、離したら残りの指に戻る", () => {
    const active = new Map<number, Direction>([[1, -1]]);
    active.set(2, 1);
    expect(pointerDirection(active)).toBe(1);
    active.delete(2);
    expect(pointerDirection(active)).toBe(-1);
    active.delete(1);
    expect(pointerDirection(active)).toBe(0);
  });
});
