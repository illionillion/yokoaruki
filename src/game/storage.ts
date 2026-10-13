import { MAX_CORPSES, STORAGE_KEY } from "./constants.ts";
import type { Corpse } from "./logic.ts";

function isCorpse(value: unknown): value is Corpse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === "number" &&
    typeof v.z === "number" &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.z)
  );
}

/** 保存済みの亡骸を読む。壊れたデータは無視する */
export function loadCorpses(storage: Storage | undefined = globalThis.localStorage): Corpse[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCorpse);
  } catch {
    return [];
  }
}

/** 亡骸を 1 つ追加して保存し、新しい一覧を返す。古いものから捨てる */
export function addCorpse(
  corpse: Corpse,
  storage: Storage | undefined = globalThis.localStorage
): Corpse[] {
  const next = [...loadCorpses(storage), corpse].slice(-MAX_CORPSES);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても遊べるようにする
  }
  return next;
}

export function clearCorpses(storage: Storage | undefined = globalThis.localStorage): void {
  storage?.removeItem(STORAGE_KEY);
}
