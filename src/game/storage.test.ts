import { beforeEach, describe, expect, it } from "vitest";
import { MAX_CORPSES, STORAGE_KEY } from "./constants.ts";
import { addCorpse, clearCorpses, corpsesAfterReset, loadCorpses } from "./storage.ts";

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

  it("上限は 50 体で、読み込み時に古いものを捨てて保存し直す", () => {
    expect(MAX_CORPSES).toBe(50);
    const stored: unknown[] = Array.from({ length: 80 }, (_, i) => ({ x: i, z: 1, y: 9 }));
    stored.splice(10, 0, { x: "bad" }, null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const loaded = loadCorpses();
    expect(loaded).toHaveLength(MAX_CORPSES);
    expect(loaded[0]).toEqual({ x: 30, z: 1 });
    expect(loaded.at(-1)).toEqual({ x: 79, z: 1 });
    expect(loaded.every((c) => Object.keys(c).length === 2)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(loaded));
  });

  it("壊れた保存データは空にして書き戻す", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadCorpses()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });

  it("正しいデータはそのまま残す", () => {
    const raw = JSON.stringify([
      { x: 1, z: 2 },
      { x: -3, z: 0 },
    ]);
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadCorpses()).toEqual([
      { x: 1, z: 2 },
      { x: -3, z: 0 },
    ]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it("リセットは OK のときだけ消し、キャンセルでは残す", () => {
    const current = [
      { x: 1, z: 0 },
      { x: 2, z: 3 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    expect(corpsesAfterReset(current, "cancel")).toEqual(current);
    expect(loadCorpses()).toEqual(current);
    expect(corpsesAfterReset(current, "ok")).toEqual([]);
    expect(loadCorpses()).toEqual([]);
  });
});
