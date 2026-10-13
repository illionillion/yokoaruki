import { beforeEach, describe, expect, it } from "vitest";
import { MAX_CORPSES, STORAGE_KEY } from "./constants.ts";
import { addCorpse, clearCorpses, loadCorpses } from "./storage.ts";

describe("亡骸の永続化", () => {
  beforeEach(() => localStorage.clear());

  it("保存した亡骸を次回読み込める", () => {
    addCorpse({ x: 1, z: 0 });
    addCorpse({ x: -2, z: 0 });
    expect(loadCorpses()).toEqual([
      { x: 1, z: 0 },
      { x: -2, z: 0 },
    ]);
  });

  it("壊れたデータは無視する", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadCorpses()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ x: 1, z: 0 }, { x: "a" }, null]));
    expect(loadCorpses()).toEqual([{ x: 1, z: 0 }]);
  });

  it("上限を超えたら古いものから捨てる", () => {
    for (let i = 0; i < MAX_CORPSES + 5; i++) addCorpse({ x: i, z: 0 });
    const corpses = loadCorpses();
    expect(corpses).toHaveLength(MAX_CORPSES);
    expect(corpses[0].x).toBe(5);
  });

  it("消去できる", () => {
    addCorpse({ x: 1, z: 0 });
    clearCorpses();
    expect(loadCorpses()).toEqual([]);
  });
});
